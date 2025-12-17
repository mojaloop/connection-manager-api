#!/bin/sh
set -e

VAULT_ADDR="${VAULT_ADDR:-http://mcm-vault:8233}"

# Helper function for Vault API calls
vault_api() {
    local method="$1"
    local path="$2"
    local data="$3"

    if [ -n "$data" ]; then
        curl -s -X "$method" -H "X-Vault-Token: $VAULT_TOKEN" -d "$data" "$VAULT_ADDR$path"
    else
        curl -s -X "$method" -H "X-Vault-Token: $VAULT_TOKEN" "$VAULT_ADDR$path"
    fi
}

# Check if vault is already initialized
HEALTH=$(curl -s "$VAULT_ADDR/v1/sys/health" || echo '{}')
INITIALIZED=$(echo "$HEALTH" | jq -r '.initialized // false')

if [ "$INITIALIZED" = "true" ]; then
    echo "Vault is already initialized"

    # Auto-unseal with stored keys if they exist
    if [ -f /vault/data/unseal-key ]; then
        echo "Unsealing vault..."
        UNSEAL_KEY=$(cat /vault/data/unseal-key)
        curl -s -X PUT -d "{\"key\": \"$UNSEAL_KEY\"}" "$VAULT_ADDR/v1/sys/unseal" > /dev/null
    fi

    # Set root token
    if [ -f /vault/data/root-token ]; then
        VAULT_TOKEN=$(cat /vault/data/root-token)
    fi

    # Check if already configured
    AUTH_LIST=$(vault_api GET /v1/sys/auth || echo '{}')
    if echo "$AUTH_LIST" | jq -e '.["approle/"]' > /dev/null 2>&1; then
        echo "Vault is already configured"
        exit 0
    fi
else
    echo "Initializing vault..."
    INIT_RESPONSE=$(curl -s -X PUT -d '{"secret_shares": 1, "secret_threshold": 1}' "$VAULT_ADDR/v1/sys/init")

    # Extract and save keys
    echo "$INIT_RESPONSE" | jq -r '.keys_base64[0]' > /vault/data/unseal-key
    echo "$INIT_RESPONSE" | jq -r '.root_token' > /vault/data/root-token

    # Unseal vault
    echo "Unsealing vault..."
    UNSEAL_KEY=$(cat /vault/data/unseal-key)
    curl -s -X PUT -d "{\"key\": \"$UNSEAL_KEY\"}" "$VAULT_ADDR/v1/sys/unseal" > /dev/null

    VAULT_TOKEN=$(cat /vault/data/root-token)
fi

echo "Configuring vault..."

# Enable AppRole auth
vault_api POST /v1/sys/auth/approle '{"type": "approle"}' > /dev/null

# Configure AppRole
vault_api POST /v1/auth/approle/role/my-role '{"secret_id_ttl": "1440h", "token_ttl": "1440h", "token_max_ttl": "1440h"}' > /dev/null

# Get role-id and secret-id
vault_api GET /v1/auth/approle/role/my-role/role-id | jq -r '.data.role_id' > /vault/creds/role-id
vault_api POST /v1/auth/approle/role/my-role/secret-id | jq -r '.data.secret_id' > /vault/creds/secret-id

# Enable secrets engines
vault_api POST /v1/sys/mounts/pki '{"type": "pki"}' > /dev/null
vault_api POST /v1/sys/mounts/secrets '{"type": "kv"}' > /dev/null
vault_api POST /v1/sys/mounts/pki/tune '{"max_lease_ttl": "97600h"}' > /dev/null

# Configure PKI
vault_api POST /v1/pki/config/urls '{"issuing_certificates": "http://127.0.0.1:8233/v1/pki/ca", "crl_distribution_points": "http://127.0.0.1:8233/v1/pki/crl"}' > /dev/null
vault_api POST /v1/pki/roles/example.com '{"allowed_domains": "example.com", "allow_subdomains": true, "allow_any_name": true, "allow_localhost": true, "enforce_hostnames": false, "max_ttl": "4000h", "key_type": "rsa"}' > /dev/null

# Create policy
POLICY=$(cat <<'EOF'
path "secrets/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
path "kv/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
path "pki/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
path "pki_int/*" {
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}
EOF
)
POLICY_JSON=$(jq -n --arg policy "$POLICY" '{policy: $policy}')
vault_api PUT /v1/sys/policy/test-policy "$POLICY_JSON" > /dev/null

# Update AppRole with policy
vault_api POST /v1/auth/approle/role/my-role '{"policies": ["test-policy"], "token_ttl": "1440h"}' > /dev/null

# Enable and configure pki_int
vault_api POST /v1/sys/mounts/pki_int '{"type": "pki"}' > /dev/null
vault_api POST /v1/sys/mounts/pki_int/tune '{"max_lease_ttl": "87600h"}' > /dev/null
vault_api POST /v1/pki_int/roles/example.com '{"allowed_domains": "example.com", "allow_subdomains": true, "allow_any_name": true, "allow_localhost": true, "enforce_hostnames": false, "max_ttl": "4000h", "ttl": "4000h", "key_type": "rsa"}' > /dev/null

echo "Vault configuration complete!"
