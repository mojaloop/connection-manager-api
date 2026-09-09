/*****
 License
 --------------
 Copyright © 2020-2025 Mojaloop Foundation
 The Mojaloop files are made available by the Mojaloop Foundation under the Apache License, Version 2.0 (the "License") and you may not use these files except in compliance with the License. You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, the Mojaloop files are distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the License for the specific language governing permissions and limitations under the License.
 **/

const KratosService = require('../../src/service/KratosService');
const Constants = require('../../src/constants/Constants');
const { createUniqueDfsp } = require('./test-helpers');

describe('KratosService Integration Tests', () => {
  let testDfsp;
  let identityId;

  beforeEach(() => {
    testDfsp = createUniqueDfsp();
    identityId = null;
  });

  afterEach(async () => {
    if (identityId) {
      try { await KratosService.deleteIdentity(identityId); } catch (_) { /* ignore */ }
    }
  });

  describe('createIdentity', () => {
    it('creates an identity with email + roles traits, dfspId metadata, and a verifiable email', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId);
      identityId = result.identityId;

      expect(typeof identityId).toBe('string');
      expect(identityId).toMatch(/^[0-9a-f-]{36}$/i);

      const fetched = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(fetched).toBeTruthy();
      expect(fetched.id).toBe(identityId);
      expect(fetched.traits.email).toBe(testDfsp.email);
      // The identity says who someone is; what they may do is an edge in the
      // permission graph, so no role ever appears in a trait
      expect(fetched.traits.roles).toBeUndefined();
      expect(fetched.metadata_public.dfspId).toBe(testDfsp.dfspId);
      expect(fetched.verifiable_addresses?.[0]?.value).toBe(testDfsp.email);
      expect(fetched.verifiable_addresses?.[0]?.verified).toBe(false);
    });

    it('returns the existing identity id when called twice for the same email', async () => {
      const first = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId);
      identityId = first.identityId;
      const second = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId);
      expect(second.identityId).toBe(first.identityId);
    });

    it('creates a hub admin (no dfspId): the email trait alone, no dfspId metadata', async () => {
      const adminEmail = `admin-${Date.now()}@example.com`;
      const result = await KratosService.createIdentity(adminEmail, null);
      identityId = result.identityId;

      const fetched = await KratosService.findIdentityByEmail(adminEmail);
      expect(fetched.traits).toEqual({ email: adminEmail });
      expect(fetched.metadata_public?.dfspId).toBeUndefined();
    });
  });

  describe('findIdentityByEmail', () => {
    it('returns null for unknown email', async () => {
      const result = await KratosService.findIdentityByEmail(`unknown-${Date.now()}@example.com`);
      expect(result).toBeNull();
    });
  });

  describe('sendInvitationEmail', () => {
    it('triggers a Kratos recovery flow for the identity (Kratos courier dispatches the email)', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId);
      identityId = result.identityId;

      await expect(KratosService.sendInvitationEmail(testDfsp.email)).resolves.toBeUndefined();
    });

    it('is a no-op when called with no email', async () => {
      await expect(KratosService.sendInvitationEmail(undefined)).resolves.toBeUndefined();
    });
  });

  describe('deleteIdentity', () => {
    it('removes an existing identity', async () => {
      const result = await KratosService.createIdentity(testDfsp.email, testDfsp.dfspId);
      const createdId = result.identityId;

      await KratosService.deleteIdentity(createdId);
      identityId = null;

      const fetched = await KratosService.findIdentityByEmail(testDfsp.email);
      expect(fetched).toBeNull();
    });

    it('is a no-op when the identity does not exist', async () => {
      await expect(KratosService.deleteIdentity('00000000-0000-0000-0000-000000000000'))
        .resolves.toBeUndefined();
    });
  });
});
