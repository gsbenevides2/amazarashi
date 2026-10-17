---
name: importar-musica
description: Cadastra uma música de amazarashi no admin do site (/admin/songs) a partir do Spotify (dá play e captura os dados da faixa pela aba de rede) e do YouTube Music (acha o mesmo áudio para o player de vídeo). Gera títulos em kana, romaji, inglês e português, grava com curl e liga a faixa nos álbuns. Use sempre que o usuário pedir para cadastrar, importar ou adicionar uma música ou todas as músicas de um álbum, ou "preencher o vídeo" de uma faixa, mesmo sem dizer "skill".
---

# Importar música

Cria um registro em `songs` (página `/musica/<slug>`) com letra sincronizada e vídeo. O álbum de origem já deve existir em `releases`; se não existir, rode antes o skill `importar-discografia`.

## Pré-requisitos

1. Dev server em `http://localhost:3000` (`curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/admin/songs` → 200).
2. Playwright MCP e uma **conta do Spotify logada** no navegador dele. Sem login o Spotify joga para `#login` e não toca nada, e a letra só é pedida durante a reprodução. Se cair em `#login`, peça ao usuário para logar na aba e avisar (ele pode receber um código por e-mail; não leia a caixa de entrada dele).
3. O álbum precisa ter `slug` (a página da música linka `/album/<slug>`).

Tocar áudio e gravar no banco são ações reais. Mostre o resumo (slug, álbum, duração, vídeo escolhido, algumas linhas da letra) antes do `POST`.

## Fluxo

### 1. Spotify: tocar e capturar
Abra `https://open.spotify.com/intl-pt/album/<id>` do álbum e dê play na faixa. No Playwright, `hover()`/`click()` nas linhas costumam falhar com "element not visible/stable"; funciona disparar o duplo clique pelo DOM:

```js
document.querySelectorAll('[data-testid="tracklist-row"]')[i]
  .dispatchEvent(new MouseEvent('dblclick', {bubbles: true, cancelable: true, view: window}))
```
Confirme em `[data-testid="now-playing-widget"]` qual faixa está tocando. O botão "avançar" não é confiável; toque cada linha (≈3,5s de espera cada) e leia os ids em `[data-testid="tracklist-row"] a[href*="/track/"]`. Recarregar a página retoma a reprodução anterior, não a do álbum aberto.

Ao tocar, o player faz a chamada de metadados que importa (leia pela aba de rede do Playwright, não reproduza com curl):

```
browser_network_requests  filter="metadata/4/track"
browser_network_request   index=<n>  part="response-body"
```
- **Dados da faixa**: `GET spclient.wg.spotify.com/metadata/4/track/<gid hex>?market=from_token` →
  `name`, `number`, `duration` (ms), `album.date {year,month,day}`, `canonical_uri` (`spotify:track:<id>`), `has_lyrics`.
- O Spotify também pede `color-lyrics/v2/track/<id>/...` (letra sincronizada do Musixmatch).

Não copie o `authorization`/`client-token` dos headers para scripts, curl ou arquivos: são tokens de sessão. Respostas em cache do player não geram novo request.

### 2. YouTube Music: o mesmo áudio como vídeo
A busca por título em japonês é ruim (devolveu faixas de outros artistas, ex.: "境界線 - KYOUKAISEN" de SHIN). O caminho confiável é pelo álbum:

1. Pegue `youtubeMusicUrl` do release (`GET /api/admin/releases`, `https://music.youtube.com/browse/MPREb_...`) e abra.
2. Na lista de faixas do álbum, case a música pela posição e pelo título (em romaji) e leia o `a[href*="watch?v="]` da linha. O `v=` é o `youtubeId`.
3. Só se o álbum não estiver no YT Music: busque `https://music.youtube.com/search?q=amazarashi <título>`, aba "Músicas", e aceite só resultados cujo artista seja **amazarashi**.

Use o `videoId` da *música* (mesmo áudio do Spotify), porque a letra é sincronizada pelo tempo do Spotify. O clipe oficial ("Music Video" no canal amazarashi) tem outro começo/intro e dessincroniza a letra; só use se o usuário pedir e avise sobre o deslocamento.

`youtubeMusicUrl` da música: `https://music.youtube.com/watch?v=<youtubeId>`.

### 3. Montar o registro (`POST /api/admin/songs`)

| campo | origem |
|---|---|
| `slug` | romaji do título → sem acento, minúsculas, não `a-z` vira `-`; único |
| `releaseId` | `id` do release de origem (o álbum principal, não o single, se a música estiver nos dois) |
| `romaji`, `kana`, `nameEn`, `namePt` | `kana` = título em hiragana/katakana; os demais gerados por você |
| `duration` | `duration` (ms) → `m:ss` |
| `releaseDate` | `album.date` → `AAAA-MM-DD` |
| `youtubeId`, `youtubeMusicUrl` | passo 2 |
| `spotifyUrl` | `https://open.spotify.com/intl-pt/track/<id>` |
| `description` | obrigatório. Escreva 1–2 frases só com o que dá para afirmar (álbum, ano, faixa nº); não invente fatos sobre a canção. Marque como rascunho para o usuário revisar |
| `lyrics` | ignorar |

`kana` aqui é só o título em kana. Para vários títulos de uma vez, um script Python no scratchpad que monta o JSON e chama `curl -X POST` em loop é o caminho mais curto.

Avise o usuário que nomes, kana, romaji, traduções de título e descrição são gerados por IA e merecem revisão.


```bash
curl -s -X POST localhost:3000/api/admin/songs -H 'Content-Type: application/json' -d @song.json
```
Escreva `song.json` no scratchpad (a letra cabe numa string com `\n`).

### 4. Ligar a faixa aos álbuns
A faixa só vira link se a linha de `tracks` do release tiver o slug como 3º campo (`título | duração | slug`). Para o álbum de origem **e para cada single/EP/coletânea que contenha a mesma faixa** (mesmo título):

```bash
curl -s localhost:3000/api/admin/releases/<id>        # devolve o registro com "tracks" em texto
# edite só a linha da faixa para "título | duração | slug" e reenvie o objeto INTEIRO:
curl -s -X PUT localhost:3000/api/admin/releases/<id> -H 'Content-Type: application/json' -d @release.json
```
O `PUT` regrava tudo: se `tracks` faltar no corpo, as faixas do álbum são apagadas.

### 5. Conferir
- `curl -s localhost:3000/api/admin/songs` → quantidade esperada.
- `curl -s -o /dev/null -w "%{http_code}" localhost:3000/musica/<slug>` → 200 (as páginas são pré-renderizadas; a gravação já invalida o cache).
- `GET /api/admin/releases/<id>` → mesma contagem de faixas e `coverImage` intacto; a faixa linkada aparece como `título | duração | slug`.
- Abra `/musica/<slug>` e confira se o vídeo toca. Se o usuário forneceu letra com tempos, confira se acompanha; deslocada = o vídeo não é o mesmo áudio do Spotify.

## Vários lançamentos de uma vez
Foi feito com a ferramenta Workflow: um agente por lançamento, 4 por vez (lotes sequenciais), cada um com as próprias abas (`page.context().newPage()` dentro de `browser_run_code_unsafe`, nunca `browser_tabs`/`browser_navigate`). Para não haver corrida: ordene álbuns antes de singles/EPs e por data; monte os lotes sem título repetido dentro do lote; cada agente só faz `PUT` no próprio release; o reaproveitamento (mesmo título, duração ±3s) vem do mapa título→slug das linhas de `tracks` já ligadas. 58 agentes levaram ~16 min. Depois confira: slugs sem dígito, `youtubeId` repetido, faixas sem slug.

Limites do YouTube Music: páginas de single/EP às vezes listam só 1 faixa (as demais ficam sem vídeo e sem música cadastrada), e versões editadas (TV edit, "Game of Laplace Edit", single x "Long Edit.") devolvem o `videoId` da versão principal, mais longa. Não dá para corrigir por essa fonte; avise o usuário.

## Armadilhas
- Slug nunca com dígito: "1.0" → `wan-pointo-zero`, "(2017)" → `-nisenjuunana`.
- Spotify sem login: `#login` na URL e nada toca.
- `page.on('response')` registrado em chamadas anteriores continua ativo com variáveis antigas; prefira ler pela aba de rede (`browser_network_request`, que aceita `filename` para salvar o corpo em arquivo).
- Em vários lançamentos, só ligue a faixa se título igual e duração a ±3s (versões diferentes, como "Long Edit.", não são a mesma música).
- Duas versões da mesma música (single x álbum, TV edit, acústica): cadastre uma música por versão com slug distinto, ou só a versão principal; pergunte ao usuário se houver dúvida.
- Não faça commit sem o usuário pedir.
