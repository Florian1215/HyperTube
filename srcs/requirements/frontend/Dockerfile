##### Base build
FROM node:22-alpine AS base

WORKDIR /app

COPY package*.json ./

RUN npm install

RUN npm ci


##### Development build
FROM base AS development

ENV NODE_ENV=development

EXPOSE 4200

CMD ["npm", "run", "dev"]


##### Production build
FROM base AS production-build

COPY . .

ENV NODE_ENV=production

RUN npm run build


##### Production runtime
FROM node:22-alpine AS production

WORKDIR /app

ENV NODE_ENV=production

COPY --from=production-build /app/.next ./.next
COPY --from=production-build /app/public ./public
COPY --from=production-build /app/package*.json ./
COPY --from=production-build /app/next.config.ts ./

RUN npm ci --omit=dev

EXPOSE 4200

CMD ["npm", "start"]
