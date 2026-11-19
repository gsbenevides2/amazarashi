# Preview de PR

> Primeira vez no servidor (ou depois de remover a infra)? Siga [preview-setup.md](preview-setup.md).

Cada PR aberta (e não rascunho) ganha uma URL própria com a imagem buildada daquele commit:

```
https://amazarashi-pr-<número-da-pr>.infra.gui.dev.br
```

Ex.: PR #12 → `https://amazarashi-pr-12.infra.gui.dev.br`.

## Como funciona

O servidor está atrás de NAT: nada entra nele pela internet. Por isso o preview é **pull**, não push.

1. **CI** (`.github/workflows/pr-preview.yml`) roda em `opened`, `synchronize`, `reopened`, `ready_for_review` e `closed`:
   - builda o `Dockerfile` da branch e publica em `ghcr.io/gsbenevides2/amazarashi:pr-<n>` (cache de build no GHA);
   - comenta a URL na PR (`<!-- pr-preview -->` é editado a cada push, sem duplicar comentário);
   - ao fechar a PR, apaga a tag `pr-<n>` do GHCR.
2. **Servidor** — `scripts/preview-sync.sh` roda por cron a cada 2 minutos:
   - lista as PRs abertas na API pública do GitHub e as tags `pr-*` no GHCR;
   - para cada PR aberta com imagem: gera `~/Docker/Previews/amazarashi/pr-<n>/` (compose + `.env`), `docker pull`, `docker compose up -d` e espera o Next responder;
   - escreve o router em `~/Docker/Projetos/traefik/proxy/dynamic/preview-amazarashi-pr-<n>.yaml` (file provider recarrega sozinho);
   - compara o digest da imagem para não recriar container sem mudança;
   - remove container, stack, imagem e router quando a PR fecha (ou o digest some);
   - respeita um teto de previews simultâneos e não faz `pull` com pouco espaço em disco.

O domínio `*.infra.gui.dev.br` já resolve (wildcard na Cloudflare) e o certificado `*.infra.gui.dev.br` já existe no Traefik — nenhum DNS é criado por PR.

## Isolamento

O preview é somente leitura em relação aos dados de produção:

- `DATABASE_URL` usa o papel `amazarashi_preview` (só `SELECT`, com `default_transaction_read_only = on`) no banco `amazarashi`;
- `SESSION_SECRET` e o OAuth do Authentik **não** são herdados do PRD, então o `/admin` do preview não abre sessão válida (e o banco recusaria escrita de qualquer forma);
- o container não publica portas no host: só entra pelo Traefik;
- `watchtower.enable=false`, para o deploy de PRD não mexer no preview.

## Configuração no servidor

`~/Docker/Previews/preview.env` (mode 600):

```bash
PREVIEW_DATABASE_URL=postgres://amazarashi_preview:<senha>@192.168.0.3:5432/amazarashi
# opcionais
# PREVIEW_MAX=3            # previews simultâneos
# PREVIEW_MIN_FREE_GB=1    # não faz pull abaixo disso
# PREVIEW_DOMAIN=infra.gui.dev.br
```

Instalação / atualização do script e do cron:

```bash
install -m 755 scripts/preview-sync.sh ~/Docker/Previews/preview-sync.sh
( crontab -l 2>/dev/null | grep -v preview-sync.sh
  echo '*/2 * * * * $HOME/Docker/Previews/preview-sync.sh >> $HOME/Docker/Previews/sync.log 2>&1'
) | crontab -
```

Log: `~/Docker/Previews/sync.log`. Rodar na mão: `~/Docker/Previews/preview-sync.sh`.

## Deploy imediato (sem esperar o cron)

```bash
~/Docker/Previews/preview-sync.sh
docker logs -f amazarashi-pr-<n>
```

Se o preview não subir, o log do sync mostra o motivo (pull, digest, app não respondeu, disco).

## Limpeza manual

```bash
docker compose --project-directory ~/Docker/Previews/amazarashi/pr-12 down -v --rmi all
rm -rf ~/Docker/Previews/amazarashi/pr-12
rm ~/Docker/Projetos/traefik/proxy/dynamic/preview-amazarashi-pr-12.yaml
docker image prune -f
```

## Limitações

- O domínio está atrás da Cloudflare: acesso automatizado (curl, bot, runner de CI) recebe o desafio `Just a moment...` (HTTP 403). No navegador a página abre normalmente.
- Preview não roda `db:sync` nem migrations: schema e dados vêm do banco de PRD (somente leitura).
- Dados mutáveis (admin) não são testáveis no preview — decisão proposital.
- `NEXT_PUBLIC_*` são inlinados no build: vale o que o CI buildou (sem `.env`), não o `.env` de PRD.
- Imagem antiga do preview fica no servidor até o próximo deploy da mesma PR (o `image prune` do próprio script limpa a camada sem tag).
