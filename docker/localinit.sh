#!/bin/sh

# this script will initialize a local MCM server deployment running in docker compose.
# We assume that the starting point is a clean docker compose environment started with:
# $> docker compose up
# We also assume that you have run:
# $> nvm use
# $> npm install

# run DB migrations and seeds
echo Running DB migrations.
npm run migrate

echo Seeding DB...
npm run seed

echo Creating hub CA...
curl --location 'http://mcm.localhost/api/hub/ca' \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
--data '{
  "CN": "dolore qui",
  "O": "id tempor labore sit ",
  "OU": "ea reprehenderit enim commodo",
  "C": "adipisicing exercitation deserunt esse",
  "ST": "sit labore",
  "L": "dolore ex"
}'