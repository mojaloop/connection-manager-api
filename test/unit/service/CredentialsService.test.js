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

jest.mock('#src/service/DfspIamService', () => ({ rotateDfspClientCredentials: jest.fn() }));
jest.mock('#src/service/PkiService', () => ({ validateDfsp: jest.fn() }));

const CredentialsService = require('#src/service/CredentialsService');
const DfspIamService = require('#src/service/DfspIamService');
const PkiService = require('#src/service/PkiService');
const NotFoundError = require('#src/errors/NotFoundError');

describe('CredentialsService', () => {
  let vault;
  let ctx;

  beforeEach(() => {
    jest.resetAllMocks();
    vault = new Map();
    ctx = {
      pkiEngine: {
        setSecret: async (key, value) => { vault.set(key, value); },
        getSecret: async (key) => {
          if (!vault.has(key)) throw new NotFoundError();
          return vault.get(key);
        }
      }
    };
    PkiService.validateDfsp.mockResolvedValue({ dfspId: 'dfsp-a' });
  });

  it('stores the credentials the IAM issued under the DFSP, and answers them', async () => {
    DfspIamService.rotateDfspClientCredentials.mockResolvedValue({ clientId: 'dfsp-a', clientSecret: 'secret-1' });

    const created = await CredentialsService.createCredentials(ctx, 'dfsp-a');

    expect(created).toEqual({
      status: 201,
      data: { clientId: 'dfsp-a', clientSecret: 'secret-1', createdAt: expect.any(String) }
    });
    expect(vault.get('api-credentials/dfsp-a')).toEqual({
      client_id: 'dfsp-a',
      client_secret: 'secret-1',
      created_at: created.data.createdAt,
      dfsp_id: 'dfsp-a'
    });
  });

  it('reads back the credentials it stored', async () => {
    DfspIamService.rotateDfspClientCredentials.mockResolvedValue({ clientId: 'dfsp-a', clientSecret: 'secret-1' });
    const created = await CredentialsService.createCredentials(ctx, 'dfsp-a');

    expect(await CredentialsService.getCredentials(ctx, 'dfsp-a')).toEqual({
      clientId: 'dfsp-a',
      clientSecret: 'secret-1',
      createdAt: created.data.createdAt,
      updatedAt: undefined
    });
  });

  it('keeps the latest secret the IAM issued after a rotation', async () => {
    DfspIamService.rotateDfspClientCredentials
      .mockResolvedValueOnce({ clientId: 'dfsp-a', clientSecret: 'secret-1' })
      .mockResolvedValueOnce({ clientId: 'dfsp-a', clientSecret: 'secret-2' });

    await CredentialsService.createCredentials(ctx, 'dfsp-a');
    await CredentialsService.createCredentials(ctx, 'dfsp-a');

    expect((await CredentialsService.getCredentials(ctx, 'dfsp-a')).clientSecret).toBe('secret-2');
  });

  it('answers not found for credentials never stored', async () => {
    await expect(CredentialsService.getCredentials(ctx, 'dfsp-a')).rejects.toBeInstanceOf(NotFoundError);
  });

  it('asks the IAM nothing and stores nothing for a DFSP that does not exist', async () => {
    PkiService.validateDfsp.mockRejectedValue(new NotFoundError('DFSP not found'));

    await expect(CredentialsService.createCredentials(ctx, 'dfsp-x')).rejects.toBeInstanceOf(NotFoundError);

    expect(DfspIamService.rotateDfspClientCredentials).not.toHaveBeenCalled();
    expect(vault.size).toBe(0);
  });

  it('stores nothing when the IAM issues no credentials', async () => {
    DfspIamService.rotateDfspClientCredentials.mockRejectedValue(new Error('IAM refused rotateClientSecret with 500'));

    await expect(CredentialsService.createCredentials(ctx, 'dfsp-a')).rejects.toThrow('IAM refused');

    expect(vault.size).toBe(0);
  });
});
