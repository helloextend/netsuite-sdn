/**
 * keyconfig
 * @NApiVersion 2.1
 */
define([
    'N/runtime',
    'N/search'
],
    function (runtime, search) {
        var exports = {};
        const objExtendEnvironment = {
            SANDBOX: 1,
            PRODUCTION: 2
        }
        exports.getConfig = function () {
            //Get storeId & APIkey from config custom record

            var STORE_ID;
            var API_KEY;
            var API_VERSION = 'latest';
            var REF_ID;
            var EMAIL;
            var ENVIRONMENT = 'demo';
            var PRODUCT_ITEM;
            var SHIPPING_ITEM;
            var DOMAIN = 'https://api-demo.helloextend.com';


            var stExtendConfigRecId = runtime.getCurrentScript().getParameter('custscript_ext_config_rec');
            log.debug('_getConfig: stExtendConfigRecId ', stExtendConfigRecId);

            var arrFilters = ["internalId", "is", stExtendConfigRecId];

            var customrecord_ext_configurationSearchObj = search.create({
                type: "customrecord_ext_configuration",
                filters: [
                    arrFilters
                ],
                columns:
                    [
                        search.createColumn({ name: "custrecord_ext_environment", label: "Environment " }),
                        search.createColumn({ name: "custrecord_ext_api_key", label: "API Key" }),
                        search.createColumn({ name: "custrecord_ext_api_version", label: "API Version" }),
                        search.createColumn({ name: "custrecord_ext_demo_email", label: "Email" }),
                        search.createColumn({ name: "custrecord_ext_store_id", label: "Store ID" }),
                        search.createColumn({ name: "custrecord_ext_ref_id", label: "Ref ID" }),

                    ]
            });
            var searchResultCount = customrecord_ext_configurationSearchObj.runPaged().count;
            customrecord_ext_configurationSearchObj.run().each(function (result) {
                ENVIRONMENT = result.getValue({ name: 'custrecord_ext_environment' });
                log.debug('_getConfig: ENVIRONMENT ', ENVIRONMENT);

                switch (Number(ENVIRONMENT)) {
                    case objExtendEnvironment.SANDBOX:
                        DOMAIN = 'https://api-demo.helloextend.com'
                        break;
                    case objExtendEnvironment.PRODUCTION:
                        DOMAIN = 'https://api.helloextend.com'
                        break;
                    default:
                        DOMAIN = 'https://api-demo.helloextend.com'
                };
                log.debug('_getConfig: DOMAIN ', DOMAIN);
                STORE_ID = result.getValue({ name: 'custrecord_ext_store_id' });
                API_KEY = result.getValue({ name: 'custrecord_ext_api_key' });
                EMAIL = result.getValue({ name: 'custrecord_ext_demo_email' });
                REF_ID = result.getValue({ name: 'custrecord_ext_ref_id' });
                if (result.getValue({ name: 'custrecord_ext_api_version' })) {
                    API_VERSION = result.getValue({ name: 'custrecord_ext_api_version' });
                }
                PRODUCT_ITEM = result.getValue({ name: 'custrecord_ext_product_item' });
                SHIPPING_ITEM = result.getValue({ name: 'custrecord_ext_shipping_item' });

                return true;
            });


            var objExtendConfig = {
                storeId: STORE_ID,
                key: API_KEY,
                domain: DOMAIN,
                version: API_VERSION,
                email: EMAIL, //IMPORTATN: SB and Testing environemnts requires manual assignment of a test email
                refId: REF_ID,
                product_plan_item: PRODUCT_ITEM,
                shipping_plan_item: SHIPPING_ITEM
            };

            return objExtendConfig;

        }
        return exports;
    });