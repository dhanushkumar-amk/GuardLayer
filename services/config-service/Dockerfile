FROM node:18-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install --legacy-peer-deps

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --omit=dev --legacy-peer-deps

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/src/index.js"]
