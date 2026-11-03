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

const Constants = require('../constants/Constants');
const InternalError = require('../errors/InternalError');

/**
 * The IAM's internal API, which this service calls when it creates
 * something: it records that a resource exists, creates the people and
 * machine clients that operate it, and assigns them roles. Resource and role
 * names arrive as deployment configuration and pass through untouched. The
 * API is reached by network rule alone, so requests carry no credentials.
 */

class IamError extends InternalError {
  constructor (operation, status, errors) {
    super(`IAM refused ${operation} with ${status}: ${errors.join('; ')}`);
    this.status = status;
    this.errors = errors;
  }
}

const read = async (response) => {
  const text = await response.text();
  if (text === '') return undefined;
  return (response.headers.get('content-type') ?? '').includes('json') ? JSON.parse(text) : text;
};

/**
 * Sends one operation and answers `{ status, body }` for the statuses the
 * contract gives it; any other status is an IamError.
 */
const call = async (operation, method, path, body, answers) => {
  const response = await fetch(`${Constants.IAM.PROVISIONING_URL}${path}`, {
    method,
    ...(body !== undefined && {
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  });
  const payload = await read(response);
  if (!answers.includes(response.status)) {
    const errors = Array.isArray(payload?.errors)
      ? payload.errors
      : [typeof payload === 'string' ? payload : JSON.stringify(payload ?? '')];
    throw new IamError(operation, response.status, errors);
  }
  return { status: response.status, body: payload };
};

const subjectPath = (collection, subject) => `/${collection}/${encodeURIComponent(subject)}`;

/**
 * @param {string} resourceName
 * @param {string} id
 */
exports.provision = async (resourceName, id) => {
  await call('provisionResource', 'POST', '/provision', { resourceName, id }, [200]);
};

/**
 * Removes the resource and every role instance over it.
 *
 * @param {string} resourceName
 * @param {string} id
 * @returns {Promise<string[]>} the subjects now holding no role at all
 */
exports.deprovision = async (resourceName, id) => {
  const { body } = await call('deprovisionResource', 'DELETE', '/provision', { resourceName, id }, [200]);
  return body.orphaned;
};

/**
 * Finds the person with this email, or creates and invites them.
 *
 * @param {string} email
 * @returns {Promise<{subject: string, created: boolean, invited: boolean}>}
 */
exports.createAccount = async (email) => {
  const { body } = await call('createAccount', 'POST', '/accounts', { email }, [200]);
  return body;
};

/**
 * Retires a person. The IAM refuses (409) while they hold a role.
 *
 * @param {string} subject
 */
exports.deleteAccount = async (subject) => {
  await call('deleteAccount', 'DELETE', subjectPath('accounts', subject), undefined, [204]);
};

/**
 * @param {{id?: string, name?: string, audience?: string[]}} client
 * @returns {Promise<{subject: string, secret: string}|null>} null when a client with that id exists
 */
exports.createClient = async (client) => {
  const { status, body } = await call('createClient', 'POST', '/clients', client, [201, 409]);
  return status === 201 ? body : null;
};

/**
 * @param {string} subject the client id
 * @returns {Promise<{subject: string, secret: string}|null>} null when there is no such client
 */
exports.rotateClientSecret = async (subject) => {
  const { status, body } = await call('rotateClientSecret', 'POST', `${subjectPath('clients', subject)}/secret`, undefined, [200, 404]);
  return status === 200 ? body : null;
};

/**
 * Retires a machine client. The IAM refuses (409) while it holds a role.
 *
 * @param {string} subject the client id
 */
exports.deleteClient = async (subject) => {
  await call('deleteClient', 'DELETE', subjectPath('clients', subject), undefined, [204]);
};

/**
 * @param {string} subject
 * @param {string} role
 * @param {Object<string, string>} resources resource name to id, one per name the role is keyed by
 */
exports.assign = async (subject, role, resources) => {
  await call('assignRole', 'POST', `${subjectPath('subjects', subject)}/assignments`, { role, resources }, [200]);
};

/**
 * @param {string} subject
 * @param {string} role
 * @param {Object<string, string>} resources
 */
exports.unassign = async (subject, role, resources) => {
  await call('unassignRole', 'DELETE', `${subjectPath('subjects', subject)}/assignments`, { role, resources }, [200]);
};

exports.IamError = IamError;
