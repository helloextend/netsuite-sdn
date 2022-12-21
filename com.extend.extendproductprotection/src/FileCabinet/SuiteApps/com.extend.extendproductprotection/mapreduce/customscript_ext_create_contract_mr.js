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
                var stSalesOrderSearchID = runtime.getCurrentScript().getParameter('custscript_ext_so_search');

                log.debug('stSalesOrderSearchID', stSalesOrderSearchID);
                var salesOrderSearch = search.load({
                    id: stSalesOrderSearchID
                });

                return salesOrderSearch;

            } catch (e) {
                log.error('getInputData', 'error: ' + e);
            }
        }
        exports.map = function (context) {
            try {
                log.audit('map', '** START **');
                var contextValues = JSON.parse(context.value);
                var stFulfillmentId = contextValues.id;
                var stSalesOrderId = contextValues.values.createdfrom.value;
                log.audit('stSalesOrderId | stFulfillmentId', stSalesOrderId + '|' + stFulfillmentId);

                context.write({
                    key: stSalesOrderId,
                    value: stFulfillmentId
                });

            } catch (e) {
                log.error('map', 'error: ' + e);
                var id = record.submitFields({
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
                //create user note attached to record
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', stSalesOrderId);
                objNoteRecord.setValue('title', stSalesOrderId);
                objNoteRecord.setValue('note', e.message);
                objNoteRecord.save();

            }
        }
        exports.reduce = function (context) {
            try {
                log.audit('reduce', '** START **');

                var stSalesOrderId = context.key;
                log.audit('reduce', 'stSalesOrderId: ' + stSalesOrderId);

                //Load associated Saled Order Record
                var objSalesOrderRecord = record.load({
                    type: 'salesorder',
                    id: stSalesOrderId
                });

                var stLineCount = objSalesOrderRecord.getLineCount({ sublistId: 'item' });
                log.debug('reduce',' Line Count - '+ stLineCount);

                if (stLineCount > 0) {
                    var objExtendData = _getExtendData(stLineCount, objSalesOrderRecord);

                    if (!EXTEND_UTIL.objectIsEmpty(objExtendData)) {          
                        log.debug('reduce','objExtendData - '+ JSON.stringify(objExtendData));
              
                        // Get Extend Details from Sales Order
                        var objSalesData = EXTEND_UTIL.getSalesOrderInfo(objExtendData, objSalesOrderRecord);
                        log.debug('reduce','SO Data from Extend Object - '+ JSON.stringify(objSalesData));
                        
                        EXTEND_UTIL.createExtendContracts(objSalesData, objSalesOrderRecord);
                    }else{
                        log.audit('reduce', 'empty objExtendData for '+stSalesOrderId+' - ' + EXTEND_UTIL.objectIsEmpty(objExtendData));
                    }
                }

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
                objNoteRecord.setValue('title', 'Extend Error Contract Create');
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

        //////////////////////////SUPPORT FUNCTIONS///////////////////////////

        function _getExtendData(stLineCount, objNewRecord) {
            log.debug('reduce _getExtendData', '**ENTER**');
            var objExtendItemData = {};

            var stExtendItemId = runtime.getCurrentScript().getParameter('custscript_ext_protection_plan');
            for (var i = 0; i < stLineCount; i++) {
                var stItemId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                //Check if item is one of the configured extend items
                if (stExtendItemId === stItemId) {
                    log.debug('reduce _getExtendData', 'Item Found | stItemId - '+stItemId + ' on line ' + i);

                    //get qty of contracts created & compare to extend item qty
                    var stContractQty = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_qty', line: i }) || 0;
                    var stExtendItemQty = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    log.debug('reduce _getExtendData', 'Item Found | stContractQty - '+ stContractQty);
                    log.debug('reduce _getExtendData', 'Item Found | stExtendItemQty - '+ stExtendItemQty);

                    if (stContractQty < stExtendItemQty) {

                        //get related item from extend line
                        var stExtendItemRefId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                        log.debug('reduce _getExtendData', 'Extend Assoc Item | stExtendItemRefId - '+ stExtendItemRefId);

                        //check for new fulfillments
                        for (var j = 0; j < stLineCount; j++) {
                            log.debug('reduce _getExtendData', 'Loop index | j - '+ j);

                            var stRelatedItem = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_sptx_extend_parent_id', line: j });
                            log.debug('reduce _getExtendData', 'SO Line Item | stRelatedItem - '+ stRelatedItem);

                            if (stRelatedItem == stExtendItemRefId) {
                                log.debug('reduce _getExtendData', 'stRelatedItem === stExtendItemRefId - Line: ' + j + ': '+stRelatedItem+ '===' +stExtendItemRefId);

                                var stRelatedItemQtyFulfilled = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantityfulfilled', line: j });
                                log.debug('reduce _getExtendData','stRelatedItem === stExtendItemRefId - stRelatedItemQtyFulfilled -'+ stRelatedItemQtyFulfilled);

                                if (stRelatedItemQtyFulfilled <= stExtendItemQty && stRelatedItemQtyFulfilled > stContractQty) {
                                    log.debug('reduce _getExtendData', 'stRelatedItemQtyFulfilled <= stExtendItemQty && stRelatedItemQtyFulfilled > stContractQty ');

                                    var stUniqueKey = i;
                                    // Start building the Extend Order Info Object
                                    objExtendItemData[stUniqueKey] = {};
                                    objExtendItemData[stUniqueKey].quantity = Math.min(stRelatedItemQtyFulfilled, (stExtendItemQty - stContractQty));
                                    objExtendItemData[stUniqueKey].item = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                                    objExtendItemData[stUniqueKey].line = i;
                                    objExtendItemData[stUniqueKey].purchase_price = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: j });
                                    objExtendItemData[stUniqueKey].extend_plan_id = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_plan_id', line: i });
                                    objExtendItemData[stUniqueKey].itemId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });;
                                    objExtendItemData[stUniqueKey].plan_price = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                                 
                                }
                            }
                        }

                    }
                }
            }

            log.debug('reduce _getExtendData','objExtendItemData - '+ JSON.stringify(objExtendItemData));

            return objExtendItemData
        };

        return exports;
    });
