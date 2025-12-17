/** ************************************************************************
 *  (C) Copyright Mojaloop Foundation 2020                                *
 *                                                                        *
 *  This file is made available under the terms of the license agreement  *
 *  specified in the corresponding source code repository.                *
 *                                                                        *
 *  ORIGINAL AUTHOR:                                                      *
 *       Yevhen Kyriukha <yevhen.kyriukha@modusbox.com>                   *
 ************************************************************************* */

const { logger } = require('../log/logger');

class CertManager {
  k8s;
  kc;
  k8sApi;

  constructor (config) {
    this.logger = config.logger;
    this.serverCertSecretName = config.serverCertSecretName;
    this.serverCertSecretNamespace = config.serverCertSecretNamespace;

    if (!this.logger || !this.serverCertSecretName || !this.serverCertSecretNamespace) {
      throw new Error('Missing one of the props: logger, serverCertSecretName, serverCertSecretNamespace');
    }
  }

  async initK8s () {
    this.k8s = await import('@kubernetes/client-node');
    this.kc = new this.k8s.KubeConfig();
    this.kc.loadFromDefault();

    this.k8sApi = this.kc.makeApiClient(this.k8s.CoreV1Api);
  }

  async renewServerCert () {
    const patch = [
      {
        op: 'replace',
        path: '/metadata/annotations',
        value: {
          'cert-manager.io/issuer-name': 'force-renewal-triggered'
        }
      }
    ];
    const options = {
      headers: { 'Content-type': this.k8s.PatchStrategy.JsonPatch },
    };

    this.logger.debug({
      message: 'Renewing cert',
      patch,
      options,
      name: this.serverCertSecretName,
      namespace: this.serverCertSecretNamespace
    });

    return this.k8sApi.patchNamespacedSecret(
      this.serverCertSecretName,
      this.serverCertSecretNamespace,
      patch,
      undefined,
      undefined,
      undefined,
      undefined,
      options
    )
      .then(() => { this.logger.info('Server cert renewal successful'); })
      .catch((err) => { this.logger.error('Error renewing server cert: ', err); });
  }
}

module.exports = CertManager;
