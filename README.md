# GuardLayer

An open-source, self-hostable LLM Security Gateway.

## Getting Started

To spin up the Postgres database and Redis instance:

1. **Start the core services** using Docker Compose:
   ```bash
   docker compose up -d
   ```

2. **Verify status** to ensure that both services are running and healthy:
   ```bash
   docker compose ps
   ```
