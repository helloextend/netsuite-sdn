/**
 * keyconfig
 * @NApiVersion 2.1
 */
 define([
    'N/runtime',
    'N/search',
    '../lib/customscript_ext_util.js'

],
    function (runtime, search, EXTEND_UTIL) {
        var exports = {};
        const objExtendEnvironment = {
            SANDBOX: '1',
            PRODUCTION: '2'
        }

        /**
         * Defines the getConfigfunction that is executed to authenticate with Extend endpoints
         * @param {string | number} filterVal1 - internal id of additional filter to be used when searching for config records
         * 
         */
        exports.getConfig = function (filterVal1) {
            try {
                //Get storeId & APIkey from config custom record
                var SB_STORE_ID; 
                var SB_API_KEY; 
                var SB_API_VERSION;
                var SB_EMAIL;
                var SB_REF_ID;
                var STORE_ID;
                var API_KEY;
                var API_VERSION;
                var REF_ID;
                var objSandbox;
                var objProd;

                //param is custom record extend config
                var stEnvironment = runtime.getCurrentScript().getParameter('custscript_ext_environment');
                log.debug('GET CONFIG','stEnvironment: '+ stEnvironment +" - type: "+ typeof stEnvironment);
                log.debug('GET CONFIG','filterVal1: '+ filterVal1 +" - type: "+ typeof filterVal1);

                var arrSearchFilter;
                if(filterVal1){
                    arrSearchFilter = [
                        ["isinactive","is","F"],
                        "AND",
                        ["custrecord_ext_environment","anyof", stEnvironment],
                        "AND",
                        ["custrecord_ext_filter1", "anyof", filterVal1]
                    ];
                }else{
                    arrSearchFilter = [
                        ["isinactive","is","F"],
                        "AND",
                        ["custrecord_ext_environment","anyof", stEnvironment]
                    ];
                }

                log.debug('GET CONFIG','arrSearchFilter: '+ JSON.stringify(arrSearchFilter) +" - type: "+ typeof arrSearchFilter);

                var customrecord_ext_configurationSearchObj = search.create({
                    type: "customrecord_ext_configuration",
                    filters: arrSearchFilter,
                    columns:
                    [
                    search.createColumn({name: "custrecord_ext_environment", label: "Environment "}),
                    search.createColumn({name: "custrecord_ext_api_key", label: "API Key"}),
                    search.createColumn({name: "custrecord_ext_api_version", label: "API Version"}),
                    search.createColumn({name: "custrecord_ext_demo_email", label: "Email"}),
                    search.createColumn({name: "custrecord_ext_store_id", label: "Store ID"}),
                    search.createColumn({name: "custrecord_ext_ref_id", label: "Ref ID"}),
                    ]
                });
                var searchResultCount = customrecord_ext_configurationSearchObj.runPaged().count;
                log.debug('GET CONFIG', 'searchResultCount: '+ searchResultCount);

                if(searchResultCount == 0){
                    log.error("GET CONFIG", "No configuration record found!")
                    return false;
                }

                //loop over results of configuration records and store values
                customrecord_ext_configurationSearchObj.run().each(function(result){
                    var stEnvironment = result.getValue({ name: 'custrecord_ext_environment' });
                    
                    if(stEnvironment == objExtendEnvironment.PRODUCTION){
                        STORE_ID  = result.getValue({ name: 'custrecord_ext_store_id' });
                        API_KEY  = result.getValue({ name: 'custrecord_ext_api_key' });
                        API_VERSION  = result.getValue({ name: 'custrecord_ext_api_version' });
                        REF_ID  = result.getValue({ name: 'custrecord_ext_ref_id' });

                        objProd = {
                            storeId: STORE_ID,
                            key: API_KEY,
                            domain: 'https://api.helloextend.com',
                            version: API_VERSION,
                            refId: REF_ID
                        };

                    }else{
                        SB_STORE_ID  = result.getValue({ name: 'custrecord_ext_store_id' }); 
                        SB_API_KEY  = result.getValue({ name: 'custrecord_ext_api_key' });
                        SB_API_VERSION  = result.getValue({ name: 'custrecord_ext_api_version' });
                        SB_EMAIL  = result.getValue({ name: 'custrecord_ext_demo_email' });
                        SB_REF_ID  = result.getValue({ name: 'custrecord_ext_ref_id' });

                        objSandbox = {
                            storeId: SB_STORE_ID,
                            key: SB_API_KEY,
                            domain: 'https://api-demo.helloextend.com',
                            version: SB_API_VERSION,
                            email: SB_EMAIL, //IMPORTATN: SB and Testing environemnts requires manual assignment of a test email
                            refId: SB_REF_ID
                        };
                    }

                    return true;
                });


                if(objExtendEnvironment.PRODUCTION == stEnvironment){
                    log.debug("GET CONFIG",'config for Prod: '+ JSON.stringify(objProd))
                    return objProd;
                }else{
                    log.debug("GET CONFIG",'config for Sandbox: '+ JSON.stringify(objSandbox))
                    return objSandbox;
                }
            
            } catch (error) {
                log.error("GET CONFIG", 'error: '+error)
            }
        }
        return exports;
    });