# Self-Hosting Deployment Guide

This guide covers setting up GuardLayer in production environments using Docker Compose, reverse proxies, and backup configurations.

---

## Hardware Requirements

- **Minimum**: 1 vCPU, 2GB RAM, 10GB SSD storage.
- **Recommended**: 2 vCPUs, 4GB RAM, 20GB SSD storage.

---

## Production Docker Compose Settings

In production, run the databases with durable volumes and configure automated restarts.

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: guardlayer-postgres
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: guardlayer
    ports:
      - "5432:5432"
    volumes:
      - postgres_production_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U $$POSTGRES_USER -d $$POSTGRES_DB"]
      interval: 10s
      retries: 5

  redis:
    image: redis:7-alpine
    container_name: guardlayer-redis
    restart: always
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
    ports:
      - "6379:6379"
    volumes:
      - redis_production_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "${REDIS_PASSWORD}", "ping"]
      interval: 10s
      retries: 5

volumes:
  postgres_production_data:
  redis_production_data:
```

---

## Environment Variables Reference

| Variable | Description | Default / Example | Required |
| :--- | :--- | :--- | :--- |
| `POSTGRES_HOST` | Host address of PostgreSQL server | `postgres` | Yes |
| `POSTGRES_PORT` | Port of PostgreSQL server | `5432` | Yes |
| `POSTGRES_USER` | Admin username for Postgres database | `guardlayer_admin` | Yes |
| `POSTGRES_PASSWORD`| Admin password for Postgres | `secure_change_me` | Yes |
| `POSTGRES_DB` | Target database name | `guardlayer` | Yes |
| `REDIS_HOST` | Host address of Redis server | `redis` | Yes |
| `REDIS_PORT` | Port of Redis server | `6379` | Yes |
| `REDIS_PASSWORD` | Password for Redis access control | `redis_secret_pass` | Yes |
| `JWT_SECRET` | Secret key for signing dashboard tokens | `high_entropy_random_string` | Yes |
| `PORT` | Listening port for the service | `8080` (api-gateway) | No |

---

## Database Backups and Restore

### Backup Postgres
Run this daily via cron to back up database contents:
```bash
docker exec -t guardlayer-postgres pg_dumpall -c -U guardlayer_admin > /backups/guardlayer_backup_$(date +%F).sql
```

### Restore Postgres
```bash
cat /backups/guardlayer_backup_2026-06-04.sql | docker exec -i guardlayer-postgres psql -U guardlayer_admin -d guardlayer
```

---

## Redis Persistence Configuration

To guarantee live alerts and analytics state do not clear on service restart, enable **AOF (Append Only File)** in `redis-server`:
```bash
redis-server --appendonly yes
```

---

## Reverse Proxy with Nginx & SSL

Deploy Nginx in front of `api-gateway` to terminate SSL certificates and protect endpoints.

```nginx
server {
    listen 80;
    server_name gateway.guardlayer.dev;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name gateway.guardlayer.dev;

    ssl_certificate /etc/letsencrypt/live/gateway.guardlayer.dev/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/gateway.guardlayer.dev/privkey.pem;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## Scaling & High Availability

1. **State Partitioning**: The API Gateway and processing nodes (`input-guard`, `output-guard`) are completely stateless. Scale them horizontally using a load balancer (e.g., AWS ALB or HAProxy).
2. **Redis Clustering**: Ensure Redis is set up in a primary-replica cluster configuration when running multiple active instances of the processing pipeline.
3. **Database Tuning**: Configure Postgres connections limits (`max_connections`) to handle scale loads. Use PgBouncer for connection pooling if running more than 5 gateway workers.
