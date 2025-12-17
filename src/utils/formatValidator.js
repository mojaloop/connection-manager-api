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

const { URL } = require('url');
const ValidationError = require('../errors/ValidationError');

/**
 * Validates a single IP address or a range in CIDR notation
 */
exports.validateIpAddress = (candidate) => {
  return (/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])(\/([0-9]|[1-2][0-9]|3[0-2]))?$/.test(candidate));
};

exports.validateURL = (candidate) => {
  try {
    const url = new URL(candidate);
    if (!(url.protocol.toLowerCase() === 'http:' || url.protocol.toLowerCase() === 'https:')) {
      return false;
    }
    return true;
  } catch (TypeError) {
    return false;
  }
};

exports.validateIPAddressInput = (ip) => {
  if (!exports.validateIpAddress(ip)) {
    throw new ValidationError('Invalid IP address or CIDR range');
  }
};

exports.validateURLInput = (url) => {
  if (!exports.validateURL(url)) {
    throw new ValidationError('Invalid URL');
  }
};

exports.validatePort = (inputValue) => {
  if (!Number.isInteger(Number(inputValue))) {
    throw new ValidationError(`port range validation error: ${inputValue} is not an Integer`);
  }
  const value = Number(inputValue);
  if (value < 0 || value > 65535) {
    throw new ValidationError(`port range validation error: ${inputValue} is not in the [0,65535] range`);
  }
};

exports.validatePorts = (ports) => {
  ports.forEach(element => {
    if (/^([0-9]+)-([0-9]+)$/.test(element)) {
      const limits = element.split('-');
      limits.forEach(limit => {
        exports.validatePort(limit);
      });
    } else {
      exports.validatePort(element);
    }
  });
  return true;
};

/**
 * Validates that a DFSP ID meets Keycloak username requirements
 * @param {string} dfspId - The DFSP ID to validate
 * @throws {ValidationError} If the DFSP ID doesn't meet Keycloak requirements
 */
exports.validateDfspIdForKeycloak = (dfspId) => {
  if (!dfspId || dfspId.length < 3 || dfspId.length > 255) {
    throw new ValidationError(`DFSP ID must be between 3 and 255 characters for Keycloak compatibility`);
  }

  const invalidChars = /[!@#$%^&*()+=\[\]{};':"\\|,.<>?~`\s]/;
  if (invalidChars.test(dfspId)) {
    throw new ValidationError(`DFSP ID contains invalid characters. Only alphanumeric characters, hyphens, and underscores are allowed.`);
  }

  return true;
};

exports.validateEmail = (email) => {
  if (!email) {
    throw new ValidationError('email is required when Keycloak is enabled and AUTO_CREATE_ACCOUNTS is true');
  }
  // todo: think if we need better validation. e.g. /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  return true;
};
