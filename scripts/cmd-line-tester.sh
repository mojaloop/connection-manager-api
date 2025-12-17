#!/bin/zsh

# SETUP
export SERVER=${SERVER:-"mcm.localhost"}
export TMPDIR=${TMPDIR:-/tmp}
echo TMPDIR:$TMPDIR
cd $TMPDIR

export ENV_NAME="DEMO_ENV_1"

echo "\nUsing server: " $SERVER
echo "\nUsing environment named: " $ENV_NAME

echo "\nCreate an Environment"

export FILENAME=create_env_output.json

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "name": "'$ENV_NAME'",
  "defaultDN": {
    "CN": "tes1.centralhub.modusbox.live",
    "O": "Modusbox",
    "OU": "PKI"
  }
}' -o $FILENAME 'http://'$SERVER'/api/environments' 

if [ $? -ne 0 ]; then
    cat $FILENAME
    echo "error. Is the server running and reachable?"
    cd - && exit 
fi

export TSP_ENV_ID=`jq '.id' < $FILENAME`

echo "\nTSP_ENV_ID: " $TSP_ENV_ID

echo "\nGet all the env info"
curl -X GET --header 'Accept: application/json' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID

echo "\nCreate an embedded Hub CA for the environment ( since we are not yet integrated with an external CA ) - can take some seconds"

export FILENAME=env_ca.json

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '
{
  "default": {
    "expiry": "43800h",
    "usages": ["signing", "key encipherment", "client auth"],
    "signature_algorithm": "SHA256withRSA"
  },
  "csr": {
    "hosts": ["hub1.test.modusbox.com","hub2.test.modusbox.com","163.10.5.24","163.10.5.22"],
    "key": {
      "algo": "rsa",
      "size": 4096
    },
    "names": [
      {
        "CN": "Mojaloop PKI",
        "O": "Mojaloop",
        "OU": "PKI"
      }
    ]
  }
}
  ' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/cas' | tee $FILENAME

jq -r '.certificate' < $FILENAME > hub_ca.cert

echo "\nCA certificate:"

openssl x509 -in hub_ca.cert -nameopt multiline -text -noout

# FIXME it should have 
#                CA:TRUE
#                 Certificate Sign, CRL Sign


echo "\nGet all the envs info"
curl -X GET --header 'Accept: application/json' 'http://'$SERVER'/api/environments'

# Create a DFSP ( DFSP 1 )

export DFSP_NAME="DFSP Alice"
export DFSP_ID=$DFSP_NAME

echo "\nDFSP_ID: " $DFSP_ID " DFSP_NAME: " $DFSP_NAME

export FILENAME=create_dfsp_output.json

echo "\nCreating DFSP1"

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "dfspId": "'${DFSP_NAME}'",
  "name": "'${DFSP_NAME}'"
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps' | tee $FILENAME 

export TSP_DFSP_ID=`cat $FILENAME | jq -r '.id' | sed 's/ /%20/g'`

echo "\nTSP_DFSP_ID: " $TSP_DFSP_ID

# Create a DFSP ( DFSP 2 )

export DFSP_NAME="DFSP Bob"
export DFSP_ID=$DFSP_NAME

echo "\nDFSP_ID: " $DFSP_ID " DFSP_NAME: " $DFSP_NAME

export FILENAME=create_dfsp_output.json

echo "\nCreating DFSP2"

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "dfspId": "'${DFSP_NAME}'",
  "name": "'${DFSP_NAME}'"
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps' | tee $FILENAME 

export TSP_DFSP_ID=`cat $FILENAME | jq -r '.id' | sed 's/ /%20/g'`

echo "\nTSP_DFSP_ID: " $TSP_DFSP_ID

echo "DFSPs in environment" $TSP_ENV_ID
curl -s --header 'Content-Type: application/json' --header 'Accept: application/json' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps' 

# INBOUND

echo "\n**As DFSP**: create PK pair ( one with 4096 and one with 2048 )" 

openssl req -new -newkey rsa:4096 \
-nodes \
-subj "/emailAddress=connection-manageron-manager@${DFSP_NAME}/CN=${DFSP_NAME}/O=DFSP1/OU=${DFSP_ID}/L=XX/ST=YY/C=ZZ" \
-reqexts v3_ca -config <(echo "[req]"; echo distinguished_name=req; echo x509_extensions = v3_ca; echo "[ v3_ca ]"; echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"; echo "extendedKeyUsage = clientAuth" ) \
-out dfsp_inbound.csr \
-keyout dfsp_inbound.key

openssl req -new -newkey rsa:2048 \
-nodes \
-subj "/emailAddress=connection-manager@${DFSP_NAME}/CN=${DFSP_NAME}/O=DFSP1/OU=${DFSP_ID}/L=XX/ST=YY/C=ZZ" \
-reqexts v3_ca -config <(echo "[req]"; echo distinguished_name=req; echo x509_extensions = v3_ca; echo "[ v3_ca ]"; echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"; echo "extendedKeyUsage = clientAuth" ) \
-out dfsp_inbound_2048.csr \
-keyout dfsp_inbound_2048.key


#openssl req -in dfsp_inbound.csr -nameopt multiline -text -noout
#openssl req -in dfsp_inbound_2048.csr -nameopt multiline -text -noout


echo "\n**As DFSP**: Upload CSR - Create an inbound request with an invalid CSR ( 2048 )"

DFSP_CSR=`jq -Rs . < dfsp_inbound_2048.csr`

export FILENAME=create_dfsp_inbound_2048.json

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "clientCSR": '$DFSP_CSR'
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound' | tee $FILENAME 

export TSP_DFSP_2048_ID=`jq '.id' < $FILENAME`

echo "\n TSP_DFSP_2048_ID: " $TSP_DFSP_2048_ID

export FILENAME=create_dfsp_inbound_2048.json

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_DFSP_2048_ID | tee $FILENAME 

export INBOUND_2048_VALIDATION_STATE=`jq '.validationState' < $FILENAME`

if [ "$INBOUND_2048_VALIDATION_STATE" = "\"INVALID\"" ]; then
  echo "\n ***OK*** inbound enrollment is invalid"
  grep -B 3 CSR_PUBLIC_KEY_LENGTH_4096 $FILENAME
else
  echo "\n *** NOT OK *** check inbound enrollment " $TSP_DFSP_2048_ID
  cd - && exit -1
fi


echo "\n**As DFSP**: Upload CSR - Create an inbound request with a correct CSR"

DFSP_CSR=`jq -Rs . < dfsp_inbound.csr`

export FILENAME=create_dfsp_inbound_enrollment.json

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "clientCSR": '$DFSP_CSR'
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound' | tee $FILENAME 

export TSP_INBOUND_ENROLLMENT_ID=`jq '.id' < $FILENAME`

echo "\n TSP_INBOUND_ENROLLMENT_ID: " $TSP_INBOUND_ENROLLMENT_ID

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID | tee $FILENAME 

export INBOUND_VALIDATION_STATE=`jq '.validationState' < $FILENAME`

if [ "$INBOUND_VALIDATION_STATE" = "\"VALID\"" ]; then
  echo "\n ***OK*** inbound enrollment is valid"
  grep -B 3 CSR_PUBLIC_KEY_LENGTH_4096 $FILENAME
else
  echo "\n *** NOT OK *** check inbound enrollment " $TSP_INBOUND_ENROLLMENT_ID
  cd - && exit -1
fi


echo "\n**As DFSP**: now we wait for the HUB to sign the CSR..."

echo "\n**As HUB**: Check for new inbound enrollment requests"

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'

# **As HUB**: Alternative 1: Have the Connection Manager to sign it with the environment Hub CA

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID'/sign'

# Now check the result from previous command
export INBOUND_VALIDATION_STATE=`jq '.validationState' < $FILENAME`
if [ "$INBOUND_VALIDATION_STATE" = "\"VALID\"" ]; then
  echo "\n *** OK *** Valid Certificate"
else
  echo "\n *** NOT OK *** check inbound enrollment signing " $TSP_INBOUND_ENROLLMENT_ID
  cd - && exit -1
fi


# **As HUB**: Alternative 2: sign the CSR offline, an upload a certificate

# NOT SHOWING: signing the CSR offline. Would need to have a CA to do this

# **As HUB**: upload with:
#curl -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' \
#'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID'/certificate'

# END alternative 2

echo "\n**As DFSP**: Check if the request is signed"
export FILENAME=dfsp_inbound_cert_response.json

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID | tee $FILENAME

export STATE=`jq '.state' < $FILENAME`
export INBOUND_VALIDATION_STATE=`jq '.validationState' < $FILENAME`
if [ "$INBOUND_VALIDATION_STATE" = "\"VALID\"" ] && [ "$STATE" = "\"CERT_SIGNED\"" ]; then
  echo "\n *** OK *** Valid & Signed Certificate"
else
  echo "\n *** NOT OK *** check inbound enrollment - should be valid & signed"
  cd - && exit -1
fi


# **As DFSP**: Get the cert
export FILENAME=dfsp_inbound.json

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID | tee $FILENAME

jq -r '.certificate' < $FILENAME > dfsp_inbound.cert

echo "\n --- "

# **As DFSP**: See what's in the cert
openssl x509 -in dfsp_inbound.cert -nameopt multiline -text -noout


# Now check if the cert matches the CSR we sent
cat /dev/null > moduli
openssl req -modulus -noout < dfsp_inbound.csr | openssl md5 >> moduli
openssl x509 -modulus -noout < dfsp_inbound.cert | openssl md5 >> moduli
openssl rsa -modulus -noout < dfsp_inbound.key | openssl md5 >> moduli

LINES=`uniq moduli | wc -l`
LINES_TRIM="$(echo -e "${LINES}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"


if [ "1" = "$LINES_TRIM" ]; then
  echo "Certificate signature OK"
else
  echo "\n *** NOT OK *** certificate signature NOT OK"
  cd - && exit -1
fi

# **As DFSP**: check that the cert is issued by the root CA

# **As DFSP**: Get the Hub CA
export FILENAME=rootCA.json

curl -s -X GET --header 'Accept: application/json' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/ca/rootCert' | tee $FILENAME

jq -r '.certificate' < $FILENAME > rootCA.cert


# See what's on the file
openssl x509 -in rootCA.cert -nameopt multiline -text -noout

openssl verify -verbose -CAfile rootCA.cert dfsp_inbound.cert

# check that the answer is dfsp_inbound.cert: OK


echo "\n *** INBOUND DONE ***"

## OUTBOUND

# Create a CA for DFSP

cat <<EOF > ca-config.json
{
    "signing": {
        "default": {
            "expiry": "43800h",
            "usages": [
              "signing",
              "key encipherment",
              "client auth"
             ]
        }
    }
}
EOF

# FIXME this forces the script to be run in the current directory since the ca-config.json is relative
cat <<EOF |  cfssl genkey -config=ca-config.json -initca - | cfssljson -bare dfsp-ca
{
  "hosts": ["ca.dfsp1.com"],
  "key": { "algo": "rsa", "size": 4096 },
  "names": [{ "O": "DFSP One", "OU": "DFSP One CA", "L": "-", "ST": "-", "C": "-" }]
}
EOF

# We now have
# dfsp-ca.pem
# dfsp-ca-key.pem
# dfsp-ca.csr

# Generate a Hub client CSR in the hub for this DFSP

# Option 1) from API

export TSP_OUTBOUND_ENROLLMENT_ID=`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "subject": {
    "CN": "hub.test.modusbox.com",
    "L": "XX",
    "O": "Modusbox",
    "OU": "PKI",
    "C": "YY",
    "ST": "ZZ",
    "emailAddress": "connection-manager-admin@modusbox.com" 
  },
  "extensions": {
    "subjectAltName": {
      "dns": [
        "hub1.test.modusbox.com",
        "hub2.test.modusbox.com"
      ],
      "ips": [
        "163.10.5.24",
        "163.10.5.22"
      ]
    }
  }
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/outbound/csr'| jq '.id' `

echo $TSP_OUTBOUND_ENROLLMENT_ID

# get the newly created CSR from the hub

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/outbound/'$TSP_OUTBOUND_ENROLLMENT_ID \
| jq -r '.csr' > hub.csr

# First, check what's in the CSR:

openssl req  -text -noout < hub.csr

# Now, sign the CSR creating a certificate 
cfssl sign -loglevel 1 -ca dfsp-ca.pem -ca-key dfsp-ca-key.pem -config=ca-config.json hub.csr  | cfssljson -bare hub-client-dfsp1

# Check the newly created certificate
openssl x509  -text -noout < hub-client-dfsp1.pem

# send the certificate to the hub

DFSP_CERT=`jq -Rs . < hub-client-dfsp1.pem`

export FILENAME=certificate_outbound.json

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "certificate": '$DFSP_CERT'
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/outbound/'$TSP_OUTBOUND_ENROLLMENT_ID'/certificate' | tee $FILENAME 

export TSP_CERTIFICATE_STATE=`jq '.state' < $FILENAME`

echo "\n TSP_CERTIFICATE_STATE: " $TSP_CERTIFICATE_STATE

if [ "$TSP_CERTIFICATE_STATE" = "\"CERT_SIGNED\"" ] ; then
  echo "\n *** OK *** Signed Certificate"
else
  echo "\n *** NOT OK *** check outbound enrollment - should be signed"
  cd - && exit -1
fi

# Option 2) offline and then send it to the API to persist
# As HUB, create PK pair and csr with extensions

export HUB_NAME=test1.centralhub.mojaloop.org
export HUB_ID=1

openssl req -new -newkey rsa:4096 \
-sha256 \
-nodes \
-subj "/CN=${HUB_NAME}/O=HUB1/OU=${HUB_ID}/emailAddress=connection-manager@${HUB_NAME}" \
-reqexts v3_ca -config <(echo "[req]"; echo distinguished_name=req; echo x509_extensions = v3_ca; echo "[ v3_ca ]"; echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"; echo "extendedKeyUsage = clientAuth" ) \
-out hub_outbound.csr \
-keyout hub_outbound.key


# look what's inside the csr
# openssl req -text -noout -verify -in hub_outbound.csr

HUB_CSR=`jq -Rs . < hub_outbound.csr`

export TSP_OUTBOUND_ENROLLMENT_ID2=`curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
   "hubCSR": '${HUB_CSR}'
  }' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/outbound'| jq '.id' `

echo 'TSP_OUTBOUND_ENROLLMENT_ID2:' $TSP_OUTBOUND_ENROLLMENT_ID2

if [[ -z "$TSP_OUTBOUND_ENROLLMENT_ID2" ]]; then
    echo "problem in /enrollments/outbound/csr"
    cd - && exit -1
fi

# get the newly created CSR from the hub

curl -s -X GET --header 'Accept: application/json' \
'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/outbound/'$TSP_OUTBOUND_ENROLLMENT_ID2 \
| jq -r '.csr' > hub2.csr

# First, check what's in the CSR:

# openssl req  -text -noout < hub2.csr

# Now, sign the CSR creating a certificate 
cfssl sign -loglevel 1 -ca dfsp-ca.pem -ca-key dfsp-ca-key.pem -config=ca-config.json hub2.csr  | cfssljson -bare hub2-client-dfsp1

# Check the newly created certificate
openssl x509  -text -noout < hub2-client-dfsp1.pem

# send the certificate to the hub

DFSP_CERT=`jq -Rs . < hub2-client-dfsp1.pem`

export FILENAME=certificate_outbound2.json

curl -s -X POST --header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "certificate": '$DFSP_CERT'
}' 'http://'$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/outbound/'$TSP_OUTBOUND_ENROLLMENT_ID2'/certificate' | tee $FILENAME 

export TSP_CERTIFICATE_STATE2=`jq '.state' < $FILENAME`

echo "\n TSP_CERTIFICATE_STATE2: " $TSP_CERTIFICATE_STATE2

if [ "$TSP_CERTIFICATE_STATE2" = "\"CERT_SIGNED\"" ] ; then
  echo "\n *** OK *** Signed Certificate"
else
  echo "\n *** NOT OK *** check outbound enrollment - should be signed"
  cd - && exit -1
fi

