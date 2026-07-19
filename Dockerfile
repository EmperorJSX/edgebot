FROM oven/bun:1

# Non-root user for security
RUN groupadd --system --gid 1001 appgroup && \
    useradd --system --uid 1001 --gid appgroup --no-create-home appuser

WORKDIR /app

ENV NODE_OPTIONS=--dns-result-order=ipv4first
ENV NEXT_TELEMETRY_DISABLED=1

# Package files first for layer caching
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .

# Front-end mock: no secrets, no env fetch, plain next build
RUN bun run build

RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000

# package.json start = next start -p 3000
CMD ["bun", "run", "start"]
