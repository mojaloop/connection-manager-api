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

const IAM = 'http://iam.test';

describe('IamClient', () => {
  let Iam;
  let fetch;

  const answer = (status, body) => new Response(
    body === undefined ? null : typeof body === 'string' ? body : JSON.stringify(body),
    { status, headers: typeof body === 'string' ? { 'content-type': 'text/plain' } : { 'content-type': 'application/json' } }
  );
  const sent = () => {
    const [url, init] = fetch.mock.calls.at(-1);
    return { url, method: init.method, body: init.body === undefined ? undefined : JSON.parse(init.body) };
  };

  beforeAll(() => {
    process.env.IAM_PROVISIONING_URL = IAM;
    jest.isolateModules(() => {
      Iam = require('#src/service/IamClient');
    });
  });

  beforeEach(() => {
    fetch = jest.spyOn(global, 'fetch');
  });

  afterEach(() => {
    fetch.mockRestore();
  });

  describe('provision', () => {
    it('records the resource under its resource name', async () => {
      fetch.mockResolvedValue(answer(200, {}));

      await Iam.provision('participant', 'dfsp-a');

      expect(sent()).toEqual({ url: `${IAM}/provision`, method: 'POST', body: { resourceName: 'participant', id: 'dfsp-a' } });
    });

    it('fails with the status and reasons the IAM gave when it refuses', async () => {
      fetch.mockResolvedValue(answer(422, { errors: ['no resource name Participant'] }));

      const refused = await Iam.provision('Participant', 'dfsp-a').catch((err) => err);

      expect(refused).toMatchObject({ name: 'IamError', status: 422, errors: ['no resource name Participant'] });
      expect(refused.message).toContain('no resource name Participant');
    });

    it('fails with the body as its reason when the IAM answers in plain text', async () => {
      fetch.mockResolvedValue(answer(502, 'bad gateway'));

      await expect(Iam.provision('participant', 'dfsp-a')).rejects.toMatchObject({ status: 502, errors: ['bad gateway'] });
    });
  });

  describe('deprovision', () => {
    it('removes the resource and answers the subjects left holding no role', async () => {
      fetch.mockResolvedValue(answer(200, { orphaned: ['person-1'] }));

      expect(await Iam.deprovision('participant', 'dfsp-a')).toEqual(['person-1']);
      expect(sent()).toEqual({ url: `${IAM}/provision`, method: 'DELETE', body: { resourceName: 'participant', id: 'dfsp-a' } });
    });
  });

  describe('accounts', () => {
    it('answers the person the IAM found or created', async () => {
      fetch.mockResolvedValue(answer(200, { subject: 'person-1', created: true, invited: true }));

      expect(await Iam.createAccount('admin@example.test')).toEqual({ subject: 'person-1', created: true, invited: true });
      expect(sent()).toEqual({ url: `${IAM}/accounts`, method: 'POST', body: { email: 'admin@example.test' } });
    });

    it('retires a person by their subject', async () => {
      fetch.mockResolvedValue(answer(204));

      await Iam.deleteAccount('person/1');

      expect(sent()).toEqual({ url: `${IAM}/accounts/person%2F1`, method: 'DELETE', body: undefined });
    });

    it('fails when the IAM refuses to retire a person who holds a role', async () => {
      fetch.mockResolvedValue(answer(409, { errors: ['person-1 holds a role'] }));

      await expect(Iam.deleteAccount('person-1')).rejects.toMatchObject({ name: 'IamError', status: 409 });
    });
  });

  describe('clients', () => {
    it('answers the client the IAM created', async () => {
      fetch.mockResolvedValue(answer(201, { subject: 'dfsp-a', secret: 's1' }));

      expect(await Iam.createClient({ id: 'dfsp-a', name: 'PM4ML client' })).toEqual({ subject: 'dfsp-a', secret: 's1' });
      expect(sent()).toEqual({ url: `${IAM}/clients`, method: 'POST', body: { id: 'dfsp-a', name: 'PM4ML client' } });
    });

    it('answers null when a client with the id exists', async () => {
      fetch.mockResolvedValue(answer(409, { errors: ['dfsp-a exists'] }));

      expect(await Iam.createClient({ id: 'dfsp-a' })).toBeNull();
    });

    it('answers the new secret, or null when there is no such client', async () => {
      fetch.mockResolvedValueOnce(answer(200, { subject: 'dfsp-a', secret: 's2' }));
      expect(await Iam.rotateClientSecret('dfsp-a')).toEqual({ subject: 'dfsp-a', secret: 's2' });
      expect(sent()).toEqual({ url: `${IAM}/clients/dfsp-a/secret`, method: 'POST', body: undefined });

      fetch.mockResolvedValueOnce(answer(404, { errors: ['no client dfsp-a'] }));
      expect(await Iam.rotateClientSecret('dfsp-a')).toBeNull();
    });

    it('retires a client by its id', async () => {
      fetch.mockResolvedValue(answer(204));

      await Iam.deleteClient('dfsp-a');

      expect(sent()).toEqual({ url: `${IAM}/clients/dfsp-a`, method: 'DELETE', body: undefined });
    });
  });

  describe('assignments', () => {
    it('gives and takes a role over the resources named', async () => {
      fetch.mockResolvedValue(answer(200, {}));

      await Iam.assign('person-1', 'dfsp-operator', { participant: 'dfsp-a' });
      expect(sent()).toEqual({
        url: `${IAM}/subjects/person-1/assignments`,
        method: 'POST',
        body: { role: 'dfsp-operator', resources: { participant: 'dfsp-a' } }
      });

      fetch.mockResolvedValue(answer(200, {}));
      await Iam.unassign('person-1', 'dfsp-operator', { participant: 'dfsp-a' });
      expect(sent()).toEqual({
        url: `${IAM}/subjects/person-1/assignments`,
        method: 'DELETE',
        body: { role: 'dfsp-operator', resources: { participant: 'dfsp-a' } }
      });
    });

    it('fails when the IAM refuses the role over the resources named', async () => {
      fetch.mockResolvedValue(answer(422, { errors: ['dfsp-operator is not keyed by Participant'] }));

      await expect(Iam.assign('person-1', 'dfsp-operator', { Participant: 'dfsp-a' })).rejects.toMatchObject({ status: 422 });
    });
  });
});
