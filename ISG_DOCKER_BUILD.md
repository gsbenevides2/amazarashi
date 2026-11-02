# ISG (Incremental Static Generation) - Docker Build Guide

## O Problema Original
Durante o build do Docker, o Next.js precisa acessar o banco de dados para:
1. Pré-renderizar páginas dinâmicas (usando `generateStaticParams()`)
2. Gerar dados de cada página no build

Isso causava problemas quando o banco não estava disponível no ambiente de build.

## A Solução: ISG com revalidate

Com a implementação de ISG, agora você pode fazer o build **sem acesso ao banco de dados**:

### 1. Configuração no `next.config.ts` (já existente)
```typescript
const nextConfig: NextConfig = {
  // ... outras configs
};
```

### 2. Revalidate em Páginas Estáticas
Todas as páginas estáticas agora têm:
```typescript
export const revalidate = 3600; // 1 hora em segundos
```

**Páginas modificadas:**
- `src/app/page.tsx`
- `src/app/albuns-e-discos/page.tsx`
- `src/app/biografia/page.tsx`
- `src/app/videoclipes/page.tsx`
- `src/app/sitemap.ts`

### 3. Revalidate em Páginas Dinâmicas
```typescript
export const instant = false;
export const revalidate = 3600; // Revalidate every hour

export const generateStaticParams = async () => {
  // Isso é chamado DURANTE o build para pré-renderizar slugs conhecidos
  // ...
}
```

**Páginas modificadas:**
- `src/app/album/[slug]/page.tsx`
- `src/app/musica/[slug]/page.tsx`

## Build sem Acesso ao Banco

### Opção 1: Build com Database URL (Recomendado)
```bash
# Fornece um banco vazio ou mockado apenas para o build
docker build \
  --build-arg DATABASE_URL="postgresql://user:pass@host:5432/db" \
  .
```

Durante o build:
1. O Next.js executa `generateStaticParams()` para obter slugs
2. Pré-renderiza todas as páginas com dados do banco
3. Gera arquivos estáticos HTML

### Opção 2: Build Parcial (ISG On-Demand)
Se não tiver banco disponível no build, você pode:

```bash
# Build sem DATABASE_URL
docker build .
```

O Next.js vai:
1. Pré-renderizar apenas as páginas estáticas (sem dados dinâmicos)
2. Deixar as páginas dinâmicas com `notFound()` durante o build
3. Renderizar pages no servidor em runtime (com `instant: false`)

### Opção 3: Cache Externo com .next Cache
```bash
docker build \
  --build-arg BUILD_CACHE=true \
  --build-arg DATABASE_URL="..." \
  .
```

## Como ISG Resolve o Problema

### Durante o Build
```
Build Start
  ↓
Next.js executa generateStaticParams()
  ↓
  ✓ Pré-renderiza /album/[slug] para todos os slugs conhecidos
  ✓ Pré-renderiza /musica/[slug] para todas as músicas conhecidas
  ✓ Gera pages estáticas: /, /albuns-e-discos, /biografia, /videoclipes
  ↓
Salva HTML estático no .next/
  ↓
Build End
```

### Em Produção
```
Requisição recebida
  ↓
Verifica .next/ para HTML estático
  ↓
  ✓ Se encontrar: Serve HTML cached
  ✓ Se não encontrar: Renderiza em runtime (new slug do admin)
  ↓
Background: A cada revalidate (3600s), regenera páginas em background
```

## Variáveis de Ambiente Necessárias

### Build Time
```bash
# Obrigatória para pré-renderizar com dados do banco
DATABASE_URL=postgresql://user:pass@host:5432/db

# Opcionais (S3, telemetria)
S3_PUBLIC_URL=https://s3.example.com
S3_ENDPOINT=https://s3.example.com
S3_REGION=us-east-1
S3_BUCKET=my-bucket
S3_ACCESS_KEY_ID=xxx
S3_SECRET_ACCESS_KEY=yyy
```

### Runtime (Produção)
```bash
# Mesmas variáveis acima
DATABASE_URL=postgresql://user:pass@host:5432/db
```

## Exemplo de Dockerfile Otimizado

```dockerfile
FROM node:22-alpine

WORKDIR /app

# Build args
ARG DATABASE_URL
ARG NEXT_PUBLIC_SITE_URL=https://amazarashi.com.br

# Definir variáveis
ENV DATABASE_URL=$DATABASE_URL
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL

# Instalar dependências
RUN npm install -g bun
COPY . .
RUN bun install --frozen-lockfile

# Build - com ou sem banco
RUN bun run build

# Runtime
ENV NODE_ENV=production
EXPOSE 3000

CMD ["bun", "run", "start"]
```

## Verifying ISG is Working

### Verificar arquivos estáticos gerados
```bash
# Após o build local
ls -la .next/app/
# Você deve ver arquivos .html para:
# - index.html (home)
# - albuns-e-discos/index.html
# - album/[slug-1]/index.html
# - album/[slug-2]/index.html
# etc...
```

### Verificar revalidate em runtime
```bash
# Ver logs de revalidação
docker logs <container-id> | grep -i revalidate
```

### Fazer request e verificar cache
```bash
curl -i https://amazarashi.com.br/
# Você deve ver:
# - Cache-Control: s-maxage=3600, stale-while-revalidate
# - X-Cache: HIT (se usando CDN)
```

## Troubleshooting

### Problema: "DATABASE_URL not provided during build"
**Solução:** Forneça DATABASE_URL como build arg
```bash
docker build --build-arg DATABASE_URL="..." .
```

### Problema: "Página vazia após build"
**Solução:** Verifique se `revalidate` está definido em todas as páginas
```bash
grep -r "export const revalidate" src/app/
```

### Problema: "Banco é chamado durante build"
**Solução:** Isso é normal e esperado! ISG pré-renderiza com dados do banco.
Se o banco não estiver disponível, remova `DATABASE_URL` e deixe páginas renderizarem em runtime.

## Benefícios

✅ **Build Rápido**: Não precisa esperar queries do banco durante build
✅ **Melhor Performance**: HTML estático é servido instantaneamente
✅ **Escalabilidade**: Regeneração em background não bloqueia requests
✅ **Flexibilidade**: Novo conteúdo (admin) renderiza em runtime
✅ **Menos Carga no Banco**: Reduz queries durante build
✅ **CI/CD Mais Confiável**: Build não falha se banco está lento/down

## Referências

- [Next.js ISG Documentation](https://nextjs.org/docs/app/building-your-application/data-fetching/incremental-static-regeneration)
- [Next.js revalidate](https://nextjs.org/docs/app/building-your-application/data-fetching/revalidating)
