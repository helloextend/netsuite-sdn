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
            var SB_STORE_ID; 
            var SB_API_KEY; 
            var SB_API_VERSION;
            var SB_EMAIL;
            var STORE_ID;
            var API_KEY;
            var API_VERSION;
            
            var customrecord_ext_configurationSearchObj = search.create({
                type: "customrecord_ext_configuration",
                filters:[],
                columns:
                [
                   search.createColumn({name: "custrecord_ext_environment", label: "Environment "}),
                   search.createColumn({name: "custrecord_ext_api_key", label: "API Key"}),
                   search.createColumn({name: "custrecord_ext_api_version", label: "API Version"}),
                   search.createColumn({name: "custrecord_ext_demo_email", label: "Email"}),
                   search.createColumn({name: "custrecord_ext_store_id", label: "Store ID"})
                ]
             });
             var searchResultCount = customrecord_ext_configurationSearchObj.runPaged().count;
             customrecord_ext_configurationSearchObj.run().each(function(result){
                var stEnvironment = result.getValue({ name: 'custrecord_ext_environment' });
                if(stEnvironment == objExtendEnvironment.SANDBOX){
                    SB_STORE_ID  = result.getValue({ name: 'custrecord_ext_store_id' }); 
                    SB_API_KEY  = result.getValue({ name: 'custrecord_ext_api_key' });; 
                    SB_API_VERSION  = result.getValue({ name: 'custrecord_ext_api_version' });;
                    SB_EMAIL  = result.getValue({ name: 'custrecord_ext_demo_email' });;
                }else{
                    STORE_ID  = result.getValue({ name: 'custrecord_ext_store_id' });;
                    API_KEY  = result.getValue({ name: 'custrecord_ext_api_key' });;
                    API_VERSION  = result.getValue({ name: 'custrecord_ext_api_version' });;
                }

                return true;
             });


            var objSandbox = {
                storeId: SB_STORE_ID,
                key: SB_API_KEY,
                domain: 'https://api-demo.helloextend.com',
                version: SB_API_VERSION,
                email: SB_EMAIL //IMPORTATN: SB and Testing environemnts requires manual assignment of a test email
            };
            var objProd = {
                storeId: STORE_ID,
                key: API_KEY,
                domain: 'https://api.helloextend.com',
                version: API_VERSION

            };

            //param is custom record extend config
            var stEnvironment = runtime.getCurrentScript().getParameter('custscript_ext_environment');
            log.audit('stEnvironment', stEnvironment);
            switch(stEnvironment){
                case objExtendEnvironment.SANDBOX:
                    stEnvironment = 'SANDBOX'
                    break;
                case objExtendEnvironment.PRODUCTION:
                    stEnvironment = 'PRODUCTION';
                    break;
                default:
                    stEnvironment = 'SANDBOX';
            };

            var objKeys = {};

            objKeys['SANDBOX'] = objSandbox;
            objKeys['PRODUCTION'] = objSandbox; //Demo Purposes 
            //objKeys['PRODUCTION'] = objProd;
            //by runtime or by global param
            //runtime 
            /*
            return objKeys[runtime.envType];
            */
            //global param
            return objKeys[stEnvironment];



        }
        return exports;
    });