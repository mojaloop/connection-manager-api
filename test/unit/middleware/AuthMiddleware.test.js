const { caller } = require('@mojaloop/authz/testing');

describe('the guard on the request', () => {
  const operator = caller().reaching('dfsps', ['dfsp-a']);

  const guarded = (iamEnabled) => {
    process.env.IAM_ENABLED = iamEnabled;
    let AuthMiddleware;
    jest.isolateModules(() => {
      AuthMiddleware = require('#src/middleware/AuthMiddleware');
    });
    const req = {};
    AuthMiddleware.createGuardMiddleware(operator.guard)(req, {}, () => {});
    return req;
  };

  afterEach(() => {
    delete process.env.IAM_ENABLED;
  });

  it('answers from the scope the gateway sent when the IAM is on', () => {
    const req = guarded('true');
    expect(req.authz(req, 'dfsps').ids).toEqual(['dfsp-a']);
  });

  it('reaches every DFSP when the IAM is off', () => {
    const req = guarded('false');
    expect(req.authz(req, 'dfsps').restricted).toBe(false);
  });
});
