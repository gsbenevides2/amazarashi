---
name: gerar-descricao
description: Gera descrições para músicas de amazarashi a partir da análise de suas letras. Use sempre que o usuário pedir para gerar, criar ou atualizar descrições de músicas, ou quando uma música não tiver descrição, mesmo sem dizer "skill".
---

# Gerar descrição de música

Gera descrições para músicas de amazarashi analisando suas letras em português. A descrição deve ser um único parágrafo com no máximo 400 palavras, sem títulos, negritos ou outras marcações visuais.

## Pré-requisitos

1. Dev server em `http://localhost:3000` (`curl -s -o /dev/null -w "%{http_code}" localhost:3000/api/admin/songs` → 200).
2. A música já deve estar cadastrada em `songs` com letra sincronizada em `lyric_lines`.

## Fluxo

### 1. Identificar músicas sem descrição ou com descrição rascunho

```bash
curl -s localhost:3000/api/admin/songs | jq '.[] | select(.description == null or .description == "" or (.description | contains("Rascunho"))) | {id, slug, nameEn, namePt}'
```

Ou para uma música específica:

```bash
curl -s localhost:3000/api/admin/songs/<id> | jq '{id, nameEn, namePt, description}'
```

### 2. Exportar músicas com letras

Para cada música que precisa de descrição, exporte os dados completos (incluindo letras traduzidas) para um arquivo JSON. Divida em lotes de ~20 músicas:

```ts
import { db } from './src/server/db';
import { songs, lyricLines, releases } from './src/server/db/schema';
import { eq, asc } from 'drizzle-orm';
import fs from 'fs';

// Para cada música, busque a letra em português
const lyrics = await db.select().from(lyricLines)
  .where(eq(lyricLines.songId, song.id))
  .orderBy(asc(lyricLines.position));

const ptLyrics = lyrics.map(l => l.pt).filter(l => l && l.trim() !== '' && l.trim() !== '*');
```

Salve cada lote em `/tmp/songs-batch-N.json` com o formato:

```json
[{
  "id": 1,
  "nameEn": "Refusology",
  "namePt": "Recusologia",
  "kana": "応答せよ、応答せよ",
  "romaji": "Outou Seyo, Outou Seyo",
  "releaseTitle": "ボイコット",
  "releaseRomaji": "Boikotto",
  "releaseDate": "2020-03-11",
  "lyrics": ["Linha 1 em português", "Linha 2 em português", ...]
}]
```

**IMPORTANTE**: Sempre inclua `releaseRomaji` (romaji do álbum) no JSON. Obtenha da tabela `releases`:

```ts
const [release] = await db.select({ title: releases.title, romaji: releases.romaji, releaseDate: releases.releaseDate })
  .from(releases).where(eq(releases.id, song.releaseId));
```

### 3. Gerar descrições com subagentes (Task tool)

Para cada lote, lance um subagente com a Task tool. O subagente deve:

1. **Ler o arquivo do lote** (`/tmp/songs-batch-N.json`)
2. **Analisar cada letra** — entender o que a música diz de verdade, seus temas, imagens, narrativa
3. **Gerar uma descrição única** para cada música

Use este prompt para cada subagente:

```
Leia o arquivo /tmp/songs-batch-N.json. Ele contém músicas da banda amazarashi.
Cada música tem id, nameEn, namePt, kana, romaji, releaseTitle, releaseRomaji, releaseDate e lyrics (letras em português).

Para CADA música do arquivo:
1. Leia e entenda as letras em português cuidadosamente
2. Analise o que a música realmente fala — temas, imagens, emoções, narrativa
3. Escreva UM ÚNICO parágrafo (máximo 400 palavras, sem formatação) em português

A descrição DEVE seguir este padrão:
- Começar com: "Faixa do álbum [releaseTitle] ([releaseRomaji]), lançado em [DD de mês de YYYY]."
  - O título do álbum em japonês deve SEMPRE vir acompanhado do romanji entre parênteses
- Descrever o que a letra REALMENTE diz, com imagens e metáforas específicas da canção
  - Narre a história/mensagem central da letra com riqueza de detalhes
  - Mencione cenas, imagens e símbolos específicos presentes na letra
  - Descreva o arco narrativo ou emocional da canção
- Terminar destacando uma citação real da letra que capture a essência da música
  - Use o formato: Como diz a letra: "citação em português"
  - Ou: Como resume a própria letra: "citação"
  - Ou: A frase mais pungente é: "citação"

Ao terminar, escreva os resultados em /tmp/descriptions-batch-N.json
como array de objetos: {id: number, description: string}

REGRAS:
- Leia e entenda cada letra de verdade. NÃO use descrições genéricas.
- Cada descrição deve refletir o conteúdo único daquela música específica.
- NÃO invente fatos sobre a canção ou o contexto de criação.
- O título do álbum em japonês DEVE ter romanji: "ボイコット (Boikotto)", nunca "ボイコット" sozinho.
- A citação final deve ser uma frase REAL da letra em português, não inventada.
- Máximo 400 palavras por descrição.
```

### 4. Mesclar e atualizar no banco

Após todos os subagentes terminarem, mescle os resultados e atualize o banco:

```ts
import fs from 'fs';
import { db } from './src/server/db';
import { songs } from './src/server/db/schema';
import { eq } from 'drizzle-orm';

// Mesclear todos os lotes
const allDescriptions = [];
for (let i = 0; i <= N; i++) {
  const batch = JSON.parse(fs.readFileSync(`/tmp/descriptions-batch-${i}.json`, 'utf-8'));
  allDescriptions.push(...batch);
}

// Atualizar no banco
for (const desc of allDescriptions) {
  await db.update(songs).set({ description: desc.description }).where(eq(songs.id, desc.id));
}
```

### 5. Conferir

```ts
const [song] = await db.select({ description: songs.description }).from(songs).where(eq(songs.id, id));
console.log(song.description);
```

## Exemplo de descrição gerada

Para a música "Recusologia" (kyohioroji):

```
Faixa do álbum ボイコット (Boikotto), lançado em 11 de março de 2020. A canção é um grito de protesto e recusa contra o silêncio imposto pelo mundo. O narrador parte do Tohoku, região que se despediu do vento norte, e clama respostas para os incontáveis infernos sem saída que vagam por um céu emudecido, para as mil coisas que não se resolvem com um simples "quanta coisa aconteceu". Há jovens cruzando o Missouri com calor solar imprudente, tentando resistir à enorme sombra da montanha chamada viver, acumulando pequenas maldades até que os olhos se turvam. Na plataforma de trem numa manhã de neve, ao virar a página com mãos enregeladas, a solidão passou a morar em cada entrelinha. O lirismo e a sentimentalidade do narrador são apresentados como recusas que não se cumpriram — assim como o céu que a torre transpassa e o passo das crianças voltando da escola. A imagem central é a de um canário que canta, e tal como ele, a recusa do narrador treme, mas persiste. O refrão repete como um mantra de resistência: "Arrebente a jaula, ó prisioneiro" — e a música se encerra com a justaposição de becos da cidade transcritos e assassínio de estrelas, cunhando o termo "recusologia" como filosofia de vida. Como resume a própria letra: "Aqui de pé, eu clamo".
```

## Regras

- **Máximo 400 palavras** por descrição
- **Um único parágrafo** (sem quebras de linha)
- **Sem formatação** (sem títulos, negritos, itálicos, asteriscos, hashtags)
- **Em português**
- **Baseado na análise real da letra**, não em suposições
- **Não invente fatos** sobre a canção ou o contexto de criação
- **Destaque uma expressão real** da letra que resuma o sentimento central
- **Use subagentes** (Task tool) para processar lotes em paralelo
- **Títulos japoneses sempre com romanji**: "ボイコット (Boikotto)", "爆弾の作り方 (Bakudan no Tsukurikata)"

## Armadilhas

- **Não invente informações**: Se a letra não revela contexto sobre a criação da música, não afirme nada.
- **Respeite o limite de 400 palavras**: Descrições mais longas devem ser condensadas.
- **Sem formatação**: A descrição é texto puro, sem markdown.
- **Use a tradução em português**: A análise deve ser feita sobre a coluna `pt` das letras.
- **Destaque uma frase real**: A expressão destacada deve vir diretamente da letra, não ser inventada.
- **O PUT substitui tudo**: Se usar PUT no admin, envie o registro completo.
- **Subagentes em paralelo**: Lance múltiplos subagentes simultaneamente para acelerar o processamento.
- **Lotes de ~20 músicas**: Evite lotes maiores para não sobrecarregar os subagentes.
- **Romanji obrigatório**: Todo título de álbum em japonês na descrição DEVE ter romanji entre parênteses.
- **Letra sem tradução**: Se a música não tiver letras traduzidas (coluna `pt` vazia), não gere descrição — avise o usuário.