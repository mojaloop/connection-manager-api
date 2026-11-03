/******************************************************************************
 *  Copyright 2019 ModusBox, Inc.                                             *
 *                                                                            *
 *  info@modusbox.com                                                         *
 *                                                                            *
 *  Licensed under the Apache License, Version 2.0 (the "License");           *
 *  you may not use this file except in compliance with the License.          *
 *  You may obtain a copy of the License at                                   *
 *  http://www.apache.org/licenses/LICENSE-2.0                                *
 *                                                                            *
 *  Unless required by applicable law or agreed to in writing, software       *
 *  distributed under the License is distributed on an "AS IS" BASIS,         *
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  *
 *  See the License for the specific language governing permissions and       *
 *  limitations under the License.                                            *
 ******************************************************************************/

const knex = require('knex');
const retry = require('async-retry');
const metrics = require('@mojaloop/central-services-metrics');
const { logger } = require('../log/logger');
const Constants = require('../constants/Constants');

const ErrorCode = Object.freeze({
  CONN_TIMEOUT: 'conn_timeout',
  CONN_FAILED: 'conn_failed',
  DEADLOCK: 'deadlock',
  DUP_ENTRY: 'dup_entry',
  NOT_CONNECTED: 'not_connected',
  UNKNOWN: 'unknown_db_error',
});

const DriverErrorCode = Object.freeze({
  ECONNREFUSED: 'ECONNREFUSED',
  ER_LOCK_DEADLOCK: 'ER_LOCK_DEADLOCK',
  ER_DUP_ENTRY: 'ER_DUP_ENTRY',
});

const ERROR_SYSTEM = 'mysql';
const ERROR_COUNTER = 'errorCount';
const CONNECT_OPERATION = 'connect';

/**
 * The service's database: one knex pool, connected with retries at startup
 * and destroyed by the service's shutdown. Each failed query counts towards
 * the errorCount metric under a code for what went wrong.
 */
class Database {
  #isConnected = false;

  constructor ({ knexOptions, retryOptions, logger, metrics, context }) {
    this.knex = knex(knexOptions);
    this.metrics = metrics;
    this.log = logger.child({ component: this.constructor.name });
    this.retryOptions = {
      onRetry: (err) => { this.log.info('Database connection attempt: ', err); },
      ...retryOptions,
    };
    this.context = context;
  }

  get isConnected () { return this.#isConnected; }

  async connect () {
    try {
      await retry(async (_, attempt) => {
        this.log.verbose(`Attempting database connection. Attempt ${attempt} of ${this.retryOptions.retries + 1}`);
        await this.knex.raw('SELECT 1');
      }, this.retryOptions);
      this.#isConnected = true;
      this.log.info('Database connected');
    } catch (err) {
      this.log.error('error connecting to DB: ', err);
      this.handleError(err, CONNECT_OPERATION);
    }
  }

  async disconnect () {
    await this.knex.destroy();
    this.#isConnected = false;
    this.log.info('Database disconnected');
  }

  async executeWithErrorCount (queryFn, operation = queryFn.name, step = '') {
    try {
      if (!this.isConnected) this.log.warn('Database is not connected');
      const result = await queryFn(this.knex);
      this.log.debug('executeWithErrorCount is done: ', { result });
      return result;
    } catch (err) {
      this.log.error('error in executeWithErrorCount: ', err);
      this.handleError(err, operation, step);
    }
  }

  handleError (error, operation, step = '') {
    this.#incrementErrorCounter({ code: this.#errorCode(error), operation, step });
    throw error;
  }

  #errorCode (error) {
    if (error instanceof knex.KnexTimeoutError) return ErrorCode.CONN_TIMEOUT;
    if (error.code === DriverErrorCode.ECONNREFUSED) return ErrorCode.CONN_FAILED;
    if (error.code === DriverErrorCode.ER_LOCK_DEADLOCK) return ErrorCode.DEADLOCK;
    if (error.code === DriverErrorCode.ER_DUP_ENTRY) return ErrorCode.DUP_ENTRY;
    if (!this.isConnected) return ErrorCode.NOT_CONNECTED;
    return ErrorCode.UNKNOWN;
  }

  #incrementErrorCounter ({ code, operation, step }) {
    try {
      const errDetails = {
        system: ERROR_SYSTEM,
        code,
        context: this.context,
        operation,
        ...(step && { step }),
      };
      this.metrics.getCounter(ERROR_COUNTER).inc(errDetails);
      this.log.info('incrementErrorCounter is called:', { errDetails });
    } catch (error) {
      this.log.warn('error in incrementErrorCounter: ', error);
    }
  }
}

const knexOptions = {
  client: 'mysql2',
  connection: {
    host: Constants.DATABASE.DATABASE_HOST,
    port: Constants.DATABASE.DATABASE_PORT,
    user: Constants.DATABASE.DATABASE_USER,
    password: Constants.DATABASE.DATABASE_PASSWORD,
    database: Constants.DATABASE.DATABASE_SCHEMA,
    charset: 'utf8mb4',
    ssl: Constants.DATABASE.DATABASE_SSL_ENABLED ? {
      rejectUnauthorized: Constants.DATABASE.DATABASE_SSL_VERIFY,
      ca: Constants.DATABASE.DATABASE_SSL_CA ? Constants.DATABASE.DATABASE_SSL_CA : undefined
    } : undefined
  },
  pool: {
    min: 0,
    max: Constants.DATABASE.DB_POOL_SIZE_MAX,
  },
  asyncStackTraces: true
};

const retryOptions = {
  retries: Constants.DATABASE.DB_RETRIES,
  minTimeout: Constants.DATABASE.DB_CONNECTION_RETRY_WAIT_MILLISECONDS,
  // 1.3 ^ 10 ~= 14
  // therefore, a factor of 1.3 with an initial 1s delay has a maximum between-attempt delay of
  // 28 seconds, including jitter up to a factor of 2
  factor: 1.3,
  // async-retry has a default `randomize` parameter here which randomises retry delays by
  // multiplying them by a factor of [1,2]. We leave this default to mitigate thundering herd,
  // even though that's rather unlikely. You never know where your code will end up..
};

/**
 * Database connection instance
 * @type {Database}
 */
module.exports = new Database({
  knexOptions,
  retryOptions,
  logger,
  metrics,
  context: 'MCM_DB'
});
