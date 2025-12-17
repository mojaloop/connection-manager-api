import { ApiHelper, MethodEnum, ApiHelperOptions } from '../util/api-helper';
import { MailpitHelper } from '../util/mailpit-helper';
import { KeycloakHelper } from '../util/keycloak-helper';
import Config from '../util/config';

describe('DFSP Credentials Tests', () => {

  let dfspId: string;
  let dfspEmail: string;
  let dfspPassword: string;
  let dfspClientId: string;
  let dfspClientSecret: string;

  const randomSeed = Math.floor(Math.random() * (10000 - 1)) + 1;

  const dfspObject = {
    dfspId: `cred${randomSeed}`,
    name: `cred${randomSeed}`,
    monetaryZoneId: 'XTS',
    isProxy: false,
    email: `cred${randomSeed}@example.com`
  }

  const adminApiHelper = new ApiHelper({
    login: {
      username: Config.username,
      password: Config.password,
      baseUrl: Config.mcmEndpoint
    }
  });

  beforeAll(async () => {
    dfspId = dfspObject.dfspId;
    dfspEmail = dfspObject.email;
    dfspPassword = `TestPass${randomSeed}!`;

    const mailpitHelper = new MailpitHelper(Config.mailpitEndpoint);
    await mailpitHelper.deleteAllMessages();

    const addDFSPResponse = await adminApiHelper.getResponseBody({
      method: MethodEnum.POST,
      url:`${Config.mcmEndpoint}/dfsps`,
      body: JSON.stringify(dfspObject),
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(addDFSPResponse.id).toBe(dfspId);

    await new Promise(resolve => setTimeout(resolve, 2000));

    const message = await mailpitHelper.getLatestMessageForEmail(dfspEmail);

    expect(message).toBeTruthy();
    expect(message.Text).toMatch(/update.*account/i);

    const invitationLink = mailpitHelper.extractInvitationLink(message.Text);
    expect(invitationLink).toBeTruthy();

    const keycloakHelper = new KeycloakHelper();
    await keycloakHelper.completePasswordSetup(invitationLink!, dfspPassword, {
      firstName: 'DFSP',
      lastName: 'User'
    });

    const dfspUserApiHelper = new ApiHelper({
      login: {
        username: dfspEmail,
        password: dfspPassword,
        baseUrl: Config.mcmEndpoint
      }
    });

    const profileResponse = await dfspUserApiHelper.sendRequest({
      method: MethodEnum.GET,
      url:`${Config.mcmEndpoint}/auth/profile`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    const credentialsResponse = await dfspUserApiHelper.sendRequest({
      method: MethodEnum.POST,
      url:`${Config.mcmEndpoint}/dfsps/${dfspId}/credentials`,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    expect(credentialsResponse.status).toBe(201);
    expect(credentialsResponse.data.clientId).toBe(dfspId);
    expect(credentialsResponse.data.clientSecret).toBeTruthy();

    dfspClientId = credentialsResponse.data.clientId;
    dfspClientSecret = credentialsResponse.data.clientSecret;
  });

  afterAll(async () => {
  });

  describe('Using DFSP Credentials', () => {

    test('should authenticate with DFSP credentials and access DFSP-specific endpoints', async () => {
      const dfspApiHelper = new ApiHelper({
        oauth: {
          clientId: dfspClientId,
          clientSecret: dfspClientSecret,
          tokenUrl: `http://keycloak.mcm.localhost/realms/dfsps/protocol/openid-connect/token`
        }
      });

      const dfspListResponse = await dfspApiHelper.sendRequest({
        method: MethodEnum.GET,
        url:`${Config.mcmEndpoint}/dfsps`,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(dfspListResponse.status).toBe(200);
      expect(Array.isArray(dfspListResponse.data)).toBe(true);
    });
  });
});
