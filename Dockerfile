# The Node version lives in .nvmrc, the npm version in package.json devEngines:
#
#   docker build --build-arg NODE_VERSION="$(cat .nvmrc)-alpine" -t mojaloop/connection-manager-api:local .
#
# NPM_CONFIG_REGISTRY names the registry the lockfile resolves through.
ARG NODE_VERSION=lts-alpine

FROM node:${NODE_VERSION} AS builder
ARG NPM_CONFIG_REGISTRY=https://registry.npmjs.org/

WORKDIR /opt/app

ENV NPM_CONFIG_UPDATE_NOTIFIER=false

COPY package.json package-lock.json* /opt/app/
RUN npm install --global npm@"$(node -p 'require("./package.json").devEngines.packageManager.version')"
RUN npm ci --omit=dev

FROM node:${NODE_VERSION}

WORKDIR /opt/app

RUN rm -rf /usr/local/lib/node_modules/npm
COPY --from=builder /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/npm
ENV NPM_CONFIG_UPDATE_NOTIFIER=false
RUN adduser -D app-user
USER app-user

COPY --chown=app-user --from=builder /opt/app .
COPY src /opt/app/src

EXPOSE 3001

CMD ["npm", "start"]
