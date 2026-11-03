const { caller } = require('@mojaloop/authz/testing');
const JWSCertsController = require('#src/controllers/JWSCerts');
const JWSCertsService = require('#src/service/JWSCertsService');

jest.mock('#src/utils/writer', () => ({ writeJson: jest.fn() }));
jest.mock('#src/service/JWSCertsService', () => ({ createDfspExternalJWSCerts: jest.fn().mockResolvedValue([]) }));

const upload = (who) => {
  const req = {
    method: 'POST',
    openapi: { pathParams: {} },
    context: {},
    body: [{ dfspId: 'external-a', publicKey: 'KEY' }],
    query: {},
    authz: who.guard,
  };
  JWSCertsController.createDfspExternalJWSCerts(req, {}, jest.fn());
};

describe('uploading external JWS certificates', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('records the DFSP a caller stands for as their source', () => {
    upload(caller().reaching('dfsps', ['dfsp-a']));
    expect(JWSCertsService.createDfspExternalJWSCerts).toHaveBeenCalledWith({}, expect.any(Array), 'dfsp-a');
  });

  it('records no source for a hub caller', () => {
    upload(caller().reachingAll('dfsps'));
    expect(JWSCertsService.createDfspExternalJWSCerts).toHaveBeenCalledWith({}, expect.any(Array), undefined);
  });

  it('refuses a caller limited to several DFSPs, who names no one source', () => {
    expect(() => upload(caller().reaching('dfsps', ['dfsp-a', 'dfsp-b']))).toThrow(expect.objectContaining({ status: 403 }));
    expect(JWSCertsService.createDfspExternalJWSCerts).not.toHaveBeenCalled();
  });
});
