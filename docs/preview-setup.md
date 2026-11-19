# Recriar o preview de PR do zero

Passo a passo para levantar a infraestrutura de preview num servidor limpo (ou depois de removê-la).
O funcionamento do dia a dia está em [preview.md](preview.md); aqui é só o setup.

## Pré-requisitos

| O que | Por quê |
| --- | --- |
| Docker + plugin `docker compose` | o preview é um container por PR |
| Rede Docker `nova` | os containers dos projetos conversam por alias (`*.local`) |
| Traefik v3 com **file provider** lendo `~/Docker/Projetos/traefik/proxy/dynamic` | é onde o router de cada preview é escrito |
| DNS `*.infra.gui.dev.br` (wildcard) e certificado `*.infra.gui.dev.br` no Traefik | a URL de cada PR já nasce válida, sem criar registro por PR |
| `curl`, `jq`, `flock`, `crontab` no host | usados pelo `preview-sync.sh` |
| Projeto de PRD rodando com `.env` em `~/Docker/Projetos/amazarashi/.env` | o preview herda as variáveis (S3, OTEL etc.) |

Confira:

```bash
docker network inspect nova > /dev/null && echo "rede ok"
curl -sk -o /dev/null -w '%{http_code}\n' -H 'Host: amazarashi.bene.dev.br' https://127.0.0.1/   # 200 = traefik ok
```

## 1. Papel somente-leitura no Postgres

O preview lê o banco de PRD e **não** pode escrever. Crie o papel `amazarashi_preview` uma vez:

```bash
PW="$(openssl rand -hex 14)"

docker exec -i db-postgres psql -U postgres -v ON_ERROR_STOP=1 -d amazarashi <<SQL
DO \$\$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'amazarashi_preview') THEN
    CREATE ROLE amazarashi_preview LOGIN PASSWORD '$PW';
  ELSE
    ALTER ROLE amazarashi_preview LOGIN PASSWORD '$PW';
  END IF;
END
\$\$;
GRANT CONNECT ON DATABASE amazarashi TO amazarashi_preview;
GRANT USAGE ON SCHEMA public TO amazarashi_preview;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO amazarashi_preview;
GRANT SELECT ON ALL SEQUENCES IN SCHEMA public TO amazarashi_preview;
ALTER ROLE amazarashi_preview SET default_transaction_read_only = on;
ALTER DEFAULT PRIVILEGES FOR ROLE amazarashi IN SCHEMA public GRANT SELECT ON TABLES TO amazarashi_preview;
SQL
```

Teste (deve ler e recusar escrita):

```bash
docker run --rm --network nova -e PGURL="postgres://amazarashi_preview:$PW@192.168.0.3:5432/amazarashi" postgres:16 \
  sh -c 'psql "$PGURL" -tAc "select count(*) from songs" && psql "$PGURL" -tAc "create table x(i int)"'
# 195
# ERROR: cannot execute CREATE TABLE in a read-only transaction
```

> Conexão direta na 5432 (porta publicada do `db-postgres`), não pelo pgbouncer: o `userlist.txt` dele é estático, então usuário novo não passaria.

## 2. Configuração do sync

```bash
mkdir -p ~/Docker/Previews && chmod 700 ~/Docker/Previews
cat > ~/Docker/Previews/preview.env <<EOF
PREVIEW_DATABASE_URL=postgres://amazarashi_preview:$PW@192.168.0.3:5432/amazarashi
# opcionais
# PREVIEW_MAX=3              # previews simultâneos
# PREVIEW_MIN_FREE_GB=1      # não faz pull abaixo disso
# PREVIEW_DOMAIN=infra.gui.dev.br
# PREVIEW_REPO=gsbenevides2/amazarashi
EOF
chmod 600 ~/Docker/Previews/preview.env
```

## 3. Script e cron

```bash
# instalado a partir do repo (mantenha atualizado depois de mexer no script)
install -m 755 scripts/preview-sync.sh ~/Docker/Previews/preview-sync.sh

( crontab -l 2>/dev/null | grep -v preview-sync.sh
  echo '*/2 * * * * /home/gsbenevides2/Docker/Previews/preview-sync.sh >> /home/gsbenevides2/Docker/Previews/sync.log 2>&1'
  echo '17 * * * * [ -f /home/gsbenevides2/Docker/Previews/sync.log ] && tail -c 300000 /home/gsbenevides2/Docker/Previews/sync.log > /home/gsbenevides2/Docker/Previews/sync.log.tmp && mv /home/gsbenevides2/Docker/Previews/sync.log.tmp /home/gsbenevides2/Docker/Previews/sync.log'
) | crontab -

crontab -l
```

O script não guarda credencial de GitHub: usa o token anônimo do GHCR e a API pública de PRs.

## 4. Testar

Com uma PR aberta que já tenha rodado o workflow **PR Preview** (tag `pr-<n>` no GHCR):

```bash
~/Docker/Previews/preview-sync.sh          # força na hora, sem esperar o cron
tail -f ~/Docker/Previews/sync.log         # "pr-<n>: https://... no ar"

docker ps --filter name=amazarashi-pr --format '{{.Names}} {{.Status}}'
cat ~/Docker/Projetos/traefik/proxy/dynamic/preview-amazarashi-pr-<n>.yaml

# sem passar pela Cloudflare (Host header direto no Traefik):
curl -sk -o /dev/null -w '%{http_code}\n' -H 'Host: amazarashi-pr-<n>.infra.gui.dev.br' https://127.0.0.1/
```

Esperado: container `Up`, router com `Host(...)`, `200` no curl local e a página abrindo no navegador em
`https://amazarashi-pr-<n>.infra.gui.dev.br`.

## 5. Desmontar (quando não quiser mais previews)

```bash
# 1. cron
( crontab -l 2>/dev/null | grep -v preview-sync.sh | grep -v sync.log ) | crontab -

# 2. containers, stacks e routers
for d in ~/Docker/Previews/amazarashi/pr-*; do
  [ -d "$d" ] || continue
  n="${d##*/pr-}"
  docker compose --project-directory "$d" down -v --rmi all
  rm -f ~/Docker/Projetos/traefik/proxy/dynamic/preview-amazarashi-pr-"$n".yaml
  rm -rf "$d"
done

# 3. script e config (o DSN do banco sai junto)
rm -f ~/Docker/Previews/preview-sync.sh ~/Docker/Previews/preview.env ~/Docker/Previews/sync.log
docker image prune -f

# 4. (opcional) revogar o papel no Postgres
docker exec db-postgres psql -U postgres -d amazarashi \
  -c 'REVOKE ALL ON ALL TABLES IN SCHEMA public FROM amazarashi_preview;' \
  -c 'DROP OWNED BY amazarashi_preview;' -c 'DROP ROLE amazarashi_preview;'

# 5. (opcional) tags pr-* remanescentes no GHCR
gh api --paginate "/users/gsbenevides2/packages/container/amazarashi/versions?per_page=100" \
  --jq '.[] | select(.metadata.container.tags[]? | startswith("pr-")) | .id' \
  | xargs -r -n1 gh api --method DELETE "/users/gsbenevides2/packages/container/amazarashi/versions/{}"
```

Sem os containers e o cron, o workflow `pr-preview.yml` continua publicando `pr-<n>` no GHCR (ninguém consome) — se quiser parar de buildar preview, remova o arquivo do workflow.

## Problemas comuns

| Sintoma | Causa / solução |
| --- | --- |
| sync não loga nada | cron roda `flock`: outra execução em andamento. Veja `~/Docker/Previews/sync.log` |
| `digest não encontrado` | a tag `pr-<n>` não existe: o job **PR Preview** falhou; veja o run da PR |
| `app não respondeu` | container subiu mas o Next quebrou; o log do sync imprime as últimas 30 linhas do container |
| `Traefik ainda não roteou` | arquivo do router ausente/ inválido em `dynamic/`; no próximo ciclo o sync tenta de novo (não marca como pronto) |
| `pull adiado` | disco abaixo de `PREVIEW_MIN_FREE_GB`; limpe imagens (`docker image prune -a`) |
| URL escreve “Just a moment…” | desafio da Cloudflare para bots/IPs de datacenter; no navegador abre normal |
| página 404/500 no preview | banco: confira o DSN em `preview.env` e se o papel `amazarashi_preview` ainda existe |
