FROM node:26.3.1-alpine3.23 AS base_node


FROM base_node AS dependencies
WORKDIR /app
COPY package.json package-lock.json tsconfig.json schema.prisma prisma.config.ts ./
RUN npm ci && npx prisma generate


FROM dependencies AS prisma_migrate
COPY migrations ./migrations
CMD ["npx", "prisma", "migrate", "deploy"]


FROM dependencies AS backends_builder
COPY queue ./queue
COPY worker ./worker
RUN npx tsc -p .

FROM dependencies AS queue
COPY --from=backends_builder /app/dist/ ./
CMD ["node", "queue/index.js"]

FROM dependencies AS worker
COPY --from=backends_builder /app/dist/ ./
CMD ["node", "worker/index.js"]


FROM dependencies AS ui_builder
COPY ui ./
ENV NODE_ENV=production
RUN npx next build
CMD ["node", "server/index.mjs"]

FROM dependencies AS ui
COPY --from=ui_builder /app/.next ./.next
CMD ["npx", "next", "start"]


FROM dependencies AS test
COPY tests ./tests
COPY queue ./queue
COPY worker ./worker
CMD ["npm", "test"]
