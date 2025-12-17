/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.

 Contributors
 --------------
 This is the official list of the Mojaloop project contributors for this file.
 Names of the original copyright holders (individuals or organizations)
 should be listed with a '*' in the first column. People who have
 contributed from an organization can be listed under the organization
 that actually holds the copyright for their contributions (see the
 Mojaloop Foundation for an example). Those individuals should have
 their names indented and be marked with a '-'. Email address can be added
 optionally within square brackets <email>.

 * Mojaloop Foundation

 --------------
 ******/

'use strict';

const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const Constants = require('../constants/Constants');

const SESSION_TIMEOUT_MS = 8 * 60 * 60 * 1000; // 8 hours

// MySQL session store options
const sessionStoreOptions = {
  host: Constants.DATABASE.DATABASE_HOST,
  port: Constants.DATABASE.DATABASE_PORT,
  user: Constants.DATABASE.DATABASE_USER,
  password: Constants.DATABASE.DATABASE_PASSWORD,
  database: Constants.DATABASE.DATABASE_SCHEMA,
  // Recommended options for MySQL session store
  clearExpired: true,
  checkExpirationInterval: 15 * 60 * 1000, // 15 minutes
  expiration: SESSION_TIMEOUT_MS,
  connectionLimit: 10,
  schema: {
    tableName: 'sessions',
    columnNames: {
      session_id: 'session_id',
      expires: 'expires',
      data: 'data'
    }
  }
};

// Lazy initialization: session store only created when needed
let sessionStore = null;

const getOrCreateSessionStore = () => {
  if (!sessionStore) {
    sessionStore = new MySQLStore(sessionStoreOptions);
  }
  return sessionStore;
};

const sessionOptions = {
  key: 'mcm_session',
  secret: Constants.SESSION_STORE.SECRET,
  store: null, // will be set when middleware is created
  resave: false,
  saveUninitialized: false,
  rolling: true,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: Constants.SESSION_STORE.COOKIE_SAME_SITE_STRICT ? 'Strict' : 'Lax',
    maxAge: SESSION_TIMEOUT_MS
  }
};

exports.createSessionMiddleware = () => {
  const store = getOrCreateSessionStore();
  return session({ ...sessionOptions, store });
};

exports.getSessionStore = () => {
  return getOrCreateSessionStore();
};

exports.sessionOptions = sessionOptions;
