# Functional Tests

## Configuration

Configuration is managed via `test-env-setup.js` (loaded automatically by Jest):

| Environment Variable  | Description                  | Default                      |
| --------------------- | ---------------------------- | ---------------------------- |
| APP_ENDPOINT          | Endpoint for MCM API         | http://mcm.localhost/api     |
| APP_OAUTH_USERNAME    | OAuth username for login     | admin                        |
| APP_OAUTH_PASSWORD    | OAuth password for login     | admin                        |
| MAILPIT_ENDPOINT      | Endpoint for Mailpit service | http://mailpit.mcm.localhost |

## Executing Tests

1. Start the MCM API backend services

    ```bash
    npm run backend:start
    ```

2. Run Functional Tests

    ```bash
    cd ./test/functional-tests
    npm i
    npm test
    ```
