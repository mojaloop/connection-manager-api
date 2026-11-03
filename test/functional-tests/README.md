# Functional Tests

## Test Infrastructure

Functional tests run against a full stack environment managed by Docker Compose. The infrastructure includes:

| Service       | URL                          | Description                        |
|---------------|------------------------------|------------------------------------|
| MCM API       | http://mcm.localhost/api     | Connection Manager API             |
| MCM UI        | http://mcm.localhost         | Web UI (dev/full profiles only)    |
| Vault         | http://vault.mcm.localhost   | PKI and secrets management         |
| MySQL         | localhost:3306               | Database                           |
| Traefik       | localhost:8090               | Reverse proxy dashboard            |

### Test Helpers

- `util/api-helper.ts` - HTTP client that sends every request as the caller it is given

## Configuration

Configuration is managed via `test-env-setup.js` (loaded automatically by Jest):

| Environment Variable  | Description                          | Default                                 |
| --------------------- | ------------------------------------ | --------------------------------------- |
| APP_ENDPOINT          | Endpoint for MCM API                 | http://mcm.localhost/api                |

## Executing Tests

### Using CI profile (containerized API)

```bash
# From repo root
docker compose --profile ci up -d --wait
cd test/functional-tests
npm install
npm test
```

### Using dev profile (local API)

```bash
# Terminal 1: Start infrastructure and API
docker compose --profile dev up -d --wait
npm run migrate
npm start

# Terminal 2: Run tests
cd test/functional-tests
npm install
npm test
```

## Writing Tests

Tests are located in `tests/` directory. Each test file should:

1. Use `ApiHelper` for API requests, made as a caller from `@mojaloop/authz/testing`

Example structure:
```typescript
import { caller } from '@mojaloop/authz/testing';
import { ApiHelper, MethodEnum } from '../util/api-helper';
import Config from '../util/config';

describe('Feature Tests', () => {
  const apiHelper = new ApiHelper(caller().reachingAll('dfsps').request);

  test('should do something', async () => {
    const response = await apiHelper.sendRequest({
      method: MethodEnum.GET,
      url: `${Config.mcmEndpoint}/endpoint`,
    });
    expect(response.status).toBe(200);
  });
});
```
