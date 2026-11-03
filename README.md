# Connection Manager API

[![Release](https://github.com/mojaloop/connection-manager-api/actions/workflows/releaseWorkflow.yml/badge.svg)](https://github.com/mojaloop/connection-manager-api/actions/workflows/releaseWorkflow.yml)

Connection Manager API is a component of the Mojaloop ecosystem that allows an administrator to manage the network configuration and PKI information for the Hub and a set of DFSPs.

It provides a REST API, described using an [OpenAPI document](./src/api/openapi.yaml).

The current version uses both [cfssl](https://github.com/modusintegration/cfssl) and [openssl](https://www.openssl.org/) as the PKI engines which issue and process CSRs and Certificates. The specific version of cfssl that MCM depends on is kept in the [Dockerfile](./Dockerfile) as the value of the `branch` argument ( as in `--branch=v1.3.4` ) and can also be specified as an environment variable ( see `CFSSL_VERSION` below ).

## Authentication and authorization

Requests reach this service already authenticated and authorized by the gateway in front of it. The service's OpenAPI document is its whole authorization surface; see [authz.md](./authz.md).

With the IAM enabled (`IAM_ENABLED=true`), onboarding a DFSP records it with the IAM and creates the principals that operate it there, through the IAM's internal API:

- a machine client whose id is the DFSP id, assigned `IAM_DFSP_CLIENT_ROLE` over the DFSP. `POST /dfsps/{dfspId}/credentials` gives it a fresh secret (creating the client when absent) and keeps the result in Vault for `GET`;
- the DFSP admin's account, found by email or created and invited by the IAM, assigned `IAM_DFSP_ADMIN_ROLE` over the DFSP.

Deleting the DFSP removes it and every role over it from the IAM, retires its machine client, and retires each person left holding no role.

With the IAM disabled the service creates nothing in any identity system, and `POST /dfsps/{dfspId}/credentials` answers 501.

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
- Use the `docker-compose` config in this repo to run a MySQL DB, Vault, the IAM simulator, the WebUI and the API server

```bash
mkdir mojaloop
cd mojaloop
git clone https://github.com/mojaloop/connection-manager-api
cd connection-manager-api
docker compose --profile full up -d --wait
```

### Docker Compose Profiles

| Profile | API                  | UI        | Use case              |
|---------|----------------------|-----------|-----------------------|
| `ci`    | container (local)    | -         | CI/CD, running tests  |
| `dev`   | proxy → host         | container | Local API development |
| `full`  | container (local)    | container | Full environment      |

```bash
# CI/CD (builds local image, runs tests)
docker compose --profile ci up -d --wait

# Local development (run API on host, UI in container)
docker compose --profile dev up -d --wait
npm start  # run API locally

# Full environment
docker compose --profile full up -d --wait
```

### Accessing Services

The stack includes Traefik for local DNS routing. All services are accessible via `*.mcm.localhost` domains:

| Service | URL | Description |
|---------|-----|-------------|
| MCM UI | http://mcm.localhost | Web UI |
| MCM API | http://mcm.localhost/api | API Server |
| Vault UI | http://vault.mcm.localhost | Vault UI |
| Traefik Dashboard | http://localhost:8090 | Traefik Dashboard |

Build the UI's image once with `docker build -t mojaloop/connection-manager-ui:local ../connection-manager-ui`.

### Customizing Configuration

You can customize the domain and ports by creating a `.env` file:

```bash
# .env
COMPOSE_DOMAIN=myapp.localhost
TRAEFIK_HTTP_PORT=8080
DATABASE_PORT=3307
```

This will change all services to use `*.myapp.localhost`, expose Traefik on port 8080, and MySQL on port 3307.

**Note**: If port 80 is already in use, set `TRAEFIK_HTTP_PORT` to an available port (e.g., 8080). Access services at `http://myapp.localhost:8080`.

### Running Multiple Instances

To run multiple instances simultaneously:

```bash
# Instance 1 (default ports)
COMPOSE_PROJECT_NAME=mcm1 COMPOSE_DOMAIN=mcm1.localhost docker compose --profile full up -d

# Instance 2 (different ports)
COMPOSE_PROJECT_NAME=mcm2 COMPOSE_DOMAIN=mcm2.localhost TRAEFIK_HTTP_PORT=8080 DATABASE_PORT=3307 docker compose --profile full up -d
```

Access via:
- Instance 1: http://mcm1.localhost, MySQL at `localhost:3306`
- Instance 2: http://mcm2.localhost:8080, MySQL at `localhost:3307`

See [.env-example](./.env-example) for all available configuration options.

## Configuration

|Environment variable|Description|Default Value
:---|:---|:---
| **MCM API server configuration**
|PORT|MCM API HTTP port|3001
|SWITCH_ID|Switch identifier (required)|
|SWITCH_FQDN|Switch FQDN|switch.example.com
| **Docker Compose configuration**
|COMPOSE_DOMAIN|Domain for Traefik routing (docker-compose only)|mcm.localhost
| **IAM integration**
|IAM_ENABLED|Record DFSPs with the IAM and create their principals there; off, nothing IAM-related happens|false
|IAM_AUTO_CREATE_ACCOUNTS|Create and assign a new DFSP's machine client and admin account when it is onboarded|true
|IAM_PROVISIONING_URL|The IAM's internal API, reached by network rule, no credentials|http://iam-provisioning.ory.svc.cluster.local
|IAM_DFSP_RESOURCE_NAME|The resource name DFSPs are recorded under|participant
|IAM_DFSP_ADMIN_ROLE|Role the DFSP admin is assigned over the DFSP; empty assigns none|
|IAM_DFSP_CLIENT_ROLE|Role the DFSP machine client is assigned over the DFSP; empty assigns none|
|IAM_DFSP_CLIENT_AUDIENCE|Token audience of the DFSP machine client|connection-manager-api
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
| **Other features**
|DFSP_WATCHER_ENABLED|Enable DFSP watcher service|false

## Testing

- Unit and integration testing:
  - run `npm run backend:start` as a pre-requisite to `npm test`
  - run `npm test`. The tests are implemented using `jest`. If you need some test certificates, see the [test resources readme](./test/resources/README.md)
  - the IAM is the IAM's own simulator (`@mojaloop/authz-sim`), run in a process of its own with this service's API document and the deployment in [test/iam/objects.yaml](./test/iam/objects.yaml); tests read back what the service did only through the IAM's public API and token endpoint
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
