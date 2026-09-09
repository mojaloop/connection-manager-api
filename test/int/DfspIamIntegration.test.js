/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const { createContext, destroyContext } = require('./context');
const PkiService = require('../../src/service/PkiService');
const HydraService = require('../../src/service/HydraService');
const KratosService = require('../../src/service/KratosService');
const CredentialsService = require('../../src/service/CredentialsService');
const IamProvisioning = require('../../src/service/IamProvisioningClient');
const { createUniqueDfsp } = require('./test-helpers');

// Read-only view of the graph, so the test can assert what provisioning wrote
// without holding write access the service itself no longer has.
const KETO_READ_URL = process.env.KETO_READ_URL ?? 'http://keto-read.mcm.localhost';

const tuples = async (params) => {
  const response = await fetch(`${KETO_READ_URL}/relation-tuples?${new URLSearchParams(params)}`);
  if (!response.ok) throw new Error(`Keto answered ${response.status}`);
  return (await response.json()).relation_tuples ?? [];
};

const Constants = require('../../src/constants/Constants');

const RESOURCE_NAME = Constants.IAM.DFSP_RESOURCE_NAME;
const operatorRole = (dfspId) => `${Constants.IAM.DFSP_ADMIN_ROLE}@${RESOURCE_NAME}=${dfspId}`;
const clientRole = (dfspId) => `${Constants.IAM.DFSP_CLIENT_ROLE}@${RESOURCE_NAME}=${dfspId}`;

const roleMembers = async (role) =>
  (await tuples({ namespace: 'Role', object: role, relation: 'members' })).map((t) => t.subject_id);

const rolesOf = async (subjectId) =>
  (await tuples({ namespace: 'Role', relation: 'members', subject_id: subjectId })).map((t) => t.object);

const cleanup = async (ctx, dfsp) => {
  try { await PkiService.deleteDFSP(ctx, dfsp.dfspId); } catch (_) { /* ignore */ }
  try { await HydraService.deleteClient(dfsp.dfspId); } catch (_) { /* ignore */ }
  const ident = await KratosService.findIdentityByEmail(dfsp.email).catch(() => null);
  if (ident) {
    try { await KratosService.deleteIdentity(ident.id); } catch (_) { /* ignore */ }
  }
  try { await IamProvisioning.deprovisionDfsp(dfsp.dfspId); } catch (_) { /* ignore */ }
  try { await ctx.pkiEngine.deleteSecret(`api-credentials/${dfsp.dfspId}`); } catch (_) { /* ignore */ }
};

describe('DFSP IAM Integration Tests', () => {
  let context;
  let testDfsp;

  beforeAll(async () => {
    context = await createContext();
  });

  afterAll(async () => {
    if (context) {
      if (testDfsp) await cleanup(context, testDfsp);
      await destroyContext(context);
    }
  });

  beforeEach(async () => {
    testDfsp = createUniqueDfsp();
    await cleanup(context, testDfsp);
  });

  describe('DFSP Lifecycle Management', () => {
    it('creates a DFSP with a Hydra client, a Kratos identity, and its roles', async () => {
      await PkiService.createDFSP(context, testDfsp);

      const client = await HydraService.getClient(testDfsp.dfspId);
      expect(client).toBeTruthy();
      expect(client.client_id).toBe(testDfsp.dfspId);
      expect(client.grant_types).toContain('client_credentials');

      const identity = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(identity).toBeTruthy();
      expect(identity.traits.email).toBe(testDfsp.email);
      expect(identity.metadata_public.dfspId).toBe(testDfsp.dfspId);

      // One role instance per principal: the invited human administers the
      // DFSP, its machine client acts for it
      expect(await roleMembers(operatorRole(testDfsp.dfspId))).toContain(identity.id);
      expect(await roleMembers(clientRole(testDfsp.dfspId))).toContain(testDfsp.dfspId);

      // The grants sit on the DFSP itself and are held by the role's members
      const granted = await tuples({
        namespace: 'mcm',
        object: `${RESOURCE_NAME}/${testDfsp.dfspId}`,
        relation: 'getDFSPca',
      });
      expect(granted.map(t => t.subject_set?.object)).toEqual(
        expect.arrayContaining([operatorRole(testDfsp.dfspId), clientRole(testDfsp.dfspId)])
      );
      expect(granted.every(t => t.subject_id === undefined)).toBe(true);

      // Nothing was granted over the whole resource name, so the DFSP sees only itself
      const nameWide = await tuples({ namespace: 'mcm', object: `${RESOURCE_NAME}/__all__`, relation: 'getDFSPca' });
      expect(nameWide.map(t => t.subject_set?.object)).not.toContain(operatorRole(testDfsp.dfspId));
    });

    it('rotates credentials via CredentialsService and keeps them retrievable from Vault', async () => {
      await PkiService.createDFSP(context, testDfsp);

      const first = await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(first.status).toBe(201);
      expect(first.data.clientId).toBe(testDfsp.dfspId);

      const fetched = await CredentialsService.getCredentials(context, testDfsp.dfspId);
      expect(fetched.clientSecret).toBe(first.data.clientSecret);

      const second = await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(second.data.clientSecret).not.toBe(first.data.clientSecret);

      const refetched = await CredentialsService.getCredentials(context, testDfsp.dfspId);
      expect(refetched.clientSecret).toBe(second.data.clientSecret);
    });

    it('issues a working JWT against Hydra using the stored credentials', async () => {
      await PkiService.createDFSP(context, testDfsp);
      const created = await CredentialsService.createCredentials(context, testDfsp.dfspId);

      const auth = Buffer.from(`${created.data.clientId}:${created.data.clientSecret}`).toString('base64');
      const res = await fetch(`${Constants.HYDRA.PUBLIC_URL}/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${auth}`,
        },
        body: new URLSearchParams({ grant_type: 'client_credentials', audience: Constants.HYDRA.AUDIENCE }),
      });
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(typeof json.access_token).toBe('string');
    });

    it('removes the Hydra client, the identity, and the DFSP roles on delete', async () => {
      await PkiService.createDFSP(context, testDfsp);
      await CredentialsService.createCredentials(context, testDfsp.dfspId);
      expect(await HydraService.getClient(testDfsp.dfspId)).toBeTruthy();

      const identityBefore = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(identityBefore).toBeTruthy();

      await PkiService.deleteDFSP(context, testDfsp.dfspId);

      expect(await HydraService.getClient(testDfsp.dfspId)).toBeNull();
      expect(await KratosService.findIdentityByEmail(testDfsp.email)).toBeNull();
      expect(await roleMembers(operatorRole(testDfsp.dfspId))).toHaveLength(0);
      expect(await roleMembers(clientRole(testDfsp.dfspId))).toHaveLength(0);

      // and the grants those roles held are gone with them
      expect(await tuples({ namespace: 'mcm', object: `${RESOURCE_NAME}/${testDfsp.dfspId}` })).toHaveLength(0);
    });

    it('retains a multi-DFSP identity when only one of its DFSPs is deleted', async () => {
      const secondDfsp = createUniqueDfsp({ email: testDfsp.email });
      try {
        await PkiService.createDFSP(context, testDfsp);
        await PkiService.createDFSP(context, secondDfsp);

        const identity = await KratosService.findIdentityByEmail(testDfsp.email);
        expect(identity).toBeTruthy();
        // the shared identity operates both DFSPs
        expect(await rolesOf(identity.id)).toEqual(
          expect.arrayContaining([operatorRole(testDfsp.dfspId), operatorRole(secondDfsp.dfspId)])
        );

        await PkiService.deleteDFSP(context, testDfsp.dfspId);

        const stillThere = await KratosService.findIdentityByEmail(testDfsp.email);
        expect(stillThere).toBeTruthy();
        expect(stillThere.id).toBe(identity.id);

        // ...and keeps the other DFSP's operator role
        expect(await rolesOf(identity.id)).toContain(operatorRole(secondDfsp.dfspId));
      } finally {
        await cleanup(context, secondDfsp);
      }
    });
  });

  describe('Error Recovery', () => {
    it('rolls back Hydra and Kratos resources when DFSPModel.create fails', async () => {
      const conflictDfsp = createUniqueDfsp();
      // Pre-create a conflicting Hydra client to force a downstream failure path
      // (this scenario also exercises the existing-client branch).
      await HydraService.createPM4MLClient(conflictDfsp.dfspId);

      const DFSPModel = require('../../src/models/DFSPModel');
      const originalCreate = DFSPModel.create;
      DFSPModel.create = jest.fn().mockRejectedValue(new Error('DB write failed'));

      try {
        await expect(PkiService.createDFSP(context, conflictDfsp)).rejects.toThrow('DB write failed');
      } finally {
        DFSPModel.create = originalCreate;
      }

      // Hydra client was deleted by rollback
      expect(await HydraService.getClient(conflictDfsp.dfspId)).toBeNull();
      // Identity was also deleted
      expect(await KratosService.findIdentityByEmail(conflictDfsp.email)).toBeNull();

      await cleanup(context, conflictDfsp);
    });
  });

  describe('Multi-DFSP Scenarios', () => {
    it('isolates Hydra clients, Kratos identities, and Keto tuples across DFSPs', async () => {
      const extra = [createUniqueDfsp(), createUniqueDfsp()];
      const all = [testDfsp, ...extra];

      try {
        await Promise.all(all.map(d => PkiService.createDFSP(context, d)));

        for (const d of all) {
          const client = await HydraService.getClient(d.dfspId);
          expect(client.client_id).toBe(d.dfspId);

          const identity = await KratosService.findIdentityByEmail(d.email);
          expect(identity.metadata_public.dfspId).toBe(d.dfspId);
        }

        const credSets = await Promise.all(all.map(d => CredentialsService.createCredentials(context, d.dfspId)));
        const secrets = credSets.map(c => c.data.clientSecret);
        expect(new Set(secrets).size).toBe(all.length);

        // Deleting one DFSP doesn't affect the others
        await PkiService.deleteDFSP(context, testDfsp.dfspId);
        expect(await HydraService.getClient(testDfsp.dfspId)).toBeNull();
        expect(await HydraService.getClient(extra[0].dfspId)).toBeTruthy();
        expect(await HydraService.getClient(extra[1].dfspId)).toBeTruthy();
      } finally {
        for (const d of extra) await cleanup(context, d);
      }
    });
  });
});
