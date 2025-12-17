# Test scripts

This folder provides a set of test scripts and resources that can be used to validate an MCM install.

## smoke-test

The main test script is at `smoke-clean-tester.sh`.

You can build a docker image to avoid installing dependencies and then it can be run as:

```bash
docker build --network="host" -t mcm-smoke-test .
docker run --network="host" -e SERVER='http://mcm.localhost/api' -e hubuser=__CHANGE_ME__ -e hubpass=__CHANGE_ME__ mcm-smoke-test
```

### OUTPUT

The script must finish with a message like this `SUCCESS!! :D`

