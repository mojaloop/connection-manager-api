/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const { createContext, destroyContext } = require('./context');
const { setupTestDB, tearDownTestDB } = require('./test-database');
const CredentialsService = require('../../src/service/CredentialsService');
const PkiService = require('../../src/service/PkiService');
const NotFoundError = require('../../src/errors/NotFoundError');
const NotImplementedError = require('../../src/errors/NotImplementedError');
const { createUniqueDfsp } = require('./test-helpers');

describe('Credentials Service Integration Tests', () => {
  let context;
  let testDfsp;

  beforeAll(async () => {
    await setupTestDB();
    context = await createContext();
    testDfsp = createUniqueDfsp();
    await PkiService.createDFSP(context, testDfsp);
  });

  afterAll(async () => {
    if (context) {
      try { await PkiService.deleteDFSP(context, testDfsp.dfspId); } catch (_) { /* ignore */ }
      try { await context.pkiEngine.deleteSecret(`api-credentials/${testDfsp.dfspId}`); } catch (_) { /* ignore */ }
      destroyContext(context);
    }
    await tearDownTestDB();
  });

  beforeEach(async () => {
    try {
      await context.pkiEngine.deleteSecret(`api-credentials/${testDfsp.dfspId}`);
    } catch (error) {
      // none stored yet
    }
  });

  describe('Error Handling', () => {
    it('should answer not found for credentials never created', async () => {
      await expect(CredentialsService.getCredentials(context, testDfsp.dfspId)).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should answer not found for a DFSP that does not exist', async () => {
      await expect(CredentialsService.createCredentials(context, 'NON_EXISTENT_DFSP')).rejects.toBeInstanceOf(NotFoundError);
    });

    it('should answer not implemented when no IAM issues credentials', async () => {
      await expect(CredentialsService.createCredentials(context, testDfsp.dfspId)).rejects.toBeInstanceOf(NotImplementedError);
    });
  });
});
