---
name: importar-discografia
description: Traz lançamentos novos de amazarashi do Spotify e do YouTube Music para o admin do site (/admin/releases), com capa no S3, faixas, datas, romaji, nomes em inglês/português e slug. Use sempre que o usuário falar em atualizar, sincronizar ou importar a discografia, cadastrar álbum, single, EP ou lançamento novo, preencher capas ou links do Spotify/YT Music, mesmo que não diga "skill".
---

# Importar discografia

Cadastra no banco do site o que existe no Spotify/YT Music e ainda não está em `releases`. Roda de forma incremental: o que já existe é pulado, então pode ser executado de novo a cada lançamento.

## Pré-requisitos (confira antes de tudo)

1. Dev server no ar em `http://localhost:3000` (`bun run dev`). Teste: `curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/admin/releases` deve dar 200.
2. S3 configurado no `.env.local` (`S3_BUCKET`, chaves, `S3_ENDPOINT`). **`S3_PUBLIC_URL` precisa terminar com o bucket** (ex.: `https://host/amazarashi`), porque o código monta `${S3_PUBLIC_URL}/covers/<uuid>.jpg`. Reiniciar o dev server depois de editar o `.env.local`. Se o upload responder "S3 não configurado", é isso.
3. Playwright MCP disponível (carregue os schemas com ToolSearch). Abra o Spotify e o YouTube Music em abas; peça ao usuário se precisar de login.

Escrever na API grava no banco e no S3 reais. Mostre ao usuário o resumo do que vai criar (títulos, datas, categorias) antes do primeiro POST.

## Fluxo

### 1. Ver o que já existe
```bash
curl -s localhost:3000/api/admin/releases   # lista; compare por spotifyUrl
```
Só crie o que não tiver o `spotifyUrl` (`https://open.spotify.com/intl-pt/album/<id>`).

### 2. Spotify: ids dos lançamentos (Playwright)
Páginas `https://open.spotify.com/intl-pt/artist/6T4K8YuFc0JPDrYgABbxao/discography/album` e `.../discography/single`. A lista é virtualizada: role o contêiner de rolagem (um `div` com `overflow-y` auto/scroll, **fora** do `main`) em passos de ~600px com pausa de 500ms e junte os `a[href*="/album/"]` num `Map` até parar de crescer. `browser_run_code_unsafe` com `page.evaluate` em loop faz isso numa chamada.

### 3. Spotify: detalhes de cada lançamento
Para cada id, `page.goto('.../album/<id>')`, espere `[data-testid="tracklist-row"]` e leia:
- **Tipo** (Álbum/Single/EP): primeira linha de `[data-testid="entityTitle"]` → `closest('div').parentElement.innerText`.
- **Data completa**: folha de texto em `main` com regex `^\d{1,2} de [^\s]+ de \d{4}$` (use `[^\s]+`, não `\w+`: "março" tem ç). Converta o mês em português para `AAAA-MM-DD`. A data só com o ano que aparece no cabeçalho não serve; `releaseDate` exige o dia.
- **Faixas**: cada `tracklist-row`, `innerText` por linhas → título e duração (última linha).
- **Capa**: `img[src*="i.scdn.co/image/ab67616d"]`. Guarde o hash (tudo depois dos 16 primeiros caracteres do nome do arquivo) e baixe em 640px: `https://i.scdn.co/image/ab67616d0000b273<hash>`.

Faça o loop de ids dentro de um único `browser_run_code_unsafe` (≈1s por álbum; ~40 álbuns cabem em um lote).

### 4. YouTube Music: link de cada lançamento
Abra `https://music.youtube.com/channel/UCYYblFFBpnZabWlpz9aAIPA`. Em "Álbuns" e em "Singles e EPs" clique no título da seção (o `href` sozinho perde os parâmetros, só o clique funciona) e role coletando `ytmusic-two-row-item-renderer` → `a[href*="browse/MPRE"]`, `.title` e `.subtitle` ("Single • 2026"). Os títulos de lá estão em romaji irregular; case com o Spotify pela **ordem** (ambos vão do mais novo ao mais velho) e confirme por título/ano. URL final: `https://music.youtube.com/browse/MPREb_...`. Itens que só existem no YT Music não têm data completa: não cadastre, avise o usuário.

### 5. Montar os campos

| campo | regra |
|---|---|
| `title` | título em japonês, igual ao Spotify |
| `romaji` / `nameEn` / `namePt` | gere você; avise o usuário que são traduções suas, não oficiais. Romaji **sem dígitos** (1.0 → "Wan Pointo Zero") |
| `slug` | romaji → NFD sem acento → minúsculas → tudo que não é `a-z` vira `-`. Único no banco: se colidir (EP e single de mesmo nome, ou álbum homônimo), acrescente `-ep` / `-single` |
| `category` | `album`, `single`, `dvd`, `streaming`. Se o título+data constarem em `src/components/albuns-e-discos/data.ts`, use a categoria de lá. Senão: EP → `single`; Single → `streaming`; Álbum → `album` |
| `releaseDate` | `AAAA-MM-DD` |
| `spotifyUrl`, `youtubeMusicUrl` | passos 3 e 4 |
| `coverImage` | URL devolvida pelo upload (passo 6) |
| `tracks` | uma por linha: `título \| duração` (o 3º campo, slug da música, é opcional) |

DVDs não existem no Spotify/YT Music; ficam fora.

### 6. Gravar com curl
```bash
# capa: baixar e subir (curl não sofre CORS; do navegador o fetch ao RustFS falha mesmo com upload ok)
curl -s -o /tmp/capa.jpg "https://i.scdn.co/image/ab67616d0000b273<hash>"
curl -s -F "file=@/tmp/capa.jpg;type=image/jpeg" localhost:3000/api/admin/upload   # → {"url": "..."}

# criar
curl -s -X POST localhost:3000/api/admin/releases -H 'Content-Type: application/json' -d @release.json
```
Use o diretório scratchpad para `release.json` e as capas. Rode o upload **uma vez por lançamento** e guarde a URL: repetir o lote deixa capas órfãs no bucket.

Atualizar um registro existente (`PUT /api/admin/releases/<id>`): faça `GET /api/admin/releases/<id>` primeiro e reenvie o objeto inteiro com as mudanças. O `PUT` regrava todos os campos e **apaga as faixas se `tracks` não vier no corpo**.

### 7. Conferir
- `curl -s localhost:3000/api/admin/releases` → quantos registros, nenhum sem `coverImage`, `slug`, `youtubeMusicUrl`.
- `curl -sI <coverImage>` → 200 `image/jpeg`.
- Um `GET /api/admin/releases/<id>` por amostra para ver as faixas.
- Se houver capas órfãs (lote repetido), liste `covers/` com `Bun.S3Client` (`bun --env-file=.env.local script.ts`), compare com os `coverImage` do banco e apague só as que sobram. Mostre a lista ao usuário antes de apagar.

## Armadilhas já encontradas
- Rolar o `document` em vez do contêiner certo do Spotify devolve só 2 álbuns.
- Álbuns-coletânea (ex.: メッセージボトル) têm dezenas de faixas repetidas de outros álbuns; copie como estão.
- "Failed to fetch" depois de um upload pode ser CORS na sua própria checagem, não falha do upload: confirme pela API.
- Não faça commit de nada sem o usuário pedir.
