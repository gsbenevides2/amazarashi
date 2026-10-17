---
name: importar-videoclipes
description: Extrai os videoclipes de amazarashi do site oficial (JSON da Sony) e do canal oficial no YouTube e cadastra em /admin/music-videos via API, com título em japonês, romaji, id do YouTube, miniatura no S3 e gradiente de reserva. Use sempre que o usuário falar em preencher, atualizar, sincronizar ou importar videoclipes, clipes, MVs, vídeos da home ou da página /videoclipes, ou em "pegar as miniaturas dos clipes", mesmo que não diga "skill".
---

# Importar videoclipes

Cadastra em `music_videos` os clipes oficiais que ainda não estão no banco. É incremental: compare pelo `youtubeId` e pule o que já existe, então dá para rodar de novo a cada lançamento.

## Pré-requisitos

1. Dev server em `http://localhost:3000` (`bun run dev`; o `.env.local` já é lido pelo Next). Teste: `curl -s localhost:3000/api/admin/music-videos` deve devolver uma lista JSON. Se vier HTML, o servidor está quebrado: veja o log, reinicie.
2. Banco com as colunas `romaji` e `coverImage` em `music_videos` (`bun --env-file=.env.local run db:sync`). Se o `drizzle-kit push` perguntar "rename or create", só um terminal interativo responde; passe `--hints` ou peça ao usuário rodar com `!`.
3. S3 configurado (`S3_*` no `.env.local`, e `S3_PUBLIC_URL` terminando no bucket). Sem isso o upload responde "S3 não configurado".

Escrever na API grava no banco e no S3 reais: mostre ao usuário a lista final (título, romaji, id) antes do primeiro POST.

## Fluxo

### 1. Ver o que já existe
```bash
curl -s localhost:3000/api/admin/music-videos   # compare por youtubeId
```

### 2. Fonte 1: JSON oficial do site (clipes de 2017 em diante)
O site `amazarashi.com` carrega os vídeos de um JSONP público. Para pegar tudo:
```bash
curl -sL "https://www.sonymusic.co.jp/json/v2/artist/amazarashi/video/category/ALL/start/0/count/200" -o v.json
```
A resposta é `callback({...})`: tire o que está entre o primeiro `(` e o último `)` e leia `items[]` (`video_id`, `title`, `date`, `category`, `video_source_type`). Use só `video_source_type == "YT"`. Itens com `video_id` do tipo `70005946_AICL-...` (2011) não são do YouTube e não tocam no player: ignore.

### 3. Fonte 2: aba de vídeos do canal oficial (lançamentos mais recentes)
O JSON da Sony fica defasado. O canal oficial é `https://www.youtube.com/user/amazarashiSMEJ` (o handle `@amazarashi` **não existe**, dá 404). Baixe `/videos` com cookie de consentimento e leia o `ytInitialData`:
```bash
curl -sL -A "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/124 Safari/537.36" \
  -H "Accept-Language: ja" -b "CONSENT=YES+1; SOCS=CAI" \
  "https://www.youtube.com/user/amazarashiSMEJ/videos" -o yv.html
```
No Python: `json.JSONDecoder().raw_decode(t[t.index('var ytInitialData = ')+20:])`, depois percorra o dicionário atrás de objetos com `contentType == "LOCKUP_CONTENT_TYPE_VIDEO"`: `contentId` é o id do vídeo e `metadata.lockupMetadataViewModel.title.content` o título. (O layout antigo `videoRenderer` não aparece mais.) Vêm ~30 vídeos, do mais novo ao mais velho.

Para confirmar o id de um clipe que você só conhece de cabeça: `curl -s "https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json"` deve devolver `author_name` "amazarashi Official YouTube Channel".

### 4. Curadoria: o que entra
Entram só os videoclipes oficiais ("Music Video", "MV", "Official Video", incluindo o MV com projeção mapeada de 令和二年). Ficam de fora: gravações ao vivo, teasers/trailers, lyric videos, edições alternativas do mesmo clipe (ex.: "YOKO TARO Edition", "360 Reality Audio"), versões acústicas. Se o usuário pedir lyric videos ou lives, inclua por pedido, não por padrão. Mostre a lista curada e o que ficou de fora.

### 5. Montar os campos

| campo | regra |
|---|---|
| `title` | nome da música em japonês, sem aspas nem sufixos ("アンチノミー", não "amazarashi『アンチノミー』Music Video…") |
| `romaji` | você gera, na grafia com macron do resto do site (Tsūkaku, Kyōkaisen). É tradução sua: avise o usuário. Título sem romaji cai no japonês na tela |
| `youtubeId` | 11 caracteres; é único no banco |
| `gradientFrom` / `gradientTo` | obrigatórios; reserva enquanto a miniatura não carrega. Alterne pares: `#7f1d1d/#dc2626`, `#1e3a5f/#3b82f6`, `#14532d/#22c55e`, `#4c1d95/#a78bfa`, `#78350f/#f59e0b`, `#164e63/#22d3ee`, `#44403c/#d6d3d1` |
| `position` | 1 = mais novo. A home mostra os 5 primeiros |
| `coverImage` | URL do S3 (passo 6) |

### 6. Gravar com curl/Python
A miniatura vem do YouTube e passa pelo upload do admin para ficar no S3:
```bash
# maxresdefault (1280x720); se o curl devolver 404, use hqdefault
curl -sL -o t.jpg -w "%{http_code}" "https://i.ytimg.com/vi/<id>/maxresdefault.jpg"
curl -s -F "file=@t.jpg;type=image/jpeg" localhost:3000/api/admin/upload   # → {"url": "..."}
curl -s -X POST localhost:3000/api/admin/music-videos -H 'Content-Type: application/json' \
  -d '{"youtubeId":"<id>","title":"…","romaji":"…","gradientFrom":"#…","gradientTo":"#…","coverImage":"<url>","position":1}'
```
Para corrigir um clipe que já existe use `PUT /api/admin/music-videos/<id>` mandando **todos** os campos obrigatórios (`youtubeId`, `title`, `gradientFrom`, `gradientTo`, `position`) mais `coverImage` e `romaji`: campos omitidos viram `null` e os obrigatórios fazem a chamada falhar. Para repetir em lote, leia a lista com `GET`, monte o corpo a partir da linha e só troque o campo novo.

Cada upload vai para `covers/<uuid>.jpg` no bucket; subir duas vezes a mesma miniatura deixa um arquivo órfão, então só suba o que for gravar.

### 7. Conferir
```bash
curl -s localhost:3000/api/music-videos | python3 -c "import sys,json; d=json.load(sys.stdin); print(len(d), sum(1 for x in d if x['coverImage']), sum(1 for x in d if x['romaji']))"
curl -s -o /dev/null -w "%{http_code}\n" localhost:3000/videoclipes
```
Os três números devem ser iguais (total, com miniatura, com romaji). A home usa os 5 primeiros por `position`.

## O que não fazer

Não baixe o arquivo de vídeo do YouTube (nem para gerar GIF ou trecho): vai contra os termos do YouTube e o material é da Sony. Para movimento na tela, use o player oficial embutido ou arquivos que o usuário forneça. Miniaturas públicas (`i.ytimg.com`) são o limite do que se baixa.
