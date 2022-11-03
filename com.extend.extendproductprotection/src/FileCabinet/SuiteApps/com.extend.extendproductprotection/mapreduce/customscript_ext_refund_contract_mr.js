/**
 *@name: EXTEND SUITESCRIPT SDK - Create Contract from Fulfillment JS
 *@description: 
 * This script invokes a call to the Extend Refunds POST endpoint whenever
 * a protection plan is refunded
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
                var stRefundSearchID = runtime.getCurrentScript().getParameter('custscript_ext_refund_search');

                log.debug('stRefundSearchID', stRefundSearchID);
                var refundSearch = search.load({
                    id: stRefundSearchID
                });

                return refundSearch;

            } catch (e) {
                log.error('getInputData', 'error: ' + e);
            }
        }
        exports.reduce = function (context) {
            try {
                log.debug('reduce', '** START **');
                log.audit('reduce', 'context: ' + context);

                var stRefundId = context.key;
                var stRefundType = context.values.type;
                log.audit('reduce', 'stRefundId: ' + stRefundId);
                log.audit('reduce', 'stRefundType: ' + stRefundType);
                //Load associated Saled Order Record
                var objRefundRecord = record.load({
                    type: stRefundType,
                    id: stRefundId
                });
                // Get Extend Details from Sales Order
                objExtendData = EXTEND_UTIL.refundExtendOrder(objRefundRecord);

            } catch (e) {
                log.error('reduce', 'key: ' + context.key + ' error: ' + e);
                record.submitFields({
                    type: stRefundType,
                    id: stRefundId,
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
