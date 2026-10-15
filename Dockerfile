============================================================

MEDORBITS -- PRODUCTION DOCKERFILE

============================================================

Use the official Node.js 20 LTS Alpine image.

FROM node:20-alpine

Set the application directory.

WORKDIR /app

Set production environment.

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0

Install package manifests first for Docker layer caching.

COPY package.json package-lock.json ./

Install only production dependencies.

npm ci requires package-lock.json to match package.json.

RUN npm ci –omit=dev 
&& npm cache clean –force

Copy the application source.

COPY –chown=node:node . .

Ensure application files belong to the non-root user.

RUN chown -R node:node /app

Run the application without root privileges.

USER node

Document the application’s listening port.

EXPOSE 3000

Basic container health check.

This assumes server.js implements GET /health.

HEALTHCHECK –interval=30s –timeout=5s –start-period=20s –retries=3 
CMD node -e "fetch(‘http://127.0.0.1:3000/health’).then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

Start the MedOrbits server.

CMD ["node", "server.js"]

============================================================

END OF DOCKERFILE

============================================================