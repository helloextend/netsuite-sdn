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
    '../lib/customscript_ext_util',
    '../lib/customscript_ext_config_lib'

],
    function (runtime, record, search, EXTEND_UTIL, EXTEND_CONFIG) {
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

                var stRefundId = context.key;
                log.debug('reduce', 'stRefundId: ' + stRefundId);

                var objContextValues = JSON.parse(context.values[0]);
                log.debug('reduce', 'objContextValues: ' + JSON.stringify(objContextValues));

                var stRefundType = objContextValues['recordType']
                log.debug('reduce', 'stRefundType: ' + stRefundType);

                var stLineUniqueKey = objContextValues.values.lineuniquekey;
                log.debug('reduce', 'stLineUniqueKey: ' + stLineUniqueKey);

                var stQuantityToRefund = objContextValues.values.quantity
                log.debug('reduce', 'stQuantityToRefund: ' + stQuantityToRefund);
                
                var stLineTranID = objContextValues.values.custcol_ext_line_id
                log.debug('reduce', 'stLineTranID: ' + stLineTranID);

                var arrActiveIDs = objContextValues.values.custcol_ext_contract_id;
                log.debug('reduce', 'arrActiveIDs: ' + arrActiveIDs + " type - "+typeof arrActiveIDs);
                arrActiveIDs = arrActiveIDs ? JSON.parse(arrActiveIDs) : [];

                var arrCanceledIDs = objContextValues.values.custcol_ext_canceled_contract_ids;
                log.debug('reduce', 'arrCanceledIDs: ' + arrCanceledIDs + " type - "+typeof arrCanceledIDs);
                arrCanceledIDs = arrCanceledIDs ? JSON.parse(arrCanceledIDs) : [];

                var objRefundData = {
                    'ID' : stRefundId,
                    'TYPE' : stRefundType,
                    'UNIQUE_KEY' : stLineUniqueKey,
                    'QTY' : stQuantityToRefund,
                    'lineItemTransactionId' : stLineTranID,
                    'activeIDs' : arrActiveIDs,
                    'canceledIDs' : arrCanceledIDs
                }

                //call to refund by line item transaction id
                var stExtendConfigRecId = runtime.getCurrentScript().getParameter('custscript_ext_config_record');
                var objExtendConfig = EXTEND_CONFIG.getConfig(stExtendConfigRecId);
                objExtendData = EXTEND_UTIL.refundExtendOrder(objRefundData, objExtendConfig);

                //Load associated Saled Order Record
                // var objRefundRecord = record.load({
                //     type: stRefundType,
                //     id: stRefundId
                // });

                // log.debug('reduce', 'objRefundRecord - '+ JSON.stringify(objRefundRecord));
                // Get Extend Details from Sales Order
                // objExtendData = EXTEND_UTIL.refundExtendOrder(objRefundRecord);

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
                objNoteRecord.setValue('title', 'Extend Error Contract Refund');
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
