#!/bin/bash
set -eo pipefail

if [ ! -f .env ]; then
  cp ./test/.env-func .env
fi

npm ci

if ! npm run backend:start; then
  echo "=== backend:start failed; dumping container status and logs ==="
  docker compose --profile ci ps -a
  docker compose --profile ci logs --no-color --timestamps
  exit 1
fi

cd ./test/functional-tests

echo "Installing dependencies"
npm i

echo "Executing Functional Tests for $GIT_TAG"
npm test
