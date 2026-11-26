FROM oven/bun:1-slim

WORKDIR /app

# Instalar dependencias
COPY package.json bun.lock* ./
RUN bun install

# Copiar código fuente
COPY . .

# Compilar frontend para producción
RUN bun run build

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3000

EXPOSE 3000

# Iniciar servidor Express/Vite unificado
CMD ["bun", "server.ts"]
