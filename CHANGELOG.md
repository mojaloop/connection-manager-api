# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [3.4.0](https://github.com/mojaloop/connection-manager-api/compare/v3.3.2...v3.4.0) (2025-12-12)


### Features

* **csi-1941:** add dfsp gauge for alerting functionality ([#175](https://github.com/mojaloop/connection-manager-api/issues/175)) ([de1767e](https://github.com/mojaloop/connection-manager-api/commit/de1767ed62a3c29064ff4df935cc22c05d117121))

### [3.3.2](https://github.com/mojaloop/connection-manager-api/compare/v3.3.1...v3.3.2) (2025-12-02)


### Chore

* add logging for cert manager ([#170](https://github.com/mojaloop/connection-manager-api/issues/170)) ([454dff4](https://github.com/mojaloop/connection-manager-api/commit/454dff4c771f5cef2945d90a7b472aa2f070f279))
* fix audit ([#171](https://github.com/mojaloop/connection-manager-api/issues/171)) ([00159e0](https://github.com/mojaloop/connection-manager-api/commit/00159e096b5f7503028bdac6d16974cad52c7998))

### [3.3.1](https://github.com/mojaloop/connection-manager-api/compare/v3.3.0...v3.3.1) (2025-12-01)


### Bug Fixes

* fix import on cert manager class ([#169](https://github.com/mojaloop/connection-manager-api/issues/169)) ([977a734](https://github.com/mojaloop/connection-manager-api/commit/977a73468d0b980d75b7ad5b9c6932cbf85d0082))

## [3.3.0](https://github.com/mojaloop/connection-manager-api/compare/v3.2.1...v3.3.0) (2025-11-27)


### Features

* add endpoint to rotate switch jws in certmanager ([#164](https://github.com/mojaloop/connection-manager-api/issues/164)) ([3498b10](https://github.com/mojaloop/connection-manager-api/commit/3498b10df04b8d37b5c2a5abb6e60995ba97355c)), closes [#167](https://github.com/mojaloop/connection-manager-api/issues/167)

### [3.2.1](https://github.com/mojaloop/connection-manager-api/compare/v3.2.0...v3.2.1) (2025-11-26)


### Bug Fixes

* cleanup ([7330e33](https://github.com/mojaloop/connection-manager-api/commit/7330e331353179f59582697596232306e3b07204))
* improve integration tests and add test helpers ([61fb2cb](https://github.com/mojaloop/connection-manager-api/commit/61fb2cb90035a14f9cd95a4b96d3101276d2952b))

## [3.2.0](https://github.com/mojaloop/connection-manager-api/compare/v3.2.0-storage-cluster.3...v3.2.0) (2025-11-25)

### [3.1.5](https://github.com/mojaloop/connection-manager-api/compare/v3.1.4...v3.1.5) (2025-11-20)


### Bug Fixes

* service bug fixes (DFSP validation, timeout overflow, error handling) ([7a64bb1](https://github.com/mojaloop/connection-manager-api/commit/7a64bb12d4775312eac3a911ed8b8926ecd88d55))

### [3.1.4](https://github.com/mojaloop/connection-manager-api/compare/v3.1.3...v3.1.4) (2025-11-20)


### Bug Fixes

* support intermediateChain as array in server certificates ([c7ef8e4](https://github.com/mojaloop/connection-manager-api/commit/c7ef8e4f358e11d538ff02ad88e10a7a247ab986))

### [3.1.3](https://github.com/mojaloop/connection-manager-api/compare/v3.1.2...v3.1.3) (2025-11-20)


### Bug Fixes

* cleanup ([666d153](https://github.com/mojaloop/connection-manager-api/commit/666d153160dd51c33d3dca75619279c106126a55))
* improve auth middleware and session configuration ([46ddc24](https://github.com/mojaloop/connection-manager-api/commit/46ddc247a9f54eebbc5ca9d87a2e72e9c88a3e11))
* increase timeout ([50cbd60](https://github.com/mojaloop/connection-manager-api/commit/50cbd6052498a67a7ab3cb5d448485bb2dd46fcf))
* increase timeout ([c596845](https://github.com/mojaloop/connection-manager-api/commit/c596845ee70bf7dc07952951f2abb114421a36c8))
* resolve Keycloak pagination issues with max:-1 parameter ([f4ed7b6](https://github.com/mojaloop/connection-manager-api/commit/f4ed7b665e89baa23710b1d8af1174285dec4e7b))

### [3.1.2](https://github.com/mojaloop/connection-manager-api/compare/v3.1.2-snapshot.2...v3.1.2) (2025-11-19)

### [3.1.1](https://github.com/pm4ml/connection-manager-api/compare/v3.1.0...v3.1.1) (2025-10-27)


### Bug Fixes

* add config for winston meta data ([#146](https://github.com/pm4ml/connection-manager-api/issues/146)) ([7aa190b](https://github.com/pm4ml/connection-manager-api/commit/7aa190b38bdfb62eea4fec073a44d047cc04bec0))

## [3.1.0](https://github.com/pm4ml/connection-manager-api/compare/v3.0.3...v3.1.0) (2025-10-10)


### Features

* add health checks and automated db migration ([b92c519](https://github.com/pm4ml/connection-manager-api/commit/b92c519b17afd6b5c0fd7caaa9b6af5a821d3984))


### Bug Fixes

* docker profile usage ([ae2c207](https://github.com/pm4ml/connection-manager-api/commit/ae2c207b2c013c1090c18bb303c38d3c117ebbfd))
* update health check path to /api/health ([3d4c22e](https://github.com/pm4ml/connection-manager-api/commit/3d4c22eca787e9c9e3bbbf23323473d2be2049d1))
* use imported docker image ([648216b](https://github.com/pm4ml/connection-manager-api/commit/648216b6389e61ce53a1a256ec504022f2ca1e90))
* use SELECT query for db health check instead of ping ([dc78a67](https://github.com/pm4ml/connection-manager-api/commit/dc78a6751580a3d52341df305ce3720b2565f98a))


### Refactor

* use dependency injection for database in health check ([296da19](https://github.com/pm4ml/connection-manager-api/commit/296da195a32ca87c176b00632aafacd0f7daf857))


### Chore

* bump ci version ([630b75f](https://github.com/pm4ml/connection-manager-api/commit/630b75f33d5b1c3749f300198960396f050a913b))
* bump deps ([4ef8626](https://github.com/pm4ml/connection-manager-api/commit/4ef8626afc76f73a7b42d213554338ce276c75b1))
* cleanup ([60a065c](https://github.com/pm4ml/connection-manager-api/commit/60a065c7975ce2dc6c7189c4cfa77534e39f92ba))
* update copyright headers in health files ([b93d901](https://github.com/pm4ml/connection-manager-api/commit/b93d90160a2daa61e3db8639d9f367e876ecba27))

### [3.0.3](https://github.com/pm4ml/connection-manager-api/compare/v3.0.2...v3.0.3) (2025-10-03)


### Bug Fixes

* **csi-1851:** ignored some grype vulnerabilities ([c50c4b2](https://github.com/pm4ml/connection-manager-api/commit/c50c4b2c65ed2111494c421569723c9fbcc5e70b))
* **csi-1851:** log constants and process.env with debug level ([713c174](https://github.com/pm4ml/connection-manager-api/commit/713c1742e4d74485dca12ecb13f7135dc7454dad))

### [3.0.2](https://github.com/pm4ml/connection-manager-api/compare/v3.0.1...v3.0.2) (2025-09-29)


### Bug Fixes

* check for existing DFSP inbound enrollment ([#141](https://github.com/pm4ml/connection-manager-api/issues/141)) ([00c1c20](https://github.com/pm4ml/connection-manager-api/commit/00c1c20e8fc9039726df918147752161a69bbcf4))

### [3.0.1](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0...v3.0.1) (2025-09-11)


### Chore

* address new logs ([90de1d1](https://github.com/pm4ml/connection-manager-api/commit/90de1d19003825032d261e5f958a22211541fe86))
* bump dep ([5308b4f](https://github.com/pm4ml/connection-manager-api/commit/5308b4fca56e2380f7c566308ed3c17ce9835292))
* fix ([0815f99](https://github.com/pm4ml/connection-manager-api/commit/0815f997d0ca9455f92d50b4c62f0c7d0a74a138))
* fix ([1f4f935](https://github.com/pm4ml/connection-manager-api/commit/1f4f935a4278d0cc0d126949d798bd53060e96d7))
* fix ([24fdab6](https://github.com/pm4ml/connection-manager-api/commit/24fdab6ed1c42bbdc529590b8ddb52fd90daf278))
* int tests ([90b918b](https://github.com/pm4ml/connection-manager-api/commit/90b918b7335db0d3beda73f412b29a8d2769629b))
* lock ([a7eaa2b](https://github.com/pm4ml/connection-manager-api/commit/a7eaa2b847cd6523dbc0dfbabaca9ec612b1c129))
* lock ([06482cc](https://github.com/pm4ml/connection-manager-api/commit/06482cc0c0999e5a99c54d15cde3e8b87cd5ff96))
* lock ([71a9dca](https://github.com/pm4ml/connection-manager-api/commit/71a9dcaff0254c855e58a3d212ce310fbf1769b1))
* update logging ([a5417de](https://github.com/pm4ml/connection-manager-api/commit/a5417dea955f3cbb05deb41c027e29379088060a))

## [3.0.0](https://github.com/pm4ml/connection-manager-api/compare/v2.14.1...v3.0.0) (2025-09-10)


### Bug Fixes

* deps ([f1a30a5](https://github.com/pm4ml/connection-manager-api/commit/f1a30a532cd3c9998420134b445a23f72b6a757c))
* docker compose ([35bef43](https://github.com/pm4ml/connection-manager-api/commit/35bef43b1dcca0d0ea649cdcf447f02c9a0ff05c))

## [3.0.0-snapshot.25](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.24...v3.0.0-snapshot.25) (2025-07-18)


### Bug Fixes

* test ([fd5e43b](https://github.com/pm4ml/connection-manager-api/commit/fd5e43b7a30c2bcd0f34c67e6f7d43a87ab25aa7))

## [3.0.0-snapshot.24](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.23...v3.0.0-snapshot.24) (2025-07-18)


### Bug Fixes

* keycloak group assignment ([20b2afe](https://github.com/pm4ml/connection-manager-api/commit/20b2afe4fb5d431d7dea264ed165f16dea7c0ca9))

## [3.0.0-snapshot.23](https://github.com/pm4ml/connection-manager-api/compare/v2.14.0...v3.0.0-snapshot.23) (2025-07-18)


### Bug Fixes

* don't assign dfsp to MTA group ([1292b46](https://github.com/pm4ml/connection-manager-api/commit/1292b46b401cc79af98e7826af0e5c202fe1908b))
* tests ([c26c50f](https://github.com/pm4ml/connection-manager-api/commit/c26c50f74a2a47b1fc096de5d8421ab5cb611bc5))


### Chore

* bump deps ([a1b2f91](https://github.com/pm4ml/connection-manager-api/commit/a1b2f91eb072572ff8794cc98ecd9e8da6196142))

## [3.0.0-snapshot.22](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.21...v3.0.0-snapshot.22) (2025-07-15)


### Bug Fixes

* assigning keto client roles ([99fb231](https://github.com/pm4ml/connection-manager-api/commit/99fb2315cf04076572acf97a4390e268b773434d))

## [3.0.0-snapshot.21](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.20...v3.0.0-snapshot.21) (2025-07-13)

## [3.0.0-snapshot.20](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.19...v3.0.0-snapshot.20) (2025-07-13)

## [3.0.0-snapshot.19](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.18...v3.0.0-snapshot.19) (2025-07-12)

## [3.0.0-snapshot.18](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.17...v3.0.0-snapshot.18) (2025-07-12)


### Features

* extract user roles from request headers ([1058907](https://github.com/pm4ml/connection-manager-api/commit/1058907d27352ebee40073eabf34231bcc2609f9))

## [3.0.0-snapshot.17](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.16...v3.0.0-snapshot.17) (2025-07-12)


### Bug Fixes

* import ([fdc5afe](https://github.com/pm4ml/connection-manager-api/commit/fdc5afecc4bd5f45b9ee5409e0a2c8c33b35c489))

## [3.0.0-snapshot.16](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.15...v3.0.0-snapshot.16) (2025-07-12)

## [3.0.0-snapshot.15](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.14...v3.0.0-snapshot.15) (2025-07-12)


### Bug Fixes

* tests ([7dcd5cc](https://github.com/pm4ml/connection-manager-api/commit/7dcd5cc4cab1887d42956bd89a0d282f7b857eb3))
* tests ([38f4e8a](https://github.com/pm4ml/connection-manager-api/commit/38f4e8a3fb010a7799cf46749bf7d0073d1ee6ff))
* tests ([026ae06](https://github.com/pm4ml/connection-manager-api/commit/026ae06a8dc8b3ca46c6133762f53509a80b9899))
* tests ([81a81f0](https://github.com/pm4ml/connection-manager-api/commit/81a81f04704c2b3a9329043b9cd5d01c6e85f543))

## [3.0.0-snapshot.14](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.13...v3.0.0-snapshot.14) (2025-07-12)


### Bug Fixes

* tests ([e2baf6a](https://github.com/pm4ml/connection-manager-api/commit/e2baf6a19a717b206a220e5b7f9f4b78becefc2f))

## [3.0.0-snapshot.13](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.12...v3.0.0-snapshot.13) (2025-07-12)


### Bug Fixes

* user removal ([39d4cdc](https://github.com/pm4ml/connection-manager-api/commit/39d4cdc7e14ed74e8efd6b37cc8f5346932c428c))

## [3.0.0-snapshot.12](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.11...v3.0.0-snapshot.12) (2025-07-12)

## [3.0.0-snapshot.11](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.10...v3.0.0-snapshot.11) (2025-07-12)

## [3.0.0-snapshot.10](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.9...v3.0.0-snapshot.10) (2025-07-12)


### Bug Fixes

* config ([e4add2b](https://github.com/pm4ml/connection-manager-api/commit/e4add2b506bf646a7c5a2cab9675af9de9d40ada))

## [3.0.0-snapshot.9](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.8...v3.0.0-snapshot.9) (2025-07-11)


### Bug Fixes

* keto user id ([5b301a1](https://github.com/pm4ml/connection-manager-api/commit/5b301a111fe404a14ab7e8f1bb0277062aee543c))

## [3.0.0-snapshot.8](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.7...v3.0.0-snapshot.8) (2025-07-08)


### Features

* add docker publish github workflow ([427c662](https://github.com/pm4ml/connection-manager-api/commit/427c6629749c82eda224fea4a1c9ee65ced5583b))

## [3.0.0-snapshot.7](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.6...v3.0.0-snapshot.7) (2025-07-08)

## [3.0.0-snapshot.6](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.5...v3.0.0-snapshot.6) (2025-07-08)


### Bug Fixes

* audit ([41757cb](https://github.com/pm4ml/connection-manager-api/commit/41757cbeebf86279260a910447f652ca24342fb7))
* test ([25c8e87](https://github.com/pm4ml/connection-manager-api/commit/25c8e876a5bc2755ca7d9f8204ac2a7b977c94d5))
* tests ([60b7b0c](https://github.com/pm4ml/connection-manager-api/commit/60b7b0c4fe931b865ff8c1c8a07ced144e37cfb7))

## [3.0.0-snapshot.5](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.4...v3.0.0-snapshot.5) (2025-07-08)

## [3.0.0-snapshot.4](https://github.com/pm4ml/connection-manager-api/compare/v2.13.0...v3.0.0-snapshot.4) (2025-07-08)


### Features

* add keto support ([9bad7fe](https://github.com/pm4ml/connection-manager-api/commit/9bad7fe2e64a762fd71a30b8d2f3b83e1a844997))

## [3.0.0-snapshot.3](https://github.com/pm4ml/connection-manager-api/compare/v3.0.0-snapshot.2...v3.0.0-snapshot.3) (2025-07-03)

## [3.0.0-snapshot.2](https://github.com/pm4ml/connection-manager-api/compare/v2.12.0...v3.0.0-snapshot.2) (2025-07-03)


### Features

* add test cases ([948cf1e](https://github.com/pm4ml/connection-manager-api/commit/948cf1ef2311c7121e7d03dc6f66b91e04126749))
* implement OpenID Connect authentication and session management ([7ef2757](https://github.com/pm4ml/connection-manager-api/commit/7ef27574c1529d916fee0a3ce96c06de5bdaccc8))
* implement pm4ml credentials management ([1d8cc2e](https://github.com/pm4ml/connection-manager-api/commit/1d8cc2e8cea299fd88299b4979641a6da9cc2872))


### Bug Fixes

* debug ([35ef711](https://github.com/pm4ml/connection-manager-api/commit/35ef7110642baa90f2b6840478ea17d68772ce4e))
* disable dfsp watcher by default ([a33b2a5](https://github.com/pm4ml/connection-manager-api/commit/a33b2a55e7f17521394c3c02789245c4e25cbf18))
* docker envs ([5dda5a9](https://github.com/pm4ml/connection-manager-api/commit/5dda5a900bd485ef1f081796cbb5dc6a165c9503))
* env ([4f12944](https://github.com/pm4ml/connection-manager-api/commit/4f12944b75df45768c523fc372bb640c74d4e260))
* env ([435c527](https://github.com/pm4ml/connection-manager-api/commit/435c5279820b8f996ed6c3e917de820f90328ad8))
* envs ([c5498fa](https://github.com/pm4ml/connection-manager-api/commit/c5498faf0d7fb412686fb03d7dfb8d0be00c47c1))
* esm dep import ([c15bd14](https://github.com/pm4ml/connection-manager-api/commit/c15bd1485bbbf6a752dacc211b0fe8812e642aa3))
* gitignore ([5feb5cb](https://github.com/pm4ml/connection-manager-api/commit/5feb5cb3f1cd992059d1da42d0292d7ce7ca7aa6))
* health check ([ceded2d](https://github.com/pm4ml/connection-manager-api/commit/ceded2d8c81d1b4c2c03b7af8ad4a1f51e9a0fd4))
* increase test timeout ([41a9d3e](https://github.com/pm4ml/connection-manager-api/commit/41a9d3e088fe72292091571e5378ebc02c562c24))
* node ver ([af51f39](https://github.com/pm4ml/connection-manager-api/commit/af51f39fef4dc16f52814b37513b6e3433b382f4))
* prev commit ([6a812e3](https://github.com/pm4ml/connection-manager-api/commit/6a812e3e8f7c8b8ae6a58f8910d880cd91be8ad4))
* tests ([0da9c93](https://github.com/pm4ml/connection-manager-api/commit/0da9c932657f98b45d92ddc87f9b10d631a0179f))
* timeout ([0463891](https://github.com/pm4ml/connection-manager-api/commit/046389194e3de5053918b21eac0b34fe944226a5))


### Chore

* add example env file ([03c1f02](https://github.com/pm4ml/connection-manager-api/commit/03c1f02111aae77d52a0bf8c1e92e0ff9b6dcd8e))
* bump deps ([95532f9](https://github.com/pm4ml/connection-manager-api/commit/95532f99fbae3fd467f6d4af975ff324b6023165))
* bump deps ([e739c3c](https://github.com/pm4ml/connection-manager-api/commit/e739c3c4e87ef5c96a613a476849fc9703e731f5))
* cleanup ([f6001f9](https://github.com/pm4ml/connection-manager-api/commit/f6001f9263fda3a46309e7bf47a2b02cd024a50b))
* cleanup ([d2b032d](https://github.com/pm4ml/connection-manager-api/commit/d2b032d19c6f3951f9bb1102b47cc2c9476265ea))
* cleanup ([33e86f3](https://github.com/pm4ml/connection-manager-api/commit/33e86f30a5bfeffb5d353694e86d59363f9f6700))
* cleanup ([597be0d](https://github.com/pm4ml/connection-manager-api/commit/597be0dc68d9cc04b2f25a604d7cd8a5e10e5d42))
* cleanup ([c9f2644](https://github.com/pm4ml/connection-manager-api/commit/c9f26441c0da771f4128b9aeb558ab95abdb9b7d))
* cleanup ([f69f46c](https://github.com/pm4ml/connection-manager-api/commit/f69f46c8b9a789df366b17825f0285d6eb111ba6))
* cleanup ([1033324](https://github.com/pm4ml/connection-manager-api/commit/10333242c537be12063f44bbccf16b279b3d1199))
* cleanup auth config ([e78b613](https://github.com/pm4ml/connection-manager-api/commit/e78b613fb2c738b3f7bf0fed8b5ef0cbecc16343))
* fix cmd ([572a661](https://github.com/pm4ml/connection-manager-api/commit/572a661a09dde0e1ce1a20d422bf0e532f19638d))
* fix format ([a771eee](https://github.com/pm4ml/connection-manager-api/commit/a771eee29215d064657910c4119a51a72f5f812b))
* merge 'origin/main' into feat/keycloak ([6f054b1](https://github.com/pm4ml/connection-manager-api/commit/6f054b1b96ae826503f99cb37e7ac37a990b8392))
* skip wso2 tests ([201ede2](https://github.com/pm4ml/connection-manager-api/commit/201ede247a6938a21458d378ba2657898b2175c5))

### [2.14.1](https://github.com/pm4ml/connection-manager-api/compare/v2.14.0...v2.14.1) (2025-07-30)


### Bug Fixes

* dep ([48782b9](https://github.com/pm4ml/connection-manager-api/commit/48782b9776f8c0fc73132d62da8cc6c00fabb1e6))
* dep issues ([39dd0c2](https://github.com/pm4ml/connection-manager-api/commit/39dd0c2fb102f415a697a3848c93e172c5bd5c6a))
* issue with var format ([6ef13d5](https://github.com/pm4ml/connection-manager-api/commit/6ef13d57188ed22cd6b38a263c9d38a208bc804b))

## [2.14.0](https://github.com/pm4ml/connection-manager-api/compare/v2.13.0...v2.14.0) (2025-07-18)


### Features

* enabled ssl in db config ([8b8652f](https://github.com/pm4ml/connection-manager-api/commit/8b8652f775bd7ff280af9739bdee315637cb737a))


### Bug Fixes

* audit ([361207e](https://github.com/pm4ml/connection-manager-api/commit/361207ebc86b05e9dfe156a9b6b0772c747bcd25))
* int tests ([7fc6d29](https://github.com/pm4ml/connection-manager-api/commit/7fc6d2941fc0242be458eb1c437b7ac45cd2de01))


### Chore

* improvements ([3a8299a](https://github.com/pm4ml/connection-manager-api/commit/3a8299a146d59f131fff9e0a9c9aae41b5ce1f28))

## [2.13.0](https://github.com/pm4ml/connection-manager-api/compare/v2.13.0-snapshot.1...v2.13.0) (2025-07-08)


### Features

* **csi-1461:** updated deps ([776e91e](https://github.com/pm4ml/connection-manager-api/commit/776e91e6fe9825c239074d26c174b69aa8f334aa))

## [2.12.0](https://github.com/pm4ml/connection-manager-api/compare/v2.11.1...v2.12.0) (2025-06-17)


### Features

* add support for UPLOAD_PEER_JWS state machine ([#127](https://github.com/pm4ml/connection-manager-api/issues/127)) ([2d8cd74](https://github.com/pm4ml/connection-manager-api/commit/2d8cd74191a65140f0a986f9a667c6d981be1e6c))

### [2.11.1](https://github.com/pm4ml/connection-manager-api/compare/v2.11.0...v2.11.1) (2025-06-02)

## [2.11.0](https://github.com/pm4ml/connection-manager-api/compare/v2.11.0-snapshot.1...v2.11.0) (2025-06-02)


### Features

* **csi-1470:** updated deps ([f956050](https://github.com/pm4ml/connection-manager-api/commit/f9560507d4d6573cf78a0557f65baf9f19fef0d8))

### [2.10.5](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4...v2.10.5) (2025-05-30)

### [2.10.5](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4...v2.10.5) (2025-05-30)

### [2.10.4-snapshot.10](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.9...v2.10.4-snapshot.10) (2025-05-29)


### Bug Fixes

* **csi-1519:** code cleanup ([c67557e](https://github.com/pm4ml/connection-manager-api/commit/c67557ec59389bf53d619db86e6ed4ef79030cb6))

### [2.10.4-snapshot.9](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.8...v2.10.4-snapshot.9) (2025-05-29)


### Bug Fixes

* **csi-1519:** moved currency and monetaryZone seeds to migrations ([b11f381](https://github.com/pm4ml/connection-manager-api/commit/b11f38137c7edae61a5c5f72088bc696198f0c90))

### [2.10.4-snapshot.8](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.7...v2.10.4-snapshot.8) (2025-05-29)


### Bug Fixes

* **csi-1519:** skipped the last seed ([7eb0627](https://github.com/pm4ml/connection-manager-api/commit/7eb0627f6c8c6277f7b74e0130c72151214437fb))

### [2.10.4-snapshot.7](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.6...v2.10.4-snapshot.7) (2025-05-29)


### Bug Fixes

* **csi-1519:** run only seeds ([c1ebd55](https://github.com/pm4ml/connection-manager-api/commit/c1ebd5581f48e69777a7dacf3decaf80d29c1546))

### [2.10.4-snapshot.6](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.5...v2.10.4-snapshot.6) (2025-05-29)


### Bug Fixes

* **csi-1519:** run only migrations ([14a5ddf](https://github.com/pm4ml/connection-manager-api/commit/14a5ddf3a41f046f4bba4c10e5f293566678dfb5))

### [2.10.4-snapshot.5](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.4...v2.10.4-snapshot.5) (2025-05-29)


### Bug Fixes

* **csi-1519:** moved new migrations back ([3543e4f](https://github.com/pm4ml/connection-manager-api/commit/3543e4f3e7c7d99f4917cb7cb1e80f81bd0c24a1))

### [2.10.4-snapshot.4](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.3...v2.10.4-snapshot.4) (2025-05-29)


### Bug Fixes

* **csi-1519:** disabled asyncStackTraces in knexfile.js ([e7857d6](https://github.com/pm4ml/connection-manager-api/commit/e7857d6a536c68eab84671c7ca5952c986aa4774))

### [2.10.4-snapshot.3](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.2...v2.10.4-snapshot.3) (2025-05-29)


### Bug Fixes

* **csi-1519:** reverted npm scripts for migrations and seeds ([5f96fae](https://github.com/pm4ml/connection-manager-api/commit/5f96faed08e4c16172f2f662a696a1b860198878))

### [2.10.4-snapshot.2](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.1...v2.10.4-snapshot.2) (2025-05-29)


### Bug Fixes

* **csi-1519:** disable migrations for testing ([7b56cf5](https://github.com/pm4ml/connection-manager-api/commit/7b56cf53fd07298ee199dbf3bb178565b77467a5))

### [2.10.4-snapshot.1](https://github.com/pm4ml/connection-manager-api/compare/v2.10.4-snapshot.0...v2.10.4-snapshot.1) (2025-05-28)


### Bug Fixes

* **csi-1519:** updated upsertStatesStatus DB logic to use insert instead of upsert ([e4f7504](https://github.com/pm4ml/connection-manager-api/commit/e4f7504397342ec5db9366958caec3f6f5e32b1c))

### [2.10.4-snapshot.0](https://github.com/pm4ml/connection-manager-api/compare/v2.10.3...v2.10.4-snapshot.0) (2025-05-28)


### Bug Fixes

* **csi-1519:** used insert to avoid possible locking ([b436a8c](https://github.com/pm4ml/connection-manager-api/commit/b436a8c86aa66b49e13722e5d3401be7e251457c))

### [2.10.4](https://github.com/pm4ml/connection-manager-api/compare/v2.10.3...v2.10.4) (2025-05-29)


### Chore

* reenable ci, int tests, func tests and switch to jest ([#116](https://github.com/pm4ml/connection-manager-api/issues/116)) ([0883109](https://github.com/pm4ml/connection-manager-api/commit/088310943db6e19c9e8805ec24e9dfa79a0c23ab))

### [2.10.3](https://github.com/pm4ml/connection-manager-api/compare/v2.10.2...v2.10.3) (2025-05-28)


### Bug Fixes

* **csi-1519:** added migration recreate create_gid procedure ([fd470d2](https://github.com/pm4ml/connection-manager-api/commit/fd470d26d04183100bf41e834aa4ef3e451bf9fe))
* **csi-1519:** added migration to add primary key to gid table ([cd1e251](https://github.com/pm4ml/connection-manager-api/commit/cd1e251a78b87e9a178ce918cdccbbfb11827015))
* **csi-1519:** added migration to add primary key to gid table ([0ab27fd](https://github.com/pm4ml/connection-manager-api/commit/0ab27fdd9a9979b02bc94f9f7bc8c87ddef507bc))
* **csi-1519:** addressed PR comments ([8b01622](https://github.com/pm4ml/connection-manager-api/commit/8b01622b70876e437102faff1a7c7a5e3d163977))
* **csi-1519:** renamed [@update](https://github.com/update)_id to [@counter](https://github.com/counter) ([9f5eb38](https://github.com/pm4ml/connection-manager-api/commit/9f5eb38d1ba283e79bbfbe22d7e2df20f92a852a))

### [2.10.2](https://github.com/pm4ml/connection-manager-api/compare/v2.10.1...v2.10.2) (2025-05-23)


### Bug Fixes

* **csi-1483:** fix request data extraction mapping ([4997498](https://github.com/pm4ml/connection-manager-api/commit/49974988b7a57c3e1339a00947d3d5e51491550d))
* fix request data mapping ([fbf7d64](https://github.com/pm4ml/connection-manager-api/commit/fbf7d6438e3895f900357da4fe64a83b188d0e48))
* update api spec ([107ee06](https://github.com/pm4ml/connection-manager-api/commit/107ee06657e0e06b0e510b44bd5b9e3f0f9c82f7))


### Refactor

* simplify getRequestData function ([5b3da33](https://github.com/pm4ml/connection-manager-api/commit/5b3da33da516d527737e7b6b4d0002122248cd8c))
* simplify getRequestData function ([281db43](https://github.com/pm4ml/connection-manager-api/commit/281db432d4a515c94748ff4c7cb4b11ef9fecbb6))


### Chore

* override multer to fix audit ([e1af61c](https://github.com/pm4ml/connection-manager-api/commit/e1af61ca4a5878141e6e74b3c1ac701babeb13ee))
* update license ([c610dd6](https://github.com/pm4ml/connection-manager-api/commit/c610dd6dd449729e230cad330c6200f8df94d53e))
* upgrade node ([9780398](https://github.com/pm4ml/connection-manager-api/commit/9780398948a407d319bd13c5e4a65c6048a52519))

### [2.10.1](https://github.com/pm4ml/connection-manager-api/compare/v2.10.1-snapshot.5...v2.10.1) (2025-05-23)

## [2.10.0](https://github.com/pm4ml/connection-manager-api/compare/v2.10.0-snapshot.0...v2.10.0) (2025-05-16)

### [2.9.6](https://github.com/pm4ml/connection-manager-api/compare/v2.9.4...v2.9.6) (2025-05-13)


### Bug Fixes

* debug ([edebde7](https://github.com/pm4ml/connection-manager-api/commit/edebde7690e7cf91aa6c60f3977efaf32c4ab635))
* disable dfsp watcher by default ([3c86c5d](https://github.com/pm4ml/connection-manager-api/commit/3c86c5dd7721095a198c8ddd374cdffaf57d08ab))
* gitignore ([e418f59](https://github.com/pm4ml/connection-manager-api/commit/e418f596f8fd839ece19fcd156042d958fd6dc8b))
* node ver ([27abc69](https://github.com/pm4ml/connection-manager-api/commit/27abc699f050eb00beeb465e1555bae68b3ca65b))
* package-lock ([7bff099](https://github.com/pm4ml/connection-manager-api/commit/7bff09986b3550e96ae8d1033254ca24603df47f))
* tests ([1e36352](https://github.com/pm4ml/connection-manager-api/commit/1e363528a96482edc35290b43bbc7598733f709e))


### Chore

* bump ver ([c2fc88e](https://github.com/pm4ml/connection-manager-api/commit/c2fc88e043e5b8ae481302f1c37d102f938bf2fa))
* cleanup ([f31ccab](https://github.com/pm4ml/connection-manager-api/commit/f31ccab69503ac823eedefc32be478d1ee076e95))

### [2.9.4](https://github.com/pm4ml/connection-manager-api/compare/v2.9.3...v2.9.4) (2025-05-08)


### Chore

* added migrate:rollback script ([2d8829f](https://github.com/pm4ml/connection-manager-api/commit/2d8829f8de5113f9e65bc6677cb53b251df6584e))

### [2.9.3](https://github.com/pm4ml/connection-manager-api/compare/v2.9.2...v2.9.3) (2025-05-08)


### Chore

* removed label "component" from errorCounter ([97ae9ac](https://github.com/pm4ml/connection-manager-api/commit/97ae9ace761f1f4dce97c0ca89dba3aa5cca6c30))

### [2.9.2](https://github.com/pm4ml/connection-manager-api/compare/v2.9.1...v2.9.2) (2025-05-08)


### Chore

* added possibility to disable dfsp-watcher ([08d6166](https://github.com/pm4ml/connection-manager-api/commit/08d6166f4b55080c526b78019da618b8872c135a))

### [2.9.1](https://github.com/pm4ml/connection-manager-api/compare/v2.9.0...v2.9.1) (2025-05-08)


### Bug Fixes

* k8s is not defined error ([5e2a2e3](https://github.com/pm4ml/connection-manager-api/commit/5e2a2e32b9861aed728c8090503041b22585ae19))

## [2.9.0](https://github.com/pm4ml/connection-manager-api/compare/v2.8.4...v2.9.0) (2025-05-08)


### Features

* **csi-1443:** added POST /states endpoint ([#104](https://github.com/pm4ml/connection-manager-api/issues/104)) ([6aecbce](https://github.com/pm4ml/connection-manager-api/commit/6aecbced01d715773c48196df170c93bbf3549fa))

### [2.8.4](https://github.com/modusbox/connection-manager-api/compare/v2.8.3...v2.8.4) (2025-05-06)


### Chore

* remove image scan override ([#103](https://github.com/modusbox/connection-manager-api/issues/103)) ([d7004fa](https://github.com/modusbox/connection-manager-api/commit/d7004fae63743fea23f80767c143ac390106eed7))

### [2.8.3](https://github.com/modusbox/connection-manager-api/compare/v2.8.2...v2.8.3) (2025-05-05)


### Chore

* try to fix vulnerabilities ([#102](https://github.com/modusbox/connection-manager-api/issues/102)) ([b2f3228](https://github.com/modusbox/connection-manager-api/commit/b2f3228cda8e940b49d27bd058f8b54d81f459ab))

### [2.8.2](https://github.com/modusbox/connection-manager-api/compare/v2.8.1...v2.8.2) (2025-05-05)


### Chore

* remove test folder ([#101](https://github.com/modusbox/connection-manager-api/issues/101)) ([90dea1e](https://github.com/modusbox/connection-manager-api/commit/90dea1e92ea6f77bc067015ceddad943459a8e40))

### [2.8.1](https://github.com/modusbox/connection-manager-api/compare/v2.8.0...v2.8.1) (2025-05-03)


### Chore

* update docker file ([#100](https://github.com/modusbox/connection-manager-api/issues/100)) ([244073d](https://github.com/modusbox/connection-manager-api/commit/244073d85b2e8ed10c4c55f3d8435ae63b5d6a38))

## [2.8.0](https://github.com/modusbox/connection-manager-api/compare/v2.4.2...v2.8.0) (2025-05-02)


### Features

* **csi-1413:** added DfspWatcher ([#97](https://github.com/modusbox/connection-manager-api/issues/97)) ([4d55cf3](https://github.com/modusbox/connection-manager-api/commit/4d55cf3923772ad56dedfcf3269ef034ddca7038))
* implement 2FA with Keycloak and DFSP user invitation emails ([0fb4250](https://github.com/modusbox/connection-manager-api/commit/0fb4250b0ecfeb6227b56f965e910f6db1ff49c3))
* integrate IME-519 adoption features ([#94](https://github.com/modusbox/connection-manager-api/issues/94)) ([3e83010](https://github.com/modusbox/connection-manager-api/commit/3e830101ca8329554a94ac3e6f77fe19282b5337))
* integrate keycloak for DFSP lifecycle ([d3913f8](https://github.com/modusbox/connection-manager-api/commit/d3913f815f0d4a216f109345f030703a35d7baa0))


### Bug Fixes

* envs ([00e5c57](https://github.com/modusbox/connection-manager-api/commit/00e5c57e5302d81b12b80556e69e9f643a2670da))


### Chore

* bump package-lock.json ([090639e](https://github.com/modusbox/connection-manager-api/commit/090639eef85b6f3f0546cb54aede7cdaa8f884b4))
* bump to unblock ci ([#99](https://github.com/modusbox/connection-manager-api/issues/99)) ([00f3e28](https://github.com/modusbox/connection-manager-api/commit/00f3e28c1fb58765abd1cc6f58865ad845fa784d))
* cleanup ([acd4f15](https://github.com/modusbox/connection-manager-api/commit/acd4f155334e57060c272396fc4ad936d9442b50))
* version bump ([5e6e383](https://github.com/modusbox/connection-manager-api/commit/5e6e3839f70648a34b4d946af5b37d305b5a5abf))

## [2.7.0](https://github.com/modusbox/connection-manager-api/compare/v2.4.2...v2.7.0) (2025-05-02)


### Features

* **csi-1413:** added DfspWatcher ([#97](https://github.com/modusbox/connection-manager-api/issues/97)) ([4d55cf3](https://github.com/modusbox/connection-manager-api/commit/4d55cf3923772ad56dedfcf3269ef034ddca7038))
* implement 2FA with Keycloak and DFSP user invitation emails ([0fb4250](https://github.com/modusbox/connection-manager-api/commit/0fb4250b0ecfeb6227b56f965e910f6db1ff49c3))
* integrate IME-519 adoption features ([#94](https://github.com/modusbox/connection-manager-api/issues/94)) ([3e83010](https://github.com/modusbox/connection-manager-api/commit/3e830101ca8329554a94ac3e6f77fe19282b5337))
* integrate keycloak for DFSP lifecycle ([d3913f8](https://github.com/modusbox/connection-manager-api/commit/d3913f815f0d4a216f109345f030703a35d7baa0))


### Bug Fixes

* envs ([00e5c57](https://github.com/modusbox/connection-manager-api/commit/00e5c57e5302d81b12b80556e69e9f643a2670da))


### Chore

* bump package-lock.json ([090639e](https://github.com/modusbox/connection-manager-api/commit/090639eef85b6f3f0546cb54aede7cdaa8f884b4))
* cleanup ([acd4f15](https://github.com/modusbox/connection-manager-api/commit/acd4f155334e57060c272396fc4ad936d9442b50))
* version bump ([5e6e383](https://github.com/modusbox/connection-manager-api/commit/5e6e3839f70648a34b4d946af5b37d305b5a5abf))

### [2.3.1](https://github.com/modusbox/connection-manager-api/compare/v2.3.0...v2.3.1) (2024-08-15)

## [2.3.0](https://github.com/modusbox/connection-manager-api/compare/v2.1.2...v2.3.0) (2024-08-15)


### Features

* **iprod-416:** added int test for hub jws-certs ([e28360b](https://github.com/modusbox/connection-manager-api/commit/e28360b4db77c305f249ead64fbcbf92ddbfcfe2))
* **iprod-416:** added SWITCH_ID=switch to .env for testing ([aa3cb3f](https://github.com/modusbox/connection-manager-api/commit/aa3cb3f8a69c5995ab5caa193fc346c7734efdfc))
* **iprod-416:** fixed new test-int ([e8cb1c7](https://github.com/modusbox/connection-manager-api/commit/e8cb1c7b38f1829aeeb7a1432da982274f419be7))
* **iprod-416:** fixed new test-int ([95f11aa](https://github.com/modusbox/connection-manager-api/commit/95f11aa7108cbb97ec8b7367c017c2578680799d))
* **iprod-416:** updated deps ([796f062](https://github.com/modusbox/connection-manager-api/commit/796f0623127930c333233a3490e96f5d46208502))
* **iprod-416:** updated from main ([7df568f](https://github.com/modusbox/connection-manager-api/commit/7df568f8746f04cdda5c625e67f43472a7a4e504))


### Chore

* updated deps ([4ecaa00](https://github.com/modusbox/connection-manager-api/commit/4ecaa00fefa1f2cbebfdc740d1158ccfb6a49069))
* updated from main ([c582ea6](https://github.com/modusbox/connection-manager-api/commit/c582ea6c39bc4d8e35698495c721e7feedf9dc21))

### [1.9.8-snapshot.0](https://github.com/modusbox/connection-manager-api/compare/v1.9.7-snapshot.5...v1.9.8-snapshot.0) (2024-02-27)


### Features

* **iprod-416:** removed unused code ([e0d4f55](https://github.com/modusbox/connection-manager-api/commit/e0d4f55c447292a44fbf3453424e8b28835f0e4b))
* **iprod-416:** updated deps ([e6cb537](https://github.com/modusbox/connection-manager-api/commit/e6cb537135f04d8f8fdc0175a374de51691e60ff))

### [1.9.6](https://github.com/modusbox/connection-manager-api/compare/v1.9.5...v1.9.6) (2022-06-17)


### Chore

* Add repository info ([35db681](https://github.com/modusbox/connection-manager-api/commit/35db6817db35087157b2dbe6f67d1af6b84512bf))
* add repository info and remove dist dir ([52d2bf5](https://github.com/modusbox/connection-manager-api/commit/52d2bf5374085605c31f0d744d86eedd8d62268a))
* Remove dist dir from files ([d092626](https://github.com/modusbox/connection-manager-api/commit/d09262696200c89a38a6ad78eb1d4cdc10373a03))

### [1.9.5](https://github.com/modusbox/connection-manager-api/compare/v1.9.4...v1.9.5) (2022-06-17)


### Chore

* forget to remove some lib references from ci config ([9ac1823](https://github.com/modusbox/connection-manager-api/commit/9ac1823a94dc43ba5b9e33b5c4a273ffd02c4009))

### [1.9.4](https://github.com/modusbox/connection-manager-api/compare/v1.9.3...v1.9.4) (2022-06-17)


### Chore

* fix ci release flow to correctly report notifications ([a57c2d6](https://github.com/modusbox/connection-manager-api/commit/a57c2d6374d7dcb6c5fc4186b4ad27177d5eedfa))

### [1.9.3](https://github.com/modusbox/connection-manager-api/compare/v1.9.2...v1.9.3) (2022-06-17)


### Chore

* fixed typo in readme ([418e068](https://github.com/modusbox/connection-manager-api/commit/418e0681d7ad4b40d014741860f5b0fa377d3783))

### [1.9.2](https://github.com/modusbox/connection-manager-api/compare/v1.9.1...v1.9.2) (2022-06-16)


### Chore

* align gh workflows ([0dacc37](https://github.com/modusbox/connection-manager-api/commit/0dacc3735ede67a086eca1b321ac7edbd6a802b6))
* align test scripts ([f102d45](https://github.com/modusbox/connection-manager-api/commit/f102d45fde8ce29b48f15487917dc4803ba72992))
* fix lint issues ([82bcbbc](https://github.com/modusbox/connection-manager-api/commit/82bcbbc25262e2bc22ce0ee0abc4b9f46b918e61))
* fixes for int tests ([b76ab8f](https://github.com/modusbox/connection-manager-api/commit/b76ab8fec6486ac0a41e7d79fcdd04da7e5b4b82))
* postpone audit check ([c89637c](https://github.com/modusbox/connection-manager-api/commit/c89637ca5c30d0c3589d06dd585ed6badb4042c5))
* update audit check script ([2c4832e](https://github.com/modusbox/connection-manager-api/commit/2c4832e88b8f86f92e236bcce6147656ac48327d))
* update audit resolve ([53f3f05](https://github.com/modusbox/connection-manager-api/commit/53f3f05773e0b51a1c7ee44a625aa11e976522f2))
* update audit resolve script ([e843599](https://github.com/modusbox/connection-manager-api/commit/e84359998c7fff6c1c6b654a7d2650370e5caeb6))
* update audit resolve script ([03cc745](https://github.com/modusbox/connection-manager-api/commit/03cc745296c4fd236a409d16fd5e572e22cf1066))
* update audit resolve script ([9508c3b](https://github.com/modusbox/connection-manager-api/commit/9508c3b9adbcee7d863bc58cc5e5607e12c8967d))
* update audit resolve script and add dep ([1b6903c](https://github.com/modusbox/connection-manager-api/commit/1b6903c860da6d728f90ba2842c504f4635b6fee))
* update dependencies ([2fb7a40](https://github.com/modusbox/connection-manager-api/commit/2fb7a40abca89124b584cbd25a535c4baa8a2a9a))
* update dependencies ([79311ff](https://github.com/modusbox/connection-manager-api/commit/79311ffe10da02efe162f6ce0aaed6c66ae4528b))
* Update README to reference new GH Workflow name ([02f8c52](https://github.com/modusbox/connection-manager-api/commit/02f8c52232864ce20a6329fdfb074f9cd93dd1ce))
* Update README to reference new GH Workflow name ([45434b8](https://github.com/modusbox/connection-manager-api/commit/45434b8a2aa35497ce9b3185d84321f15a258fa2))

## [1.5.3] - 2019-09-11

### Changed
- MBXCONNMAN-72 Reset password

## [1.5.2] - 2019-09-09

### Changed
- MBXCONNMAN-168 Rename PKI to Connection Manager API and remove private/internal code before going to GitHub public
- MBXCONNMAN-177 Log git commit on api server start
- MBXCONNMAN-236 Copyright and Apache 2 license headers on all files 
- MBXCONNMAN-252 Publish Modusintegration/cfssl on public repository
- MBXCONNMAN-254 Refactor Knex

## [1.5.1] - 2019-08-20

### Changed
- Update oauth2.md
- adding 2FA env variables to README

### Fixed
- BOX-222 fixing bug intermediate chain
