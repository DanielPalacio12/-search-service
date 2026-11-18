FROM node:24-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine
WORKDIR /app
ENV NODE_ENV=production KAFKAJS_NO_PARTITIONER_WARNING=1
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/.next ./.next
COPY next.config.ts tsconfig.json ./
COPY src ./src
COPY scripts ./scripts
USER node
EXPOSE 3000
CMD ["npm", "run", "start:all"]
