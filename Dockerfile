# Arguments
ARG NODE_VERSION=24.19.0-alpine3.24

# NOTE: Ensure you set NODE_VERSION Build Argument as follows...
#
#  export NODE_VERSION="$(cat .nvmrc)-alpine"
#  docker build \
#    --build-arg NODE_VERSION=$NODE_VERSION \
#    -t mojaloop/repo-name:local \
#    .
#

# Build Image
FROM node:${NODE_VERSION} AS builder
USER root

WORKDIR /opt/app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

ARG API_BUILD
ENV API_BUILD=$API_BUILD

ARG API_COMMIT
ENV API_COMMIT=$API_COMMIT

ARG API_DESCRIBE
ENV API_DESCRIBE=$API_DESCRIBE

RUN apk --no-cache add git
RUN apk add --no-cache -t build-dependencies make gcc g++ python3 libtool openssl-dev autoconf automake bash \
    && cd $(npm root -g)/npm
    # && npm config set unsafe-perm true
    # && npm install -g node-gyp
COPY package.json package-lock.json* /opt/app/

RUN npm ci --omit=dev

FROM node:${NODE_VERSION}

WORKDIR /opt/app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

# Create empty log file & link stdout to the application log file
RUN mkdir ./logs && touch ./logs/combined.log
RUN ln -sf /dev/stdout ./logs/combined.log

# Create a non-root user: ml-user
RUN adduser -D app-user
USER app-user

COPY --chown=app-user --from=builder /opt/app .
COPY src /opt/app/src

EXPOSE 3001

CMD ["npm", "start"]
