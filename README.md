# Connection Manager API

[![Release](https://github.com/modusbox/connection-manager-api/actions/workflows/releaseWorkflow.yml/badge.svg)](https://github.com/modusbox/connection-manager-api/actions/workflows/releaseWorkflow.yml)

Connection Manager API is a component of the Mojaloop ecosystem that allows an administrator to manage the network configuration and PKI information for the Hub and a set of DFSPs.

It provides a REST API, described using a [Swagger/OpenAPI document](./src/api/swagger.yaml).

The current version uses both [cfssl](https://github.com/modusintegration/cfssl) and [openssl](https://www.openssl.org/) as the PKI engines which issue and process CSRs and Certificates. The specific version of cfssl that MCM depends on is kept in the [Dockerfile](./Dockerfile) as the value of the `branch` argument ( as in `--branch=v1.3.4` ) and can also be specified as an environment variable ( see `CFSSL_VERSION` below ).

## Authentication

The Connection Manager API supports two types of authentication methods for different client types:

1. **Browser Clients (SPA)**: Cookie-based authentication with MySQL session store
2. **Machine Clients**: JWT/Bearer token authentication via Keycloak

Authentication is implemented using OpenID Connect (OIDC) with PKCE for enhanced security.

See [Authentication Documentation](docs/authentication.md) for details.

### OpenID Connect Authentication

The system uses OpenID Connect authentication, which is a provider-agnostic approach for authentication and authorization. Configure the following environment variables to enable OpenID Connect:

|Environment variable|Description|Default Value
:---|:---|:---
|OPENID_ENABLED|Enable OpenID Connect authentication|false
|OPENID_DISCOVERY_URL|OpenID Connect discovery URL|
|OPENID_CLIENT_ID|Client ID for OpenID authentication|
|OPENID_CLIENT_SECRET|Client secret for OpenID authentication|
|OPENID_REDIRECT_URI|Redirect URI for OpenID authentication|http://mcm.localhost/api/auth/callback
|OPENID_JWT_COOKIE_NAME|Cookie name for storing the JWT token|MCM-API_ACCESS_TOKEN
|OPENID_EVERYONE_ROLE|Role assigned to all authenticated users|everyone
|OPENID_MTA_ROLE|DFSP Admin role mapping for OpenID|mta
|OPENID_PTA_ROLE|HUB Admin role mapping for OpenID|pta

#### Password Reset

For OpenID Connect authentication, password reset functionality is handled by the identity provider's own interface rather than through the Connection Manager API. This approach ensures compatibility with any standards-compliant OpenID provider.

## Running the server locally

To run the server with all the defaults and no security, the simplest way is to run:

```bash
P12_PASS_PHRASE="choose your own password" npm start
```

The default config requires a `mysql` db running on the default port.

Once running, you can access the [Swagger UI interface](http://mcm.localhost/api/docs)

## Running the server + db + web UI locally while developing

To run them together, you can use the following setup:

- Clone this repo
- Use the `docker-compose` config in this repo to run a mysql DB, Vault, Keycloak, the WebUI and the API server

```bash
mkdir mojaloop
cd mojaloop
git clone https://github.com/modusbox/connection-manager-api
cd connection-manager-api
docker compose --profile functional --profile dev up -d --wait
```

### Accessing Services

The stack includes Traefik for local DNS routing. All services are accessible via `*.mcm.localhost` domains:

| Service | URL | Description |
|---------|-----|-------------|
| MCM UI | http://mcm.localhost | Web UI |
| MCM API | http://mcm.localhost/api | API Server |
| Vault UI | http://vault.mcm.localhost | Vault UI |
| Keycloak | http://keycloak.mcm.localhost | Keycloak Admin Console |
| Mailpit | http://mailpit.mcm.localhost | Email Testing UI |
| Traefik Dashboard | http://localhost:8090 | Traefik Dashboard |

### Customizing Configuration

You can customize the domain and ports by creating a `.env` file:

```bash
# .env
COMPOSE_DOMAIN=myapp.localhost
TRAEFIK_HTTP_PORT=8080
DATABASE_PORT=3307
```

This will change all services to use `*.myapp.localhost`, expose Traefik on port 8080, and MySQL on port 3307.

**Note**: If port 80 is already in use, set `TRAEFIK_HTTP_PORT` to an available port (e.g., 8080). Access services at `http://ui.myapp.localhost:8080`.

### Running Multiple Instances

To run multiple instances simultaneously:

```bash
# Instance 1 (default ports)
COMPOSE_PROJECT_NAME=mcm1 COMPOSE_DOMAIN=mcm1.localhost docker compose up -d

# Instance 2 (different MySQL port)
COMPOSE_PROJECT_NAME=mcm2 COMPOSE_DOMAIN=mcm2.localhost DATABASE_PORT=3307 docker compose up -d
```

Access via:
- Instance 1: `http://api.mcm1.localhost`, MySQL at `localhost:3306`
- Instance 2: `http://api.mcm2.localhost`, MySQL at `localhost:3307`

See [.env-example](./.env-example) for all available configuration options.

## Configuration

|Environment variable|Description|Default Value
:---|:---|:---
| **MCM API server configuration**
|PORT|MCM API HTTP port|3001
|CLIENT_URL|MCM UI URL|http://mcm.localhost
|SWITCH_ID|Switch identifier (required)|
|SWITCH_FQDN|Switch FQDN|switch.example.com
| **Docker Compose configuration**
|COMPOSE_DOMAIN|Domain for Traefik routing (docker-compose only)|mcm.localhost
| **Authentication features**
|OPENID_ENABLED|Enable OpenID Connect authentication|false
|OPENID_ENABLE_2FA|Enable two-factor authentication|false
|OPENID_ALLOW_INSECURE|Allow insecure HTTPS for development|false
|OPENID_DISCOVERY_URL|OpenID Connect discovery URL|
|OPENID_CLIENT_ID|Client ID for OpenID authentication|
|OPENID_CLIENT_SECRET|Client secret for OpenID authentication|
|LOGIN_CALLBACK|OAuth callback URL|http://mcm.localhost/api/auth/callback
|OPENID_AUDIENCE|JWT audience claim|connection-manager-api
|OPENID_JWT_COOKIE_NAME|Cookie name for JWT token|MCM-API_ACCESS_TOKEN
| **OpenID Connect groups/roles**
|OPENID_APPLICATION_GROUP|Application group name|Application
|OPENID_EVERYONE_GROUP|Authenticated users group|everyone
|OPENID_MTA_GROUP|DFSP Admin group|MTA
|OPENID_PTA_GROUP|HUB Admin group|PTA
|OPENID_DFSP_GROUP|DFSP group|DFSP
| **Session configuration**
|SESSION_STORE_SECRET|Secret for encrypting session data|connection_manager_session_secret
|SESSION_COOKIE_SAME_SITE_STRICT|Use strict SameSite cookie setting|true
| **Database configuration**
|DATABASE_HOST|MySQL host|localhost
|DATABASE_PORT|MySQL port (also used for docker-compose host mapping)|3306
|DATABASE_USER|MySQL user|mcm
|DATABASE_PASSWORD|MySQL password|mcm
|DATABASE_SCHEMA|MySQL schema|mcm
|DATABASE_SSL_ENABLED|Enable SSL for MySQL connection|false
|DATABASE_SSL_VERIFY|Verify server certificate when using SSL|false
|DATABASE_SSL_CA|CA certificate string for MySQL SSL|''
|DB_RETRIES|Times the initial connection to the DB will be retried|10
|DB_CONNECTION_RETRY_WAIT_MILLISECONDS|Pause between retries|1000
|DB_POOL_SIZE_MAX|Maximum database connection pool size|10
| **Vault PKI configuration**
|VAULT_ENDPOINT|Vault server endpoint|http://127.0.0.1:8233
|VAULT_AUTH_METHOD|Vault auth method (K8S or APP_ROLE)|APP_ROLE (required)
|VAULT_ROLE_ID_FILE|Path to Vault role ID file|docker/vault/tmp/role-id
|VAULT_ROLE_SECRET_ID_FILE|Path to Vault secret ID file|docker/vault/tmp/secret-id
|VAULT_PKI_SERVER_ROLE|Vault PKI role for server certs|(required)
|VAULT_PKI_CLIENT_ROLE|Vault PKI role for client certs|(required)
|VAULT_SIGN_EXPIRY_HOURS|Certificate signing expiry in hours|43800
|PRIVATE_KEY_LENGTH|RSA key length for certificates|4096
|PRIVATE_KEY_ALGORITHM|Key algorithm|rsa
|INTERNAL_CA_TTL|Internal CA certificate TTL|8760h
|VAULT_MOUNT_PKI|Vault PKI mount path|pki
|VAULT_MOUNT_INTERMEDIATE_PKI|Vault intermediate PKI mount path|pki_int
|VAULT_MOUNT_KV|Vault KV mount path|secrets
| **Certificate CSR parameters**
|CLIENT_CSR_PARAMETERS|Path to client CSR parameters JSON file|
|SERVER_CSR_PARAMETERS|Path to server CSR parameters JSON file|
|CA_CSR_PARAMETERS|Path to CA CSR parameters JSON file|
| **Support for self-signed certificates**
|EXTRA_CERTIFICATE_CHAIN_FILE_NAME|Extra trusted server certificate chain file name|
|EXTRA_ROOT_CERT_FILE_NAME|Extra trusted server root certificate file name|
| **Keycloak Integration**
|KEYCLOAK_ENABLED|Enable Keycloak integration for DFSP account creation|false
|KEYCLOAK_BASE_URL|Base URL of the Keycloak server|http://keycloak.mcm.localhost
|KEYCLOAK_DISCOVERY_URL|OpenID Connect discovery URL for Keycloak|http://keycloak.mcm.localhost/realms/dfsps/.well-known/openid-configuration
|KEYCLOAK_ADMIN_CLIENT_ID|Client ID for Keycloak admin operations|connection-manager-client
|KEYCLOAK_ADMIN_CLIENT_SECRET|Client secret for Keycloak admin operations|
|KEYCLOAK_DFSPS_REALM|Keycloak realm for DFSP accounts|dfsps
|KEYCLOAK_AUTO_CREATE_ACCOUNTS|Automatically create Keycloak accounts when DFSPs are created|false
| **Other features**
|DFSP_WATCHER_ENABLED|Enable DFSP watcher service|false

## Testing

- Unit testing:
  - run `npm run backend:start` as a pre-requisite to `npm test`
  - run `npm test`. The tests are implemented using `jest`. If you need some test certificates, see the [test resources readme](./test/resources/README.md)
- Smoke testing ( `zsh` script ): run the [cmd-line-tester.sh](./scripts/cmd-line-tester.sh) script from a tmp directory
- swagger: see "running the server" below

### Functional Tests

Refer to [README](./test/functional-tests/README.md).

## Style

[![js-semistandard-style](https://cdn.rawgit.com/flet/semistandard/master/badge.svg)](https://github.com/Flet/semistandard)
 ( + dangling commas on Objects )

## Building a docker image

The server includes a [Dockerfile](./Dockerfile).

There's a set of scripts to build the image and tag it for a local minikube or other environments. Take a look at
[./docker-build.sh](./docker-build.sh)
