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
                var stFulfillmentSearchID = runtime.getCurrentScript().getParameter('custscript_ext_fulfill_search');

                log.debug('stFulfillmentSearchID', stFulfillmentSearchID);
                var fulfillmentSearch = search.load({
                    id: stFulfillmentSearchID
                });

                return fulfillmentSearch;

            } catch (e) {
                log.error('getInputData', 'error: ' + e);
            }
        }

        exports.map = function (context) {
            try {
                log.debug('map', '** START **');
                log.audit('map  context', context);

                var contextValues = JSON.parse(context.value);
                var stFulfillmentId = contextValues.id;
                var stSalesOrderId = contextValues.values.createdfrom.value;
                log.audit('stSalesOrderId | stFulfillmentId', stSalesOrderId + '|' + stFulfillmentId);

                //Load associated Saled Order Record
                var objSalesOrderRecord = record.load({
                    type: 'salesorder',
                    id: stSalesOrderId
                });
                // Get Extend Details from Fulfillment
                var objExtendConfig = EXTEND_CONFIG.getConfig();
                objExtendData = EXTEND_UTIL.fulfillExtendOrder(objSalesOrderRecord, stFulfillmentId, objExtendConfig);


            } catch (e) {
                log.error('map', 'error: ' + e);
                var id = record.submitFields({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: stFulfillmentId,
                    values: {
                        'custbody_ext_process_error': true
                    },
                    options: {
                        enableSourcing: false,
                        ignoreMandatoryFields: true
                    }
                });
                //create user note attached to record
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', stFulfillmentId);
                objNoteRecord.setValue('title', stFulfillmentId);
                objNoteRecord.setValue('note', e.message);
                objNoteRecord.save();

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
