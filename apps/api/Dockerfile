# Build context: monorepo root (docker build -f apps/api/Dockerfile .)
FROM node:22-alpine AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.15.4 --activate

FROM base AS deps
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/web/package.json ./apps/web/package.json
RUN pnpm install --frozen-lockfile

FROM base AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=deps /app/apps/web/node_modules ./apps/web/node_modules
COPY . .
WORKDIR /app/apps/api
RUN node ace build

FROM base AS production
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/apps/api/build ./
RUN pnpm install --prod --ignore-scripts && mkdir -p storage/uploads
EXPOSE 3333
CMD ["node", "bin/server.js"]
