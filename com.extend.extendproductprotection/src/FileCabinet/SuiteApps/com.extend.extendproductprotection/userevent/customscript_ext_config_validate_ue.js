/**
 *@name: EXTEND SUITESCRIPT SDK - API Configuration Validation JS
 *@description: 
 * This script Validate Single Config Custom Record per environment type
 * 
 *@copyright Extend, Inc
 *@author Michael Draper
 * 
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define([
    'N/runtime',
    'N/record',
    'N/search',
    '../libs/customscript_ext_util'
],
    function (runtime, record, search, EXTEND_UTIL) {

        var exports = {};

        exports.beforeSubmit = function (context) {

            log.debug('BEFORESUBMIT: Execution Context', runtime.executionContext);
            log.debug('BEFORESUBMIT: Context', context);

            if (context.type !== context.UserEventType.CREATE)
                return;

       //     try {
                //get environment field on current rec
                var objNewRecord = context.newRecord;
                log.debug('BEFORESUBMIT: objNewRecord', objNewRecord);
                var stEnvironmentId = objNewRecord.getValue({ fieldId: 'custrecord_ext_environment' });
                log.debug('BEFORESUBMIT: stEnvironmentId', stEnvironmentId);

                //check if active record already exists with same environment
                var customrecord_ext_configurationSearchObj = search.create({
                    type: "customrecord_ext_configuration",
                    filters:
                        [
                            ["custrecord_ext_environment", "anyof", stEnvironmentId],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "id", label: "ID" }),
                            search.createColumn({ name: "custrecord_ext_environment", label: "Environment " }),
                        ]
                });
                var searchResultCount = customrecord_ext_configurationSearchObj.runPaged().count;
                log.debug("customrecord_ext_configurationSearchObj result count", searchResultCount);
                
                //if result throw error
                if (searchResultCount>0) {
                    objErrorDetails = {};
                    objErrorDetails.title = 'Extend Configuration Error';
                    objErrorDetails.message = 'Configuration record already exists for this environment type';
                    log.error('BEFORESUBMIT: Congiuration exists for selected Environment', objErrorDetails);
                    throw EXTEND_UTIL.createError(objErrorDetails);
                }
/*
            } catch (e) {
                log.debug('BEFORESUBMIT: Error ', JSON.stringify(e.message));
            }
*/

        };

        return exports;
    });

