FROM node:22-bookworm-slim
WORKDIR /app
COPY package.json package-lock.json .npmrc ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY server ./server
COPY api ./api
COPY api-handlers ./api-handlers
COPY lib ./lib
COPY scripts ./scripts
COPY Public ./Public
RUN node scripts/patch-wisp.mjs
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080 NODE_OPTIONS=--max-old-space-size=256
USER node
EXPOSE 8080
CMD ["node", "server/production.mjs"]
