FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN --mount=type=cache,target=/root/.bun/install/cache bun install --frozen-lockfile
COPY . .
RUN --mount=type=cache,target=/root/.bun/install/cache bun run build

FROM oven/bun:1-slim
WORKDIR /app
COPY --from=builder /app/.output ./output
ENV PORT=3000
EXPOSE 3000
CMD ["bun", "run", "output/server/index.mjs"]
