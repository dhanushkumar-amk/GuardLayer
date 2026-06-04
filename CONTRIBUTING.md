# Contributing to GuardLayer

First off, thank you for taking the time to contribute! Contributions are what make the open-source community such an amazing place to learn, inspire, and create.

## Local Development Setup

GuardLayer is built as a set of lightweight microservices in TypeScript (Node.js/Express) and Python, orchestrated with Docker Compose.

### Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop/) and Docker Compose
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [NPM](https://www.npmjs.com/) (v10+ recommended)
- [Python](https://www.python.org/) (v3.10+ for custom guard developers)

### Setting Up Environment

1. Clone the repository:
   ```bash
   git clone https://github.com/dhanushkumar-amk/GuardLayer.git
   cd GuardLayer
   ```

2. Copy the sample environment configuration file:
   ```bash
   cp .env.example .env
   ```

3. Spin up the infrastructure dependencies (PostgreSQL and Redis):
   ```bash
   docker-compose up -d postgres redis
   ```

4. Install local dependencies for services and run them in development mode:
   ```bash
   # Example for audit-service
   cd services/audit-service
   npm install
   npm run dev
   ```

---

## Running Tests

We write unit and integration tests using [Jest](https://jestjs.io/) and [Supertest](https://github.com/ladydave/supertest).

To run test suites locally:

1. Ensure the PostgreSQL and Redis containers are healthy.
2. Navigate to the service directory and run:
   ```bash
   cd services/audit-service
   npm install
   npm run build
   npm test
   ```

---

## How to Add a New Guard

GuardLayer operates a pluggable guard pipeline split into **Input Guards** (pre-LLM) and **Output Guards** (post-LLM).

1. **Add Guard Logic**:
   - For Python guards (e.g., in `input-guard`), create a new class under `input-guard/src/guards/` implementing the `BaseGuard` interface.
   - For TypeScript guards, create a middleware or service check within the processing layer.

2. **Add Config Schema**:
   - Update the configuration validation schema in `config-service/src/schemas/` to include the toggle parameters (`enabled`, `threshold`) for the new guard.
   - Document the fields in `docs/configuration.md`.

3. **Register the Guard**:
   - Register the new guard in `api-gateway`'s orchestration logic so it fires at the correct sequence in the request/response pipeline.

---

## How to Add a New LLM Provider

LLM routing is managed by the proxy routing layers.

1. Navigate to the `llm-proxy` service (`services/llm-proxy`).
2. Add a provider client helper in `src/providers/` (e.g., `cohere.provider.ts`).
3. Conform to the standard completion request payload and translate the provider's response format back to the standard OpenAI-compatible JSON schema.
4. Export the provider in `src/providers/index.ts` and update the route selection logic.

---

## PR & Code Style Guidelines

- **TypeScript**: We use Standard ESLint configurations. Run `npm run lint` before committing.
- **Git Commits**: Use descriptive commit messages following the [Conventional Commits](https://www.conventionalcommits.org/) specification:
  - `feat: add mistral provider`
  - `fix: correct threshold logic in jailbreak guard`
  - `docs: update deployment guidelines`
- **Tests**: Every new feature, endpoint, or guard must be covered by comprehensive unit/integration test suites.
- **Review**: All pull requests require at least one approved review from core maintainers.
