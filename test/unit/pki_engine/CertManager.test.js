const CertManager = require('#src/pki_engine/CertManager');

describe('renewing the hub server certificate', () => {
  it('patches the secret cert-manager watches with a JSON patch', async () => {
    const logger = { debug: jest.fn(), info: jest.fn(), error: jest.fn() };
    const certManager = new CertManager({ logger, serverCertSecretName: 'hub-server-cert', serverCertSecretNamespace: 'mcm' });
    certManager.k8s = {
      PatchStrategy: { JsonPatch: 'application/json-patch+json' },
      setHeaderOptions: (key, value) => ({ headers: { [key]: value } }),
    };
    certManager.k8sApi = { patchNamespacedSecret: jest.fn().mockResolvedValue({}) };

    await certManager.renewServerCert();

    expect(logger.error).not.toHaveBeenCalled();
    expect(certManager.k8sApi.patchNamespacedSecret).toHaveBeenCalledWith(
      {
        name: 'hub-server-cert',
        namespace: 'mcm',
        body: [{ op: 'replace', path: '/metadata/annotations', value: { 'cert-manager.io/issuer-name': 'force-renewal-triggered' } }],
      },
      { headers: { 'Content-Type': 'application/json-patch+json' } },
    );
  });
});
