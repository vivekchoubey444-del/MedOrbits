============================================================

MEDORBITS -- HARDENED PRODUCTION DOCKERFILE

============================================================

Stage 1: Install production dependencies.

FROM node:25-alpine AS dependencies

WORKDIR /app

ENV NODE_ENV=production

COPY package.json package-lock.json ./

RUN npm ci –omit=dev 
&& npm cache clean –force

Stage 2: Assemble the production image.

FROM node:25-alpine AS production

WORKDIR /app

ENV NODE_ENV=production 
PORT=3000 
HOST=0.0.0.0

Copy production dependencies from the dependency stage.

COPY –from=dependencies –chown=node:node /app/node_modules ./node_modules

Copy only application files, excluding local secrets and artifacts

through .dockerignore.

COPY –chown=node:node . .

Create writable directories for application runtime data.

Keep private uploads outside publicly served static directories.

RUN mkdir -p 
/app/storage/private 
/app/storage/temporary 
/app/storage/logs 
&& chown -R node:node /app/storage 
&& chmod -R u=rwX,go= /app/storage

Run the application as the unprivileged Node.js user.

USER node

Document the HTTP port.

EXPOSE 3000

The Express application must implement GET /health.

HEALTHCHECK –interval=30s 
–timeout=5s 
–start-period=30s 
–retries=3 
CMD ["node", "-e", "fetch(‘http://127.0.0.1:3000/health’).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"]

Update this command if the actual production entry point differs.

CMD ["node", "server.js"]

============================================================

END OF DOCKERFILE

============================================================