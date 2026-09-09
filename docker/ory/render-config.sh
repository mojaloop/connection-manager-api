#!/bin/sh
# Render the Ory config templates, substituting the deployment domain into the
# mounted config files. The access rules and the permission model are generated
# from the API document by the authzgen step into /rendered/authz.
set -e

apk add --no-cache gettext >/dev/null

cd /templates
find . -type f ! -name 'render-config.sh' | while read -r f; do
  dest="/rendered/${f#./}"
  mkdir -p "$(dirname "$dest")"
  envsubst '${COMPOSE_DOMAIN}' < "$f" > "$dest"
done

echo "Rendered Ory config for domain: ${COMPOSE_DOMAIN}"
