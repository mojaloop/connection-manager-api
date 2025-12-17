#!/bin/zsh

# SETUP
# export SERVER="http://mcm.localhost/api"

if [[ -z "${SERVER}" ]]; then
  echo 'SERVER is not defined'
  exit -1
else
  echo 'SERVER we are using:: ' ${SERVER}
fi


if [[ -z "${hubuser}" ]]; then
  echo 'hubuser is no defined'
  exit -1
else
  echo 'hubuser :: ' ${hubuser}
fi


if [[ -z "${hubpass}" ]]; then
  echo 'hubpass is no defined'
  exit -1
else
  echo 'hubpass:: ' ${hubpass}
fi

export TMPDIR=${TMPDIR:-/tmp}
echo TMPDIR:$TMPDIR
cd $TMPDIR

delete_env()
{
  curl -v -X DELETE \
  --cookie $COOKIE_JAR \
  --header 'Content-Type: application/json' \
  --header 'Accept: application/json' \
   $SERVER'/api/environments'/$TSP_ENV_ID

  if [ $1 -eq 0 ]; 
  then
    echo 'SUCCESS!! :D'  
  else
    echo 'FAIL!'
    exit -1
  fi
}

export ENV_NAME="SMOKE_TEST"

echo "\nUsing server: " $SERVER
echo "\nUsing environment named: " $ENV_NAME

# Try to login as PTA

export FILENAME=login.json

export COOKIE_JAR=cookies

curl -v \
--cookie-jar $COOKIE_JAR \
-d "username=$hubuser&password=$hubpass" \
-H "Content-Type:application/x-www-form-urlencoded" $SERVER'/api/login' | tee $FILENAME 

cat $COOKIE_JAR

export LOGIN_RESULT=`cat $FILENAME | jq -r '.ok' `

if [[ -z "${LOGIN_RESULT}" ]]; then
  echo 'could not login!!'
  exit -1
fi

cat 'LOGIN_RESULT:: '${LOGIN_RESULT}

if ${LOGIN_RESULT} ; then
  echo 'LOGIN OK!'
else
  echo 'LOGIN FAILED!! :: '
  cat ${FILENAME}
  exit -1
fi

echo "\nCreate an Environment"

export FILENAME=create_env_output.json

curl -v -X POST \
--cookie $COOKIE_JAR \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' \
-d '{
  "name": "'$ENV_NAME'",
  "defaultDN": {
    "CN": "tes1.centralhub.modusbox.live",
    "O": "Modusbox",
    "OU": "PKI"
  }
}' \
-o $FILENAME $SERVER'/api/environments' 

if [ $? -ne 0 ]; then
    cat $FILENAME
    echo "error $?. Is the server running and reachable?"
    exit -1
fi

export TSP_ENV_ID=`jq '.id' < $FILENAME`

echo "\nTSP_ENV_ID: " $TSP_ENV_ID

echo "\nGet all the env info"
curl -X GET \
--cookie $COOKIE_JAR \
--header 'Accept: application/json' $SERVER'/api/environments/'$TSP_ENV_ID

# Create a DFSP ( test1.dfsp1.com )

export DFSP_NAME="DFSP1"
export DFSP_ID=$DFSP_NAME

echo "\nDFSP_ID: " $DFSP_ID " DFSP_NAME: " $DFSP_NAME

export FILENAME=create_dfsp_output.json

echo "\nCreating DFSP1"

curl -s -X POST \
--cookie $COOKIE_JAR \
--header 'Content-Type: application/json' --header 'Accept: application/json' -d '{
  "dfspId": "'${DFSP_NAME}'",
  "name": "'${DFSP_NAME}'"
}' $SERVER'/api/environments/'$TSP_ENV_ID'/dfsps' | tee $FILENAME 

export TSP_DFSP_ID=`cat $FILENAME | jq -r '.id' | sed 's/ /%20/g'`

echo "\nTSP_DFSP_ID: " $TSP_DFSP_ID

# Create an embedded Hub CA

export FILENAME=env_ca.json

curl -s -X POST \
--cookie $COOKIE_JAR \
--header 'Content-Type: application/json' --header 'Accept: application/json' -d '
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
  ' $SERVER'/api/environments/'$TSP_ENV_ID'/cas' | tee $FILENAME

jq -r '.certificate' < $FILENAME > hub_ca.cert

echo "\nCA certificate:"

openssl x509 -in hub_ca.cert -nameopt multiline -text -noout

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

curl -s -X POST \
--cookie $COOKIE_JAR \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' -d '{
  "clientCSR": '$DFSP_CSR'
}' $SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound' | tee $FILENAME 

export TSP_DFSP_2048_ID=`jq '.id' < $FILENAME`

echo "\n TSP_DFSP_2048_ID: " $TSP_DFSP_2048_ID

export FILENAME=create_dfsp_inbound_2048.json

curl -s -X GET \
--cookie $COOKIE_JAR \
--header 'Accept: application/json' \
$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_DFSP_2048_ID | tee $FILENAME 

export INBOUND_2048_VALIDATION_STATE=`jq '.validationState' < $FILENAME`

if [ "$INBOUND_2048_VALIDATION_STATE" = "\"INVALID\"" ]; then
  echo "\n ***OK*** inbound enrollment is invalid"
  grep -B 3 CSR_PUBLIC_KEY_LENGTH_4096 $FILENAME
else
  echo "\n *** NOT OK *** check inbound enrollment " $TSP_DFSP_2048_ID
  delete_env -1
fi


echo "\n**As DFSP**: Upload CSR - Create an inbound request with a correct CSR"

DFSP_CSR=`jq -Rs . < dfsp_inbound.csr`

export FILENAME=create_dfsp_inbound_enrollment.json

curl -s -X POST \
--cookie $COOKIE_JAR \
--header 'Content-Type: application/json' \
--header 'Accept: application/json' -d '{
  "clientCSR": '$DFSP_CSR'
}' $SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound' | tee $FILENAME 

export TSP_INBOUND_ENROLLMENT_ID=`jq '.id' < $FILENAME`

echo "\n TSP_INBOUND_ENROLLMENT_ID: " $TSP_INBOUND_ENROLLMENT_ID

curl -s -X GET \
--cookie $COOKIE_JAR \
--header 'Accept: application/json' \
$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID | tee $FILENAME 

export INBOUND_VALIDATION_STATE=`jq '.validationState' < $FILENAME`

if [ "$INBOUND_VALIDATION_STATE" = "\"VALID\"" ]; then
  echo "\n ***OK*** inbound enrollment is valid"
  grep -B 3 CSR_PUBLIC_KEY_LENGTH_4096 $FILENAME
else
  echo "\n *** NOT OK *** check inbound enrollment " $TSP_INBOUND_ENROLLMENT_ID
  delete_env -1
fi

# **As HUB**: Alternative 1: Have the Connection Manager to sign it with the environment Hub CA

curl -s -X POST \
--cookie $COOKIE_JAR \
--header 'Content-Type: application/json' --header 'Accept: application/json' \
$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID'/sign'

# Now check the result from previous command
export INBOUND_VALIDATION_STATE=`jq '.validationState' < $FILENAME`
if [ "$INBOUND_VALIDATION_STATE" = "\"VALID\"" ]; then
  echo "\n *** OK *** Valid Certificate"
else
  echo "\n *** NOT OK *** check inbound enrollment signing " $TSP_INBOUND_ENROLLMENT_ID
  delete_env -1
fi

# **As DFSP**: Get the cert
export FILENAME=dfsp_inbound.json

curl -s -X GET \
--cookie $COOKIE_JAR \
--header 'Accept: application/json' \
$SERVER'/api/environments/'$TSP_ENV_ID'/dfsps/'$TSP_DFSP_ID'/enrollments/inbound/'$TSP_INBOUND_ENROLLMENT_ID | tee $FILENAME

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
  delete_env -1
fi

delete_env 0

