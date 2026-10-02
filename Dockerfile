FROM node:22-bookworm-slim

# pdf2pic needs GraphicsMagick + Ghostscript installed to rasterize PDF pages.
RUN apt-get update && apt-get install -y --no-install-recommends \
      graphicsmagick \
      ghostscript \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies first (better layer caching) - this also runs our
# postinstall script (`prisma generate`), which needs the schema present.
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

COPY . .
RUN npm run build

EXPOSE 3000

# docker-compose.yml overrides this command for the worker service.
CMD ["node", "dist/api/server.js"]
