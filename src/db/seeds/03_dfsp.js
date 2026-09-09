// pass DFSP_SEED=DFSP1:KES,DFSP2:MWK,DFSP3:UGX to seed the dfsp with the given monetary zones
exports.seed = async (knex) => {
    if (process.env.DFSP_SEED) {
        const Constants = require('../../constants/Constants');
        const { createCSRAndDFSPOutboundEnrollment, getDFSPOutboundEnrollments } = require('../../service/DfspOutboundService');
        const PKIEngine = require('../../pki_engine/VaultPKIEngine');
        const dfsps = process.env.DFSP_SEED.split(',')
            .map(dfsp => dfsp.split(':').map(s => s.trim()));

        await knex('dfsps').insert(
            dfsps.map(([dfsp_id, monetaryZoneId, isProxy]) => ({
                dfsp_id,
                name: dfsp_id,
                monetaryZoneId: monetaryZoneId?.length === 3 ? monetaryZoneId : null,
                isProxy: isProxy === 'proxy'
            }))
        ).onConflict('dfsp_id').merge();

        for (const [dfsp_id, monetaryZones] of dfsps) {
            const supportedCurrencies = monetaryZones.split('/').map(s => s.trim()).filter(s => s.length === 3);
            const dfspId = (await knex('dfsps').where({dfsp_id}).first('id')).id;
            if (supportedCurrencies.length > 1) {
                for (const monetaryZoneId of supportedCurrencies) {
                    await knex('fxp_supported_currencies').insert({
                        dfspId,
                        monetaryZoneId
                    }).onConflict(['dfspId', 'monetaryZoneId']).ignore();
                }
                await knex('fxp_supported_currencies').whereNotIn('monetaryZoneId', supportedCurrencies).andWhere({dfspId}).del();
            } else {
                await knex('fxp_supported_currencies').where({dfspId}).del();
            }
        }

        const pkiEngine = new PKIEngine(Constants.vault);
        await pkiEngine.connect();
        for (const [dfsp_id] of dfsps) {
            const exists = await getDFSPOutboundEnrollments({pkiEngine}, dfsp_id);
            if (exists.length === 0) {
                await createCSRAndDFSPOutboundEnrollment(
                    {pkiEngine},
                    dfsp_id,
                    Constants.clientCsrParameters
                );
            }
        }
    }
};
