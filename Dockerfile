
# ============================================================
# MEDORBITS - HARDENED PRODUCTION DOCKERFILE
# ============================================================

# Stage 1: Install production dependencies
FROM node:20-alpine AS dependencies

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci --omit=dev \
    && npm cache clean --force

# Stage 2: Assemble the production image
FROM node:20-alpine AS production

WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=3000

# Copy production dependencies
COPY --from=dependencies --chown=node:node /app/node_modules ./node_modules

# Copy application files; exclude secrets using .dockerignore
COPY --chown=node:node . .

# Create private runtime storage directories
RUN mkdir -p \
    /app/storage/private \
    /app/storage/temporary \
    /app/storage/logs \
    && chown -R node:node /app/storage \
    && chmod -R u=rwX,go= /app/storage

# Run as the unprivileged Node.js user
USER node

# Document the application port
EXPOSE 3000

# Health check: requires GET /health to return HTTP 2xx
HEALTHCHECK --interval=30s \
    --timeout=5s \
    --start-period=30s \
    --retries=3 \
    CMD ["node", "-e", "fetch('http://127.0.0.1:3000/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

# Start the application
CMD ["node", "server.js"]
