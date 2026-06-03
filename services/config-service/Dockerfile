FROM node:18-alpine AS builder

WORKDIR /app

# Install build tools for native modules (bcrypt)
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm install

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:18-alpine

WORKDIR /app

# Install runtime dependencies only (production install)
RUN apk add --no-cache python3 make g++ gcc

COPY package*.json ./
RUN npm install --omit=dev && apk del python3 make g++ gcc

COPY --from=builder /app/dist ./dist

EXPOSE 3001

CMD ["node", "dist/index.js"]
