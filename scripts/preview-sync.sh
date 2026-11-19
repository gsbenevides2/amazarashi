#!/usr/bin/env bash

set -euo pipefail

# =========================
# Sincroniza previews de PR no servidor (modelo "pull": nada precisa entrar pela rede)
#
# Lê as tags `pr-<n>` publicadas em ghcr.io pelo workflow `pr-preview.yml`,
# sobe um container por PR aberta com router próprio no Traefik e remove o
# preview quando a PR fecha. Roda por cron (a cada 2 minutos).
#
# Configuração: ~/Docker/Previews/preview.env (mesmas variáveis abaixo).
# Instalação:
#   install -m 755 scripts/preview-sync.sh ~/Docker/Previews/preview-sync.sh
#   (crontab) */2 * * * * ~/Docker/Previews/preview-sync.sh >> ~/Docker/Previews/sync.log 2>&1
# =========================

CONF="${PREVIEW_CONF:-$HOME/Docker/Previews/preview.env}"
# shellcheck disable=SC1090
[ -f "${CONF}" ] && . "${CONF}"

REPO_SLUG="${PREVIEW_REPO:-gsbenevides2/amazarashi}"
DOMAIN="${PREVIEW_DOMAIN:-infra.gui.dev.br}"
BASE_ENV="${PREVIEW_BASE_ENV:-$HOME/Docker/Projetos/amazarashi/.env}"
TRAEFIK_DIR="${PREVIEW_TRAEFIK_DIR:-$HOME/Docker/Projetos/traefik/proxy/dynamic}"
ROOT="${PREVIEW_ROOT:-$HOME/Docker/Previews/amazarashi}"
MAX_PREVIEWS="${PREVIEW_MAX:-3}"
MIN_FREE_GB="${PREVIEW_MIN_FREE_GB:-1}"
DATABASE_URL="${PREVIEW_DATABASE_URL:?PREVIEW_DATABASE_URL não configurada (papel somente-leitura)}"

IMAGE_REPO="ghcr.io/${REPO_SLUG}"
mkdir -p "${ROOT}"

log() { printf '%s %s\n' "$(date '+%F %T')" "$*"; }

# Uma execução por vez: o cron não deve empilhar syncs.
exec 9> "${ROOT}/.lock"
flock -n 9 || exit 0

free_gb() { df -BG --output=avail / | tail -1 | tr -dc '0-9'; }

ghcr_token() {
  curl -fsS -m 20 "https://ghcr.io/token?scope=repository:${REPO_SLUG}:pull&service=ghcr.io" | jq -r '.token // empty'
}

ghcr_tags() { # $1 = token; segue a paginação do registry (tags antigas empurram as pr-* para a 2ª página)
  local auth="$1" url="https://ghcr.io/v2/${REPO_SLUG}/tags/list?n=100" hdr body next
  hdr="$(mktemp)"
  while :; do
    body="$(curl -fsS -m 20 -D "${hdr}" -H "Authorization: Bearer ${auth}" "${url}")" || break
    printf '%s' "${body}" | jq -r '(.tags // [])[] | select(test("^pr-[0-9]+$"))'
    next="$(tr -d '\r' < "${hdr}" | sed -n 's/.*<\([^>]*\)>; *rel="next".*/\1/p' | head -1)"
    case "${next}" in
      http*) url="${next}" ;;
      /*) url="https://ghcr.io${next}" ;;
      *) break ;;
    esac
  done
  rm -f "${hdr}"
}

ghcr_digest() {
  curl -fsSI -m 20 -H "Authorization: Bearer $2" \
    -H "Accept: application/vnd.oci.image.index.v1+json,application/vnd.docker.distribution.manifest.list.v2+json,application/vnd.oci.image.manifest.v1+json,application/vnd.docker.distribution.manifest.v2+json" \
    "https://ghcr.io/v2/${REPO_SLUG}/manifests/$1" \
    | tr -d '\r' | awk -F': ' 'tolower($1) == "docker-content-digest" { print $2 }'
}

write_compose() { # $1 = número da PR
  local n="$1" dir="${ROOT}/pr-$1"
  cat > "${dir}/docker-compose.yaml" <<COMPOSE
services:
    app:
        image: '${IMAGE_REPO}:pr-${n}'
        container_name: amazarashi-pr-${n}
        networks:
            nova:
                aliases:
                    - amazarashi-pr-${n}.local
        mem_limit: '1024m'
        memswap_limit: '1024m'
        restart: unless-stopped
        env_file:
            - .env
        environment:
            NODE_OPTIONS: '--max-old-space-size=640'
            PORT: '3000'
            HOST: '0.0.0.0'
        labels:
            - "com.centurylinklabs.watchtower.enable=false"
networks:
    nova:
        external: true
        name: nova
        attachable: true
COMPOSE
}

write_env() { # $1 = número da PR
  local n="$1" dir="${ROOT}/pr-$1" host="amazarashi-pr-$1.${DOMAIN}"
  grep -vE '^(DATABASE_URL|SITE_URL|SESSION_SECRET|OTEL_SERVICE_NAME|ADMIN_AUTH_DISABLED|PORT|HOST)=' "${BASE_ENV}" > "${dir}/.env"
  {
    echo "DATABASE_URL=${DATABASE_URL}"
    echo "SITE_URL=https://${host}"
    echo "SESSION_SECRET=$(head -c 32 /dev/urandom | base64 | tr -d '=+/' | cut -c1-48)"
    echo "ADMIN_AUTH_DISABLED=false"
    echo "OTEL_SERVICE_NAME=amazarashi-pr-${n}"
  } >> "${dir}/.env"
  chmod 600 "${dir}/.env"
}

write_route() { # $1 = número da PR
  local n="$1" host="amazarashi-pr-$1.${DOMAIN}"
  cat > "${TRAEFIK_DIR}/preview-amazarashi-pr-${n}.yaml" <<ROUTE
http:
  routers:
    amazarashi-pr-${n}-https:
      rule: 'Host(\`${host}\`)'
      service: amazarashi-pr-${n}-service
      entryPoints: https
      tls:
        certResolver: letsencrypt
  services:
    amazarashi-pr-${n}-service:
      loadBalancer:
        servers:
          - url: 'http://amazarashi-pr-${n}.local:3000'
ROUTE
}

remove_preview() { # $1 = número da PR
  local n="$1"
  log "pr-${n}: removendo preview"
  rm -f "${TRAEFIK_DIR}/preview-amazarashi-pr-${n}.yaml"
  if [ -f "${ROOT}/pr-${n}/docker-compose.yaml" ]; then
    docker compose --project-directory "${ROOT}/pr-${n}" down -v --remove-orphans > /dev/null 2>&1 || true
  fi
  docker rm -f "amazarashi-pr-${n}" > /dev/null 2>&1 || true
  docker rmi "${IMAGE_REPO}:pr-${n}" > /dev/null 2>&1 || true
  rm -rf "${ROOT}/pr-${n}"
  docker image prune -f > /dev/null 2>&1 || true
}

deploy_preview() { # $1 = número da PR, $2 = token do GHCR
  local n="$1" token="$2" dir="${ROOT}/pr-$1" host="amazarashi-pr-$1.${DOMAIN}"
  local container="amazarashi-pr-${n}" digest

  digest="$(ghcr_digest "pr-${n}" "${token}")"
  if [ -z "${digest}" ]; then
    log "pr-${n}: digest não encontrado, pulando"
    return 0
  fi

  # Só considera pronto quando imagem, container e router estão no lugar: um deploy
  # que morreu no meio precisa ser refeito no ciclo seguinte, não ignorado.
  if [ "$(cat "${dir}/digest" 2>/dev/null || true)" = "${digest}" ] \
    && [ -f "${TRAEFIK_DIR}/preview-amazarashi-pr-${n}.yaml" ] \
    && docker inspect -f '{{.State.Running}}' "${container}" 2>/dev/null | grep -qx true; then
    return 0
  fi

  if [ "$(free_gb)" -lt "${MIN_FREE_GB}" ]; then
    log "pr-${n}: só $(free_gb)GB livres (< ${MIN_FREE_GB}GB), pull adiado"
    return 0
  fi

  log "pr-${n}: publicando ${IMAGE_REPO}:pr-${n} (${digest:7:12})"
  mkdir -p "${dir}"
  chmod 700 "${dir}"
  write_compose "${n}"
  write_env "${n}"

  if ! docker pull -q "${IMAGE_REPO}:pr-${n}" > /dev/null; then
    log "pr-${n}: falha no pull"
    return 0
  fi

  docker compose --project-directory "${dir}" up -d --remove-orphans > /dev/null
  printf '%s' "${digest}" > "${dir}/digest"

  local ip ok=""
  ip="$(docker inspect -f '{{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' "${container}")"
  for _ in $(seq 1 45); do
    if curl -fsS -m 5 -o /dev/null "http://${ip}:3000/"; then ok=1; break; fi
    sleep 2
  done
  if [ -z "${ok}" ]; then
    log "pr-${n}: app não respondeu; logs:"
    docker logs --tail 30 "${container}" 2>&1 | sed 's/^/    /' || true
    return 0
  fi

  write_route "${n}"
  for _ in $(seq 1 15); do
    if [ "$(curl -sk -m 5 -o /dev/null -w '%{http_code}' -H "Host: ${host}" https://127.0.0.1/ || true)" = "200" ]; then
      log "pr-${n}: https://${host} no ar"
      docker image prune -f > /dev/null 2>&1 || true
      return 0
    fi
    sleep 2
  done
  log "pr-${n}: Traefik ainda não roteou https://${host}"
}

log "sync: $(free_gb)GB livres em /"

# ---- PRs abertas (uma chamada por execução; a API anônima tem limite de 60/h) ----
if ! OPEN_PRS="$(curl -fsS -m 20 -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/${REPO_SLUG}/pulls?state=open&per_page=100" | jq -r '.[].number')"; then
  log "API do GitHub indisponível; nada será removido neste ciclo"
  OPEN_PRS="__desconhecido__"
fi

TOKEN="$(ghcr_token || true)"
if [ -z "${TOKEN}" ]; then
  log "sem token do GHCR; nada a fazer"
  exit 0
fi

# ---- remove previews de PRs fechadas ----
if [ "${OPEN_PRS}" != "__desconhecido__" ]; then
  for dir in "${ROOT}"/pr-*; do
    [ -d "${dir}" ] || continue
    n="${dir##*/pr-}"
    printf '%s\n' "${OPEN_PRS}" | grep -qx "${n}" || remove_preview "${n}"
  done
fi

# ---- publica/atualiza os previews das PRs abertas com imagem publicada ----
TAGS="$(ghcr_tags "${TOKEN}" || true)"
[ -n "${TAGS}" ] || exit 0

COUNT="$(find "${ROOT}" -maxdepth 1 -type d -name 'pr-*' | wc -l)"
for tag in ${TAGS}; do
  n="${tag#pr-}"
  printf '%s\n' "${OPEN_PRS}" | grep -qx "${n}" || continue
  if [ ! -d "${ROOT}/pr-${n}" ] && [ "${COUNT}" -ge "${MAX_PREVIEWS}" ]; then
    log "pr-${n}: limite de ${MAX_PREVIEWS} previews atingido"
    continue
  fi
  [ -d "${ROOT}/pr-${n}" ] || COUNT=$((COUNT + 1))
  deploy_preview "${n}" "${TOKEN}"
done
