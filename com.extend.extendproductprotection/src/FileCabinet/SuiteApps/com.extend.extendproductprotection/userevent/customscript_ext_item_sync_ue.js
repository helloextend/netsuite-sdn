
/**
 *@name: EXTEND SUITESCRIPT SDK - Item Creation Sync JS
 *@description: 
 * This script invokes a call to the Extend Products POST endpoint whenever
 * an item is created
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

        exports.afterSubmit = function (context) {

            log.debug('AFTERSUBMIT: Execution Context', runtime.executionContext);
            log.debug('AFTERSUBMIT: Context', context);

            /*
                        if (context.type !== context.UserEventType.CREATE)
                return;
*/
            try {
                var objNewRecord = context.newRecord;
                log.debug('AFTERSUBMIT: objNewRecord', objNewRecord);

                var objExtendData = EXTEND_UTIL.getExtendItemData(objNewRecord);
                EXTEND_UTIL.syncExtendProducts(objExtendData, objNewRecord);

            } catch (e) {
                log.debug('AFTERSUBMIT: Error Syncing Product', JSON.stringify(e.message));
            }
        };
        return exports;
    });