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

const ErrorCategory = require('#src/errors/ErrorCategory');

jest.mock('#src/service/IamClient');

describe('DfspIamService', () => {
  const IAM_KEYS = [
    'IAM_ENABLED', 'IAM_AUTO_CREATE_ACCOUNTS', 'IAM_PROVISIONING_URL',
    'IAM_DFSP_RESOURCE_NAME', 'IAM_DFSP_ADMIN_ROLE', 'IAM_DFSP_CLIENT_ROLE', 'IAM_DFSP_CLIENT_AUDIENCE'
  ];
  const deployment = {
    IAM_ENABLED: 'true',
    IAM_DFSP_RESOURCE_NAME: 'participant',
    IAM_DFSP_ADMIN_ROLE: 'dfsp-operator',
    IAM_DFSP_CLIENT_ROLE: 'dfsp-client'
  };

  const load = (overrides = {}) => {
    for (const name of IAM_KEYS) delete process.env[name];
    Object.assign(process.env, deployment, overrides);
    let loaded;
    jest.isolateModules(() => {
      loaded = {
        service: require('#src/service/DfspIamService'),
        Iam: require('#src/service/IamClient'),
      };
    });
    for (const fn of Object.values(loaded.Iam)) {
      if (jest.isMockFunction(fn)) fn.mockResolvedValue(undefined);
    }
    return loaded;
  };

  const dfspId = 'dfsp-a';
  const email = 'admin@example.test';
  const over = { participant: dfspId };
  const client = { subject: dfspId, secret: 'secret-1' };
  const refused = Object.assign(new Error('IAM refused assignRole with 422'), { status: 422 });

  /** Every call the service made to the IAM, in order, by operation name. */
  const calls = (Iam) => Object.entries(Iam)
    .filter(([, fn]) => jest.isMockFunction(fn))
    .flatMap(([name, fn]) => fn.mock.calls.map((args, i) => ({ name, args, at: fn.mock.invocationCallOrder[i] })))
    .sort((a, b) => a.at - b.at)
    .map(({ name, args }) => [name, ...args]);

  describe('provisionDfsp', () => {
    it('records the DFSP, creates its machine client and its admin, and gives each its role over the DFSP', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(null);
      Iam.createClient.mockResolvedValue(client);
      Iam.createAccount.mockResolvedValue({ subject: 'person-1', created: true, invited: true });

      await service.provisionDfsp(dfspId, email);

      expect(calls(Iam)).toEqual([
        ['provision', 'participant', dfspId],
        ['rotateClientSecret', dfspId],
        ['createClient', { id: dfspId, name: `PM4ML client for DFSP ${dfspId}`, audience: ['connection-manager-api'] }],
        ['assign', dfspId, 'dfsp-client', over],
        ['createAccount', email],
        ['assign', 'person-1', 'dfsp-operator', over]
      ]);
    });

    it('takes over a client that already has the DFSP id by replacing its secret', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(client);
      Iam.createAccount.mockResolvedValue({ subject: 'person-1', created: true, invited: true });

      await service.provisionDfsp(dfspId, email);

      expect(Iam.createClient).not.toHaveBeenCalled();
      expect(Iam.assign).toHaveBeenCalledWith(dfspId, 'dfsp-client', over);
    });

    it('takes the client a concurrent request created between its two calls', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValueOnce(null).mockResolvedValueOnce(client);
      Iam.createClient.mockResolvedValue(null);
      Iam.createAccount.mockResolvedValue({ subject: 'person-1', created: true, invited: true });

      await service.provisionDfsp(dfspId, email);

      expect(Iam.rotateClientSecret).toHaveBeenCalledTimes(2);
      expect(Iam.assign).toHaveBeenCalledWith(dfspId, 'dfsp-client', over);
    });

    it('undoes, in reverse, everything it did when the IAM refuses a step', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(null);
      Iam.createClient.mockResolvedValue(client);
      Iam.createAccount.mockResolvedValue({ subject: 'person-1', created: true, invited: true });
      Iam.assign.mockResolvedValueOnce(undefined).mockRejectedValueOnce(refused);

      await expect(service.provisionDfsp(dfspId, email)).rejects.toBe(refused);

      expect(calls(Iam).slice(6)).toEqual([
        ['deleteAccount', 'person-1'],
        ['unassign', dfspId, 'dfsp-client', over],
        ['deleteClient', dfspId],
        ['deprovision', 'participant', dfspId]
      ]);
    });

    it('keeps the account and the client it found when it undoes', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(client);
      Iam.createAccount.mockResolvedValue({ subject: 'person-1', created: false, invited: false });
      Iam.assign.mockResolvedValueOnce(undefined).mockRejectedValueOnce(refused);

      await expect(service.provisionDfsp(dfspId, email)).rejects.toBe(refused);

      expect(Iam.deleteAccount).not.toHaveBeenCalled();
      expect(Iam.deleteClient).not.toHaveBeenCalled();
      expect(Iam.unassign).toHaveBeenCalledWith(dfspId, 'dfsp-client', over);
      expect(Iam.deprovision).toHaveBeenCalledWith('participant', dfspId);
    });

    it('records the DFSP and creates nobody when accounts are not created automatically', async () => {
      const { service, Iam } = load({ IAM_AUTO_CREATE_ACCOUNTS: 'false' });

      await service.provisionDfsp(dfspId);

      expect(calls(Iam)).toEqual([['provision', 'participant', dfspId]]);
    });

    it('assigns no role the deployment left empty', async () => {
      const { service, Iam } = load({ IAM_DFSP_ADMIN_ROLE: '', IAM_DFSP_CLIENT_ROLE: '' });
      Iam.rotateClientSecret.mockResolvedValue(client);
      Iam.createAccount.mockResolvedValue({ subject: 'person-1', created: true, invited: true });

      await service.provisionDfsp(dfspId, email);

      expect(Iam.assign).not.toHaveBeenCalled();
    });

    it('refuses an onboarding without the admin email before asking the IAM anything', async () => {
      const { service, Iam } = load();

      await expect(service.provisionDfsp(dfspId)).rejects.toMatchObject({ name: 'ValidationError' });
      expect(calls(Iam)).toEqual([]);
    });
  });

  describe('deprovisionDfsp', () => {
    it('drops the DFSP, retires its client and every person it left holding no role', async () => {
      const { service, Iam } = load();
      Iam.deprovision.mockResolvedValue([dfspId, 'person-1']);
      Iam.deleteClient.mockResolvedValue(undefined);
      Iam.deleteAccount.mockResolvedValue(undefined);

      await service.deprovisionDfsp(dfspId);

      expect(calls(Iam)).toEqual([
        ['deprovision', 'participant', dfspId],
        ['deleteClient', dfspId],
        ['deleteAccount', 'person-1']
      ]);
    });

    it('finishes when a client or person cannot be retired', async () => {
      const { service, Iam } = load();
      Iam.deprovision.mockResolvedValue(['person-1', 'person-2']);
      Iam.deleteClient.mockRejectedValue(refused);
      Iam.deleteAccount.mockRejectedValueOnce(refused).mockResolvedValueOnce(undefined);

      await service.deprovisionDfsp(dfspId);

      expect(Iam.deleteAccount).toHaveBeenCalledWith('person-2');
    });
  });

  describe('rotateDfspClientCredentials', () => {
    it("answers the client's new secret, leaving the roles of a client it finds as they are", async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(client);

      expect(await service.rotateDfspClientCredentials(dfspId)).toEqual({ clientId: dfspId, clientSecret: 'secret-1' });
      expect(calls(Iam)).toEqual([['rotateClientSecret', dfspId]]);
    });

    it('creates the client when the IAM has none, recording the DFSP and giving it its role', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(null);
      Iam.createClient.mockResolvedValue(client);

      expect(await service.rotateDfspClientCredentials(dfspId)).toEqual({ clientId: dfspId, clientSecret: 'secret-1' });
      expect(calls(Iam).slice(2)).toEqual([
        ['provision', 'participant', dfspId],
        ['assign', dfspId, 'dfsp-client', over]
      ]);
    });

    it('removes a client it created when the IAM refuses its role, and says why', async () => {
      const { service, Iam } = load();
      Iam.rotateClientSecret.mockResolvedValue(null);
      Iam.createClient.mockResolvedValue(client);
      Iam.assign.mockRejectedValue(refused);

      await expect(service.rotateDfspClientCredentials(dfspId)).rejects.toBe(refused);
      expect(Iam.deleteClient).toHaveBeenCalledWith(dfspId);
    });
  });

  describe('with the IAM disabled', () => {
    it('asks the IAM nothing, and refuses to issue credentials as unavailable', async () => {
      const { service, Iam } = load({ IAM_ENABLED: 'false' });

      service.validateOnboarding(undefined);
      await service.provisionDfsp(dfspId, email);
      const unavailable = await service.rotateDfspClientCredentials(dfspId).catch((err) => err);
      await service.deprovisionDfsp(dfspId);

      expect(unavailable).toMatchObject({ name: 'NotImplementedError' });
      expect(ErrorCategory.getStatusCode(unavailable.category)).toBe(501);
      expect(calls(Iam)).toEqual([]);
    });
  });
});
