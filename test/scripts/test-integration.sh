#!/bin/bash
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

cd "${PROJECT_ROOT}"

echo "Running in CI environment..."
npm run backend:start

# Run coverage tests with NYC
INTEGRATION_TEST_EXIT_CODE=0
npm run test:int || INTEGRATION_TEST_EXIT_CODE="$?"

echo "==> integration tests with exited with code: $INTEGRATION_TEST_EXIT_CODE"
npm run backend:stop
exit $INTEGRATION_TEST_EXIT_CODE
