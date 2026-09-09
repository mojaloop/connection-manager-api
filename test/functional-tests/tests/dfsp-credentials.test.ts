import { ApiHelper, MethodEnum, ApiHelperOptions } from '../util/api-helper';
import { MailpitHelper } from '../util/mailpit-helper';
import { KratosHelper } from '../util/kratos-helper';
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
      baseUrl: Config.mcmEndpoint,
      kratosUrl: Config.kratosPublicUrl
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
    expect(message.Text).toMatch(/invited/i);
    expect(message.Text).toMatch(/account/i);

    const invitationLink = mailpitHelper.extractInvitationLink(message.Text);
    expect(invitationLink).toBeTruthy();

    const kratosHelper = new KratosHelper(Config.kratosPublicUrl);
    await kratosHelper.completePasswordSetup(invitationLink!, dfspPassword);

    const dfspUserApiHelper = new ApiHelper({
      login: {
        username: dfspEmail,
        password: dfspPassword,
        baseUrl: Config.mcmEndpoint,
        kratosUrl: Config.kratosPublicUrl
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

    const machineApiHelper = () => new ApiHelper({
      oauth: {
        clientId: dfspClientId,
        clientSecret: dfspClientSecret,
        tokenUrl: `${Config.hydraPublicUrl}/oauth2/token`
      }
    });

    test('should access own DFSP resources on the external surface', async () => {
      const statusResponse = await machineApiHelper().sendRequest({
        method: MethodEnum.GET,
        url:`${Config.mcmExternalEndpoint}/dfsps/${dfspId}/status`,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(statusResponse.status).toBe(200);
    });

    test('should not reach the DFSP list on the external surface', async () => {
      // The route only exists on the internal (portal) surface; Oathkeeper
      // returns 404 for URLs no rule matches.
      const dfspListResponse = await machineApiHelper().sendRequest({
        method: MethodEnum.GET,
        url:`${Config.mcmExternalEndpoint}/dfsps`,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(dfspListResponse.status).toBe(404);
    });

    test('should be rejected on the internal surface', async () => {
      // Internal rules authenticate with the Kratos session cookie only; a
      // machine JWT satisfies no authenticator there.
      const internalResponse = await machineApiHelper().sendRequest({
        method: MethodEnum.GET,
        url:`${Config.mcmEndpoint}/dfsps/${dfspId}/status`,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      expect(internalResponse.status).toBe(401);
    });
  });
});
