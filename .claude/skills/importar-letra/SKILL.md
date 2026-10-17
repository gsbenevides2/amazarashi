# Skill: importar-letra

# Importar letra

Busca a letra sincronizada de uma música no Spotify (Musixmatch), translitera para romaji, traduz para português e salva no banco (`lyric_lines`).

## Pré-requisitos

1. Dev server rodando em `http://localhost:3000`.
2. Playwright MCP com conta do Spotify logada. Sem login, a página redireciona para `#login` e nada é carregado.
3. As músicas já devem existir no banco (`songs`), com `slug` válido.

## Resumo do fluxo

1. Montar a lista `[{ id, slug, trackId }]` (o trackId está em `songs.spotifyUrl`).
2. Capturar as letras no browser, acumulando em `sessionStorage` (filtra a resposta pelo `trackId`!).
3. Extrair o `sessionStorage` para um arquivo via `browser_evaluate` com `filename`.
4. Dividir em chunks e traduzir com subagentes (kana | romaji | pt).
5. Salvar via `put.py` (GET + PUT do objeto completo; corrige timestamps duplicados).
6. Verificar a contagem de linhas contra o capturado.

## Passo 1 — Listar músicas e trackIds

O `trackId` é o trecho final de `songs.spotifyUrl` (`https://open.spotify.com/track/<trackId>`).
Para várias músicas, monte um JSON:

```json
[{"id": 1, "slug": "kyohioroji", "trackId": "1O2rBNgC3hFOBn4gXf52NT"}]
```

Se `spotifyUrl` estiver vazio, busque a faixa: `https://open.spotify.com/search/<título>%20amazarashi` e confirme pela página (título + artista).

## Passo 2 — Capturar a letra (Playwright)

O endpoint `color-lyrics/v2/track/<trackId>/...` retorna:

- **200** — tem letra (sincronizada ou não).
- **404** — o Spotify **não tem letra** para a faixa (definitivo; instrumentais, edits, singles). Não é erro de rede.
- **429** — rate limit. Precisa de backoff.

**Armadilha crítica:** o player do Spotify **pré-carrega outras faixas**. Capturar "qualquer resposta de `color-lyrics`" traz a letra de OUTRA música (foi a causa de letras trocadas no passado). Sempre filtre a resposta por `resp.url().includes(trackId)`.

Rode em lotes de ~8 músicas por chamada (`run_code_unsafe`) para não estourar o timeout de 120s. O `sessionStorage` sobrevive às navegações no mesmo domínio, então acumula entre chamadas:

```js
async (page) => {
  const songs = [ /* {id, slug, trackId} */ ];
  async function store(rec) {
    for (let i = 0; i < 8; i++) {
      try { await page.evaluate((r) => sessionStorage.setItem('lyr:' + r.slug, JSON.stringify(r)), rec); return; }
      catch (e) { await page.waitForTimeout(400); }
    }
  }
  async function capture(s) {
    for (let a = 0; a < 5; a++) {
      let status = null, data = null;
      const handler = async (resp) => {
        if (resp.url().includes('color-lyrics') && resp.url().includes(s.trackId)) {
          status = resp.status();
          if (status === 200) { try { data = await resp.json(); } catch (e) {} }
        }
      };
      page.on('response', handler);
      try { await page.goto(`https://open.spotify.com/intl-pt/track/${s.trackId}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); } catch (e) {}
      for (let i = 0; i < 20 && status === null; i++) await page.waitForTimeout(500);
      page.removeListener('response', handler);
      if (status === 200) {
        const lines = (data?.lyrics?.lines || [])
          .filter((l) => l.words && l.words.trim() !== '' && l.words.trim() !== '♪') // pula vazias e ♪
          .map((l) => ({ t: Math.round(Number(l.startTimeMs) / 1000), w: l.words }));
        return { lines };
      }
      if (status !== null && status !== 429) return { lines: [] }; // 404 = sem letra
      await page.waitForTimeout(5000 * (a + 1)); // 429: backoff 5s, 10s, 15s...
    }
    return { lines: [] };
  }
  const summary = [];
  for (const s of songs) {
    await page.waitForTimeout(1500); // ritmo lento evita 429
    const r = await capture(s);
    await store({ id: s.id, slug: s.slug, trackId: s.trackId, status: r.lines.length ? 'ok' : 'no_lyrics', lines: r.lines });
    summary.push(`${s.id}:${s.slug}:${r.lines.length}`);
  }
  return summary.join(', ');
}
```

> Se você tiver acesso ao `page`, também dá para contornar o timeout reduzindo o lote. Nunca reduza o espaço de 1,5s entre faixas — sem ele o Spotify retorna 429 e você grava letras vazias por engano.

## Passo 3 — Extrair para arquivo

Use `browser_evaluate` com `filename` (salva em disco, dentro de `.playwright-mcp/` ou do repo — não despeja o JSON todo no contexto):

```js
() => JSON.stringify(Object.keys(sessionStorage).filter(k => k.startsWith('lyr:')).map(k => JSON.parse(sessionStorage.getItem(k))))
```

`filename`: `.playwright-mcp/lyrics-session.json`. O arquivo fica com JSON duplamente codificado (`"\"[...]\""`) — faça `json.loads(json.loads(raw))` para ler.

## Passo 4 — Traduzir em lotes (subagentes)

1. Junte as capturas de todos os lotes num único `all.json` (`[{ id, slug, trackId, status, lines:[{t,w}] }]`).
2. Divida as músicas **com letra** em chunks de ~6 (`work/chunk-01.json`, ...).
3. Dispare subagentes (`task`, `general`) em ondas de 4. Cada um lê um chunk e, para cada música:
   - `kana` = texto original (copiar `w` exatamente).
   - `romaji` = Hepburn, minúsculas, sem macrons (vogais longas como `ou`/`uu`).
   - `pt` = tradução natural/poética (não literal).
   - Formato por linha: `{t} | {kana} | {romaji} | {pt}` (sem `|` dentro dos campos).
   - Escreve `work/<slug>.txt` e roda: `python3 .claude/skills/importar-letra/put.py <id> work/<slug>.txt`.

## Passo 5 — Salvar no banco

O `PUT /api/admin/songs/<id>` reescreve o objeto inteiro (`clean()` zera campos ausentes), então é obrigatório fazer **GET antes** e reenviar todos os campos com o `lyrics` trocado. O `put.py` faz isso.

```bash
python3 .claude/skills/importar-letra/put.py <id> work/<slug>.txt
# imprime: 200 {"id": <id>}
```

**Letra sem sincronia**: quando o Spotify retorna tudo com `startTimeMs=0` (ou `syncType` diferente de `LINE_SYNCED`), grave com o **segundo vazio** — NÃO distribua tempos pela duração (o destaque fica estranho). No `.txt`, a linha começa com `" | "`:

```
 | 吹き消される命は… | fukikesareru inochi wa… | A vida que é apagada…
```

O servidor guarda `startSecond = null` e o player mostra a lista sem destacar/rolar nenhum verso.

Músicas **sem letra no Spotify (404)**: apague as linhas antigas enviando `lyrics` vazio:

```bash
printf '' > work/_empty.txt
python3 .claude/skills/importar-letra/put.py <id> work/_empty.txt
```

## Passo 6 — Verificar

Compara a contagem de linhas do banco com o capturado:

```bash
python3 - <<'PY'
import json, urllib.request
data = {s['id']: s for s in json.load(open('all.json'))}
for sid, s in data.items():
    row = json.load(urllib.request.urlopen(f'http://localhost:3000/api/admin/songs/{sid}'))
    n = len([l for l in (row.get('lyrics') or '').split('\n') if l.strip()])
    if n != len(s['lines']):
        print('MISMATCH', sid, s['slug'], n, len(s['lines']))
print('ok')
PY
```

Também confira o formato (4 campos por linha):

```bash
curl -s localhost:3000/api/admin/songs/<id> | python3 -c "
import sys,json; print(json.load(sys.stdin)['lyrics'].split(chr(10))[0])"
```

## Formato no banco

Tabela `lyric_lines`: `songId`, `position` (ordem, 1..n), `startSecond` (double, **nulo = sem sincronia**), `kana`, `romaji`, `pt`. **PK = (songId, position)**.

O campo `lyrics` no PUT é uma string com linhas `startSecond | kana | romaji | pt` separadas por `\n`; `startSecond` vazio vira `null`. O admin faz o parse (`src/server/modules/admin/service.ts`).

O player (`src/components/detalhes/LyricsPlayer.tsx`) decide sincronizado vs. lista por `lines.some((l) => l.t != null)`.

## Armadilhas

- **Pré-carregamento do player**: capturar `color-lyrics` sem filtrar por `trackId` grava a letra de outra música. Sempre filtre pela URL.
- **429 (rate limit)**: sem espaçamento/backoff, faixas viram "sem letra" por engano. Se um bloco de faixas apareceu como `no_lyrics` durante um período lento, re-capture: pode não ser 404 real.
- **404 é definitivo**: se um 404 vier enquanto a faixa que está tocando retorna 200 na mesma sessão, é ausência real de letra. Aí apague as linhas antigas.
- **Letra sem sincronia**: algumas faixas têm todas as linhas com `startTimeMs=0`. Grave com segundo vazio (não distribua tempos). Só use o `t` do Spotify quando os tempos forem crescentes e únicos.
- **PUT reescreve tudo**: sempre GET antes; campos obrigatórios (`slug`, `releaseId`, ...) precisam estar no body.
- **`sessionStorage`** some se a aba/sessão do Playwright fechar. Extraia para arquivo (Passo 3) periodicamente como backup.
- **Nunca** use `clearCookies()`: desloga do Spotify.
- Romanização/tradução são geradas por IA — merecem revisão (nomes próprios, expressões idiomáticas, nuances poéticas).
