# Functional Tests

## Test Infrastructure

Functional tests run against a full stack environment managed by Docker Compose. The infrastructure includes:

| Service       | URL                          | Description                        |
|---------------|------------------------------|------------------------------------|
| MCM API       | http://mcm.localhost/api     | Connection Manager API             |
| MCM UI        | http://mcm.localhost         | Web UI (dev/full profiles only)    |
| Keycloak      | http://keycloak.mcm.localhost| Identity provider                  |
| Mailpit       | http://mailpit.mcm.localhost | Email testing (captures all emails)|
| Vault         | http://vault.mcm.localhost   | PKI and secrets management         |
| MySQL         | localhost:3306               | Database                           |
| Traefik       | localhost:8090               | Reverse proxy dashboard            |

### Test Helpers

- `util/api-helper.ts` - HTTP client with OAuth support (cookie and client credentials)
- `util/keycloak-helper.ts` - Keycloak interactions (password setup flow)
- `util/mailpit-helper.ts` - Email retrieval and parsing

## Configuration

Configuration is managed via `test-env-setup.js` (loaded automatically by Jest):

| Environment Variable  | Description                  | Default                      |
| --------------------- | ---------------------------- | ---------------------------- |
| APP_ENDPOINT          | Endpoint for MCM API         | http://mcm.localhost/api     |
| APP_OAUTH_USERNAME    | OAuth username for login     | admin                        |
| APP_OAUTH_PASSWORD    | OAuth password for login     | admin                        |
| MAILPIT_ENDPOINT      | Endpoint for Mailpit service | http://mailpit.mcm.localhost |

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

1. Use `ApiHelper` for API requests with authentication
2. Use `MailpitHelper` if testing email flows
3. Use `KeycloakHelper` if testing user onboarding flows

Example structure:
```typescript
import { ApiHelper, MethodEnum } from '../util/api-helper';
import Config from '../util/config';

describe('Feature Tests', () => {
  const apiHelper = new ApiHelper({
    login: {
      username: Config.username,
      password: Config.password,
      baseUrl: Config.mcmEndpoint
    }
  });

  test('should do something', async () => {
    const response = await apiHelper.sendRequest({
      method: MethodEnum.GET,
      url: `${Config.mcmEndpoint}/endpoint`,
    });
    expect(response.status).toBe(200);
  });
});
```
