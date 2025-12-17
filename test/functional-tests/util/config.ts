/** ************************************************************************
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
 *  limitations under the License.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Sridevi Miriyala - sridevi.miriyala@modusbox.com                **
 * 
 *  CONTRIBUTORS:                                                      *
 *       Miguel de Barros - miguel.debarros@modusbox.com                **
 * 
 ************************************************************************* */

require('dotenv').config();
const env = require('env-var');

module.exports = {
  mcmEndpoint: env.get('APP_ENDPOINT').default('http://mcm.localhost/api').asString(),
  oauth2Issuer: env.get('OAUTH2_ISSUER').asString(),
  oauthClientKey: env.get('APP_OAUTH_CLIENT_KEY').asString(),
  oauthClientSecret: env.get('APP_OAUTH_CLIENT_SECRET').asString()
};
