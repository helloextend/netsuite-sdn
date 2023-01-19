/**
 *@name: EXTEND SUITESCRIPT SDK - Create Contract from Fulfillment JS
 *@description: 
 * This script invokes a call to the Extend Contracts POST endpoint whenever
 * an item with a protection plan is fulfilled
 *    
 *@copyright Extend, Inc
 *@author Michael Draper
 * 
 *@NApiVersion 2.x
 *@NScriptType MapReduceScript
 *@ModuleScope Public
 */
define([
    'N/runtime',
    'N/record',
    'N/search',
    '../lib/customscript_ext_util',
    '../lib/customscript_ext_config_lib'

],
    function (runtime, record, search, EXTEND_UTIL, EXTEND_CONFIG) {
        var exports = {};

        exports.getInputData = function () {
            try {
                log.audit('getInputData', '** START **');
                //todo build search in getinput instead of param?
                var stSalesOrderSearchID = runtime.getCurrentScript().getParameter('custscript_ext_order_search');

                log.debug('stSalesOrderSearchID', stSalesOrderSearchID);
                var salesOrderSearch = search.load({
                    id: stSalesOrderSearchID
                });

                return salesOrderSearch;

            } catch (e) {
                log.error('getInputData', 'error: ' + e);
            }
        }
        exports.reduce = function (context) {
            try {
                log.debug('reduce', '** START **');

                var stSalesOrderId = context.key;
                log.audit('reduce', 'stSalesOrderId: ' + stSalesOrderId);
                //Load associated Saled Order Record
                var objSalesOrderRecord = record.load({
                    type: 'salesorder',
                    id: stSalesOrderId
                });
                // Get Extend Details from Sales Order
                var objExtendConfig = EXTEND_CONFIG.getConfig();
                objExtendData = EXTEND_UTIL.createExtendOrder(objSalesOrderRecord, objExtendConfig);

            } catch (e) {
                log.error('reduce', 'key: ' + context.key + ' error: ' + e);
                record.submitFields({
                    type: record.Type.SALES_ORDER,
                    id: stSalesOrderId,
                    values: {
                        'custbody_ext_process_error': true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                // create user note attached to record
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', stSalesOrderId);
                objNoteRecord.setValue('title', 'Extend Error Order Create');
                objNoteRecord.setValue('note', JSON.stringify(e.message));
                var stNoteId = objNoteRecord.save();
                log.debug('reduce', 'stNoteId: ' + stNoteId);

            }
        }
        exports.summarize = function (summary) {
            log.audit('summarize', '** START **');
            try {
                var mapKeys = [];
                summary.mapSummary.keys.iterator().each(function (key) {
                    mapKeys.push(key);
                    return true;
                });
                if (mapKeys.length < 1) {
                    log.debug('summarize', 'No results were processed');
                }
                log.debug('summarize', JSON.stringify(summary));

            } catch (e) {
                log.error('summarize', 'error: ' + e);
            }
        }



        return exports;
    });
