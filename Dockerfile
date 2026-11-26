FROM oven/bun:1-slim

WORKDIR /app

# Instalar dependencias de ejecución
COPY package.json bun.lock* ./
RUN bun install

# Copiar código fuente y bundle precompilado (dist/)
COPY . .

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Iniciar servidor Express unificado
CMD ["bun", "server.ts"]
