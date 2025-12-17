# Contributing to Connection Manager API

## Prerequisites

- Node.js 22.x (see `.nvmrc`)
- Docker and Docker Compose
- Git

## Getting Started

### Clone and Install

```bash
git clone https://github.com/mojaloop/connection-manager-api
cd connection-manager-api
npm install
```

### Environment Setup

Copy the example environment file:

```bash
cp .env-example .env
```

## Development Workflow

### Running Locally (dev profile)

The `dev` profile starts infrastructure (DB, Keycloak, Vault, Mailpit, Traefik) and UI, while routing API traffic to your local machine.

```bash
# 1. Start infrastructure
docker compose --profile dev up -d --wait

# 2. Run migrations
npm run migrate

# 3. Start API locally
npm start
```

Access services:
- API: http://mcm.localhost/api
- UI: http://mcm.localhost
- Keycloak: http://keycloak.mcm.localhost
- Mailpit: http://mailpit.mcm.localhost
- Vault: http://vault.mcm.localhost

### Making Changes

1. Create a feature branch from `main`
2. Make your changes
3. Run linting: `npm run lint`
4. Run tests (see below)
5. Commit and push

### Code Style

This project uses ESLint with semistandard style. Run linting:

```bash
npm run lint        # Check for issues
npm run lint:fix    # Auto-fix issues
```

## Testing

See [test/functional-tests/README.md](./test/functional-tests/README.md) for detailed test infrastructure documentation.

### Unit Tests

```bash
npm run test:unit
```

### Integration Tests

Requires backend services running:

```bash
npm run backend:start   # Start services with ci profile
npm run test:int
```

### Functional Tests

Full end-to-end tests against the complete stack:

```bash
# Option 1: Using CI profile (containerized API)
docker compose --profile ci up -d --wait
cd test/functional-tests
npm install
npm test

# Option 2: Using dev profile (local API)
docker compose --profile dev up -d --wait
npm run migrate
npm start  # in one terminal
cd test/functional-tests && npm test  # in another terminal
```

### Running All Tests

```bash
npm test
```

## Docker Compose Profiles

| Profile | API                  | UI        | Use case              |
|---------|----------------------|-----------|-----------------------|
| `ci`    | container (local)    | -         | CI/CD, running tests  |
| `dev`   | proxy -> host        | container | Local API development |
| `full`  | container (official) | container | Full environment      |

## Submitting Changes

### Branch Naming

- `feat/description` - New features
- `fix/description` - Bug fixes
- `chore/description` - Maintenance tasks
- `docs/description` - Documentation updates

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add user authentication
fix: resolve database connection issue
chore: update dependencies
docs: improve API documentation
```

### Pull Request Process

1. Ensure all tests pass
2. Update documentation if needed
3. Request review from maintainers

## Running Multiple Instances

When working on multiple fixes or comparing versions, you can run multiple MCM instances with different domains and ports:

```bash
# Instance 1: your feature branch
cd ~/mcm-feature
COMPOSE_PROJECT_NAME=mcm-feature COMPOSE_DOMAIN=feature.localhost docker compose --profile dev up -d --wait
npm run migrate && npm start

# Instance 2: main branch for comparison (different ports)
cd ~/mcm-main
COMPOSE_PROJECT_NAME=mcm-main COMPOSE_DOMAIN=main.localhost TRAEFIK_HTTP_PORT=8080 DATABASE_PORT=3307 docker compose --profile full up -d --wait
```

Access:
- Feature branch: http://feature.localhost (API on host)
- Main branch: http://main.localhost:8080 (containerized API)

## Troubleshooting

### Port Conflicts

If port 80 is in use, set a different port in `.env`:

```bash
TRAEFIK_HTTP_PORT=8080
```

Then access services at `http://mcm.localhost:8080`.

### Database Issues

Reset the database:

```bash
docker compose down -v
docker compose --profile dev up -d --wait
npm run migrate
```

### Vault Credentials

If Vault credentials are lost, reset everything:

```bash
docker compose down -v
rm -rf docker/vault/tmp/*
docker compose --profile dev up -d --wait
```
