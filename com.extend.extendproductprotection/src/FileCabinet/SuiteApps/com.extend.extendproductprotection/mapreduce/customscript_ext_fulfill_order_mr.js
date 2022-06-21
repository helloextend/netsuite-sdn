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
    '../lib/customscript_ext_util'
],
    function (runtime, record, search, EXTEND_UTIL) {
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
        exports.reduce = function (context) {
            try {
                log.debug('reduce', '** START **');

                var stFulfillmentId = context.key;
                log.audit('reduce', 'stFulfillmentId: ' + stFulfillmentId);
                //Load associated Saled Order Record
                var objFulfillmentRecord = record.load({
                    type: record.Type.ITEM_FULFILLMENT,
                    id: stFulfillmentId
                });
                // Get Extend Details from Sales Order
                objExtendData = EXTEND_UTIL.fulfillExtendOrder(objFulfillmentRecord);

            } catch (e) {
                log.error('reduce', 'key: ' + context.key + ' error: ' + e);
                record.submitFields({
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
                // create user note attached to record
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', stFulfillmentId);
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
