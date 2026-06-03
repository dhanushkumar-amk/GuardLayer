FROM node:18-alpine

WORKDIR /app

COPY package*.json tsconfig.json ./
RUN npm install

COPY . .

ENV GATEWAY_URL=http://api-gateway:8080
ENV CONFIG_URL=http://config-service:3001
ENV AUDIT_URL=http://audit-service:8004
ENV INPUT_GUARD_URL=http://input-guard:8001
ENV OUTPUT_GUARD_URL=http://output-guard:8002
ENV LLM_PROXY_URL=http://llm-proxy:8003

ENV POSTGRES_HOST=postgres
ENV POSTGRES_PORT=5432
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

CMD ["npm", "test"]
