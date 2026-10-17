# Amazarashi BR

Fan site brasileiro (não oficial) de [amazarashi](https://www.amazarashi.com/): discografia, letras com tradução, videoclipes e biografia.

## Stack

- [Next.js](https://nextjs.org) 16 (App Router, Cache Components) + React
- [Bun](https://bun.sh) como runtime e gerenciador de pacotes
- API [Elysia](https://elysiajs.com) embutida no app, [Drizzle ORM](https://orm.drizzle.team) e PostgreSQL
- Armazenamento de imagens em S3
- Login do admin via OAuth (Authentik)

## Rodando localmente

```bash
bun install
cp .env.example .env.local   # ou crie o arquivo com as variáveis abaixo
bun run db:sync              # aplica o schema no banco
bun run dev
```

Abra [http://localhost:3000](http://localhost:3000).

## Variáveis de ambiente

| Variável | Descrição |
| --- | --- |
| `DATABASE_URL` | Conexão PostgreSQL (necessária também no build) |
| `SITE_URL` | URL pública do site |
| `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_PUBLIC_URL` | Bucket S3 das imagens |
| `AUTHENTIK_ISSUER`, `AUTHENTIK_CLIENT_ID`, `AUTHENTIK_CLIENT_SECRET` | OAuth do admin |
| `SESSION_SECRET` | Segredo de assinatura da sessão |

## Scripts

| Comando | O que faz |
| --- | --- |
| `bun run dev` | Servidor de desenvolvimento |
| `bun run build` / `bun run start` | Build e servidor de produção |
| `bun run lint` | ESLint |
| `bun run db:sync` / `db:studio` | Drizzle push / Studio |
| `bun run gif:preview` | Gera previews em GIF dos videoclipes |

## Deploy

O build consulta o banco, então `DATABASE_URL` precisa estar acessível durante ele. O `nixpacks.toml` cobre plataformas baseadas em Nixpacks; na Vercel basta importar o repositório.

## Licença

[MIT](LICENSE). Amazarashi e seu material pertencem aos respectivos detentores de direitos.
