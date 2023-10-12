/**
 *@name: EXTEND SUITESCRIPT SDK - Models JS
 *@description: Structures the various JSON request bodies to the Extend API
 * @NApiVersion 2.x
 */
define([
    'N/runtime',
    'N/search',
    'N/record',
    'N/error',
    '../lib/customscript_ext_api_lib',
    '../lib/customscript_ext_config_lib'

],
    function (runtime, search, record, error, EXTEND_API, EXTEND_CONFIG) {
        var exports = {};
        /**
         * Order Functions
         */
        //create extend order
        exports.upsertExtendOrder = function (objSalesOrderRecord, objExtendConfig) {
            log.audit('EXTEND UTIL _createExtendOrder:', '**ENTER**');
            log.audit('EXTEND UTIL _createExtendOrder: SO ID', objSalesOrderRecord.id);
            var objExtendOrderRequestJSON = {};

            //build order data obj
            var objExtendData = {};
            //get SO header data
            objExtendData = exports.getSalesOrderInfo(objSalesOrderRecord);
            log.audit('EXTEND UTIL _createExtendOrder: getSalesOrderInfo objExtendData', objExtendData);
            //build array of items
            var objExtendItemData = exports.getSalesOrderItemInfo(objSalesOrderRecord, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendItemData', objExtendItemData);
            //format items
            objExtendData.shipmentInfo = exports.buildExtendShipmentJSON(objExtendItemData, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendData', objExtendData);
            objExtendData.lineItems = exports.buildExtendItemJSON(objExtendItemData, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendData', objExtendData);

            //build order json obj
            objExtendOrderRequestJSON = exports.buildExtendOrderJSON(objExtendData, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendOrderRequestJSON', objExtendOrderRequestJSON);
            //call api
            var objExtendResponse = EXTEND_API.upsertOrder(objExtendOrderRequestJSON, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: Extend Response Object: ', objExtendResponse);
            //handle response
            if (objExtendResponse.code === 201 || objExtendResponse.code === 200) {
                var objExtendResponseBody = JSON.parse(objExtendResponse.body);
                exports.handleOrderResponse(objExtendResponseBody, objSalesOrderRecord);
                //make SO as extend order created
                objSalesOrderRecord.setValue({ fieldId: 'custbody_ext_order_create', value: true });
                var stExtendOrderId = objExtendResponseBody.id;
                log.debug('EXTEND UTIL _createExtendOrder: stExtendOrderId: ', stExtendOrderId);
                objSalesOrderRecord.setValue({ fieldId: 'custbody_ext_order_id', value: stExtendOrderId });

            } else {
                log.error('EXTEND UTIL _createExtendContracts', objExtendResponse);
                objSalesOrderRecord.setValue({ fieldId: 'custbody_ext_process_error', value: true });
                // create user note attached to record                 
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', objSalesOrderRecord.id);
                objNoteRecord.setValue('title', 'Extend Order Create Error');
                objNoteRecord.setValue('note', JSON.stringify(objExtendResponse));
                var stNoteId = objNoteRecord.save();
            }

            objSalesOrderRecord.save();
        };
        //refund item by line item transaction id
        exports.refundExtendOrder = function (objRefundData, objExtendConfig) {
            log.audit('EXTEND UTIL _refundExtendOrder:', '**ENTER**');
            log.audit('EXTEND UTIL _refundExtendOrder: objRefundData', JSON.stringify(objRefundData));

            var intQuantityToRefund = parseInt(objRefundData['QTY']);
            var arrActiveIDs = objRefundData['activeIDs'];
            var arrCanceledIDs = objRefundData['canceledIDs'];
            // var objLineToRefund = {'lineItemTransactionId' : objRefundData['lineItemTransactionId']}
            // var objContractToRefund = {'contractId' : objRefundData['lineItemTransactionId']}

            //check if contract id has been canceled
            function checkIfCanceled(contractToCancel, arrCanceledIDs) {
                return arrCanceledIDs.length > 0 ? arrCanceledIDs.includes(contractToCancel) : false;
            }

            var intContractsCanceled = arrCanceledIDs ? arrCanceledIDs.length : 0;
            var intContractsStillActive = arrActiveIDs ? arrActiveIDs.length - intContractsCanceled : 0;

            if (intContractsStillActive > 0) {
                log.debug('refundExtendOrder', "There is/are still " + intContractsStillActive + " active contract(s).");

                for (var index = 0; index < arrActiveIDs.length; index++) {
                    var contractId = arrActiveIDs[index];
                    var bIsCanceled = checkIfCanceled(contractId, arrCanceledIDs);

                    if (bIsCanceled) {
                        log.debug('refundExtendOrder', contractId + " has been canceled.");
                        continue;
                    } else {
                        log.debug('refundExtendOrder', "Attempting to cancel " + contractId);
                        var objContractToRefund = { 'contractId': contractId }
                        var objExtendResponse = EXTEND_API.refundContract(objContractToRefund, objExtendConfig);

                        if (objExtendResponse.code === 201) {
                            arrCanceledIDs.push(contractId);
                            log.debug("refundExtendOrder", JSON.stringify(arrCanceledIDs));
                        }

                    }
                }
            } else {
                log.error('refundExtendOrder', "All contracts have been refunded/canceled.");
            }

            var objRefundedRecord = record.load({
                type: objRefundData.TYPE,
                id: objRefundData.ID
            });

            //handle response
            if (objExtendResponse.code === 201) {
                var objExtendResponseBody = JSON.parse(objExtendResponse.body);
                log.debug('EXTEND UTIL _refundExtendOrder: objExtendResponseBody: ', JSON.stringify(objExtendResponseBody));

                var lineNumber = objRefundedRecord.findSublistLineWithValue({
                    sublistId: 'item',
                    fieldId: 'lineuniquekey',
                    value: objRefundData['UNIQUE_KEY']
                });
                log.debug("refundExtendOrder", "lineNumber - " + lineNumber)
                // exports.handleOrderResponse(objExtendResponseBody, objRefundedRecord);

                objRefundedRecord.setSublistValue({
                    sublistId: 'item',
                    fieldId: 'custcol_ext_canceled_contract_ids',
                    line: lineNumber,
                    value: JSON.stringify(arrCanceledIDs)
                });
                //make transaction as extend order processed
                objRefundedRecord.setValue({ fieldId: 'custbody_ext_order_create', value: true });
                // var stExtendOrderId = objExtendResponseBody.id;

                // log.debug('EXTEND UTIL _refundExtendOrder: stExtendOrderId: ', stExtendOrderId);
                // objRefundedRecord.setValue({ fieldId: 'custbody_ext_order_id', value: stExtendOrderId });

            } else {
                log.error('EXTEND UTIL _refundExtendOrder', objExtendResponse);
                objRefundedRecord.setValue({ fieldId: 'custbody_ext_process_error', value: true });
                // create user note attached to record                 
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', objRefundedRecord.id);
                objNoteRecord.setValue('title', 'Extend Refund Error');
                objNoteRecord.setValue('note', JSON.stringify(objExtendResponse.body));
                var stNoteId = objNoteRecord.save();
            }

            objRefundedRecord.save();


        };

        /***********************************Support Functions********************************************/
        exports.handleOrderResponse = function (objExtendResponseBody, objSalesOrderRecord) {

            log.debug('EXTEND UTIL _createExtendOrder: Extend Response Body Parsed: ', objExtendResponseBody);
            var arrLineItems = objExtendResponseBody.lineItems;
            var objExtendResponseData = {};

            log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData: ', objExtendResponseData);

            for (var i = 0; i < arrLineItems.length; i++) {
                log.debug('EXTEND UTIL _createExtendOrder: arrLineItems: ', arrLineItems[i]);
                var line = arrLineItems[i].lineItemTransactionId;
                // line = line.substring(objSalesOrderRecord.id.toString().length, line.length);
                line = line.split('-');

                log.debug('EXTEND UTIL _createExtendOrder: line: ', line + '|' + typeof line);
                stUniqueKey = line[1];

                objExtendResponseData[stUniqueKey] = {};
                objExtendResponseData[stUniqueKey].contractIds = [];
                objExtendResponseData[stUniqueKey].leadTokens = [];
                objExtendResponseData[stUniqueKey].lineItemTransactionId = arrLineItems[i].lineItemTransactionId;
                if (line[2]) {
                    objExtendResponseData[stUniqueKey].extendLine = line[2];
                }
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[stUniqueKey]: ', objExtendResponseData[stUniqueKey]);

            }
            for (var j = 0; j < arrLineItems.length; j++) {
                log.debug('EXTEND UTIL _createExtendOrder: j loop arrLineItems: ', arrLineItems[j]);
                var line = arrLineItems[j].lineItemTransactionId;
                // line = line.substring(objSalesOrderRecord.id.toString().length, line.length);
                line = line.split('-');
                stUniqueKey = line[1];

                if (arrLineItems[j].type == 'contract') {
                    log.debug('EXTEND UTIL _createExtendOrder: j loop contractid arrLineItems: ', arrLineItems[j].contractId);
                    if (arrLineItems[j].contractId) {
                        objExtendResponseData[stUniqueKey].contractIds.push(arrLineItems[j].contractId);
                    }
                }
                if (arrLineItems[j].type == 'lead') {
                    log.debug('EXTEND UTIL _createExtendOrder: j loop leadTokens arrLineItems: ', arrLineItems[j].leadToken);
                    if (arrLineItems[j].leadToken) {
                        objExtendResponseData[stUniqueKey].leadTokens.push(arrLineItems[j].leadToken);
                    }
                }
            }
            log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData', objExtendResponseData);

            for (key in objExtendResponseData) {

                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[key].contractIds: ', key + '|' + objExtendResponseData[key].contractIds);
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[key].leadTokens: ', key + '|' + objExtendResponseData[key].leadTokens);
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[key].lineItemTransactionId: ', key + '|' + objExtendResponseData[key].lineItemTransactionId);

                // If Extend contract is created, populate the appropriate custom column field for contracts
                // on the Sales Order line
                var stContractIds = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: key });
                var stLeadTokens = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_lead_token', line: key });
                log.debug('EXTEND UTIL _createExtendOrder: stContractIds | stLeadTokens: ', stContractIds + '|' + stLeadTokens + typeof stContractIds);
                if (stContractIds) {
                    var arrContractIds = JSON.parse(stContractIds);
                    objExtendResponseData[key].contractIds.concat(arrContractIds);
                }
                if (stLeadTokens) {
                    var arrLeadTokens = JSON.parse(stLeadTokens);
                    objExtendResponseData[key].leadTokens.concat(arrLeadTokens);
                }

                log.debug('EXTEND UTIL _createExtendOrder: newContractIds | stLeadTokens: ', objExtendResponseData[key].contractIds + '|' + objExtendResponseData[key].leadTokens + typeof objExtendResponseData[key].leadTokens);

                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: key, value: JSON.stringify(objExtendResponseData[key].contractIds) });
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_lead_token', line: key, value: JSON.stringify(objExtendResponseData[key].leadTokens) });
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_line_id', line: key, value: objExtendResponseData[key].lineItemTransactionId });
                if (objExtendResponseData[key].extendLine) {
                    objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: objExtendResponseData[key].extendLine, value: JSON.stringify(objExtendResponseData[key].contractIds) });

                }
            }
            return objSalesOrderRecord;

        };
        //get Sales Order Info required for contract create
        exports.getSalesOrderInfo = function (objSalesOrderRecord) {
            log.debug('EXTEND UTIL _getSalesOrderInfo:', '**ENTER**');
            var objExtendData = {};
            log.debug('EXTEND UTIL _getSalesOrderInfo: ExtendData Object', objExtendData);
            var objCustomerInfo = exports.getCustomerInfo(objSalesOrderRecord.getValue({ fieldId: 'entity' }));
            var objShipAddress = exports.getAddress(objSalesOrderRecord, 'shippingaddress');
            var objBillAddress = exports.getAddress(objSalesOrderRecord, 'billingaddress');
            //Build SO Info Object
            objExtendData.id = objSalesOrderRecord.id + objSalesOrderRecord.getValue({ fieldId: 'tranid' });
            objExtendData.tran_date = exports.getepochDate();
            objExtendData.currency = 'USD';
            objExtendData.order_number = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
            objExtendData.total_amount = objSalesOrderRecord.getValue({ fieldId: 'total' });
            objExtendData.shipping_total_amount = objSalesOrderRecord.getValue({ fieldId: 'shippingcost' });
            objExtendData.tax_total_amount = objSalesOrderRecord.getValue({ fieldId: 'taxtotal' });
            objExtendData.name = objCustomerInfo.name;
            if(exports.objectIsEmpty(objCustomerInfo.name)){
                objExtendData.name = objCustomerInfo.altName;
            }
            //objExtendData.name = objSalesOrderRecord.getText({ fieldId: 'entity' }).replace(/[0-9]/g, ''); //update this
            objExtendData.email = objCustomerInfo.email;
            objExtendData.phone = objCustomerInfo.phone;
            objExtendData.bill_address1 = objBillAddress.address1;
            objExtendData.bill_address2 = objBillAddress.address2;
            objExtendData.bill_city = objBillAddress.city;
            objExtendData.bill_state = objBillAddress.state;
            objExtendData.bill_zip = objBillAddress.zip;
            objExtendData.bill_country = objBillAddress.country;
            objExtendData.ship_address1 = objShipAddress.address1;
            objExtendData.ship_address2 = objShipAddress.address2;
            objExtendData.ship_city = objShipAddress.city;
            objExtendData.ship_state = objShipAddress.state;
            objExtendData.ship_zip = objShipAddress.zip;
            objExtendData.ship_country = objShipAddress.country;
            return objExtendData;
        };
        exports.getSalesOrderItemInfo = function (objSalesOrderRecord, objExtendConfig) {
            //////////////////////////SUPPORT FUNCTIONS///////////////////////////
            var stLineCount = objSalesOrderRecord.getLineCount({ sublistId: 'item' });
            log.debug('_getExtendData: Get Extend Data', '**ENTER**');

            var objExtendItemData = {};

            //var stExtendProductItemId = runtime.getCurrentScript().getParameter('custscript_ext_protection_plan');
            //move extend item to config record instead of param
            var stExtendProductItemId = objExtendConfig.product_plan_item;
            var stExtendShippingItemId = objExtendConfig.shipping_plan_item;
            log.debug('_getExtendData: stExtendShippingItemId ', stExtendShippingItemId);

            for (var i = 0; i < stLineCount; i++) {
                var stItemId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                stUniqueKey = i;
                //exclude discount
                var stItemType = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'itemtype', line: i });
                log.debug('_getExtendData: stItemType ', stItemType + ' | ' + i);
                if(stItemType == 'Discount'){
                    continue;
                }
                if (!objExtendItemData[stUniqueKey] && (stExtendProductItemId !== stItemId)) {
                    objExtendItemData[stUniqueKey] = {};
                }
                //Check if item is one of the configured extend items
                if (stExtendShippingItemId === stItemId) {
                    //if line is shipping proection
                    objExtendItemData[stUniqueKey] = {};
                    objExtendItemData[stUniqueKey].isShipping = true;
                    // Start building the Extend Order Plan Info Object
                    objExtendItemData[stUniqueKey].quoteId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_quote_id', line: i });
                    //set Extend Line Item Transaction ID on Extend Line
                    objExtendItemData[stUniqueKey].lineItemID = "" + objSalesOrderRecord.id + "-" + i;
                    objExtendItemData[stUniqueKey].shipmentInfo = objSalesOrderRecord.getValue({ fieldId: 'linkedtrackingnumbers' });
                }
                if (stExtendProductItemId === stItemId) {
                    log.debug('_getExtendData: Item Found | Line ', stItemId + ' | ' + i);
                    //get value of leadtoken column on extend line
                    var stLeadToken = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_lead_token', line: i });
                    log.debug('_getExtendData: stLeadToken', stLeadToken + '|' + typeof stLeadToken);

                    //if extend line has lead token mark isLead = T
                    if (stLeadToken) {
                        log.debug('_getExtendData: stLeadToken ', stLeadToken);
                        objExtendItemData[stUniqueKey] = {};
                        objExtendItemData[stUniqueKey].isLead = true;
                        objExtendItemData[stUniqueKey].leadToken = stLeadToken;
                        objExtendItemData[stUniqueKey].quantity = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                        // Start building the Extend Order Plan Info Object
                        objExtendItemData[stUniqueKey].extend_plan_id = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_plan_id', line: i });
                        objExtendItemData[stUniqueKey].extend_line = "" + i;
                        objExtendItemData[stUniqueKey].plan_price = parseInt(objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) * 100);
                        //set Extend Line Item Transaction ID on Extend Line
                        objExtendItemData[stUniqueKey].lineItemID = "" + objSalesOrderRecord.id + "-" + i;
                    }
                    //
                    else {
                        //get related item from extend line
                        var stExtendItemRefId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });

                        for (var j = 0; j < stLineCount; j++) {
                            var stRelatedItem = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                            if (stRelatedItem === stExtendItemRefId) {
                                log.debug('_getExtendData: stRelatedItem| stExtendItemRefId ', stRelatedItem + ' | ' + stExtendItemRefId);

                                stUniqueKey = j;
                                if (!objExtendItemData[stUniqueKey]) {
                                    objExtendItemData[stUniqueKey] = {};
                                }
                                // Start building the Extend Order Plan Info Object
                                objExtendItemData[stUniqueKey].extend_plan_id = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_plan_id', line: i });
                                objExtendItemData[stUniqueKey].itemId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });;
                                objExtendItemData[stUniqueKey].extend_line = "" + i;
                                objExtendItemData[stUniqueKey].plan_price = parseInt(objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) * 100);
                                //set Extend Line Item Transaction ID of related product on Extend Line
                                objExtendItemData[stUniqueKey].lineItemID = "" + objSalesOrderRecord.id + "-" + j + "-" + i;
                                var stRelatedItemID = "" + objSalesOrderRecord.id + "-" + j + "-" + i;
                                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_line_id', line: i, value: stRelatedItemID });
                            }
                        }
                    }
                }

                else {
                    // Start building the Extend Order Item Info Object
                    objExtendItemData[stUniqueKey].quantity = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    objExtendItemData[stUniqueKey].fulfilledQuantity = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantityfulfilled', line: i });
                    objExtendItemData[stUniqueKey].itemId = stItemId
                    objExtendItemData[stUniqueKey].line = i;
                    objExtendItemData[stUniqueKey].purchase_price = parseInt(objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) * 100);
                    objExtendItemData[stUniqueKey].lineItemID = "" + objSalesOrderRecord.id + "-" + i;
                    if (objExtendItemData[stUniqueKey].extend_line) {
                        objExtendItemData[stUniqueKey].lineItemID = objExtendItemData[stUniqueKey].lineItemID + "-" + objExtendItemData[stUniqueKey].extend_line;
                    }
                }

            }
            return objExtendItemData;
        };
        // Build the Extend API JSON for order lines
        exports.buildExtendItemJSON = function (objValues, objExtendConfig) {
            //item json
            var lineItems = [];
            for (key in objValues) {
                //if line is leadToken contract
                if (objValues[key].isLead) {
                    var item = {
                        'leadToken': objValues[key].leadToken,
                        'quantity': objValues[key].quantity,
                        'lineItemTransactionId': objValues[key].lineItemID
                    }
                    if (objValues[key].extend_plan_id && objValues[key].plan_price) {
                        item.plan = {
                            'id': objValues[key].extend_plan_id.toString(),
                            'purchasePrice': objValues[key].plan_price
                        }
                    }
                } else if (objValues[key].isShipping) {
                    var item = {
                        "quoteId": objValues[key].quoteId,
                        'lineItemTransactionId': objValues[key].lineItemID,
                        "shipmentInfo": objValues[key].shipmentInfo
                    }
                }
                else {
                    //get product refId
                    log.debug('_buildExtendItemJSON: objValues', objValues);
                    objValues[key].refId = exports.getItemRefId(objValues[key].itemId, objExtendConfig);
                    var item = {
                        'product': {
                            'id': objValues[key].refId,
                            // 'serialNumber': objValues.serial_number,
                            'purchasePrice': objValues[key].purchase_price
                        },
                        'quantity': objValues[key].quantity,
                        'fulfilledQuantity': objValues[key].fulfilledQuantity,
                        'lineItemTransactionId': objValues[key].lineItemID
                    }
                    if (objValues[key].extend_plan_id && objValues[key].plan_price) {
                        item.plan = {
                            'id': objValues[key].extend_plan_id.toString(),
                            'purchasePrice': objValues[key].plan_price
                        }
                    }
                }

                lineItems.push(item);


            }
            log.debug('_buildExtendItemJSON: lineItems', lineItems);

            return lineItems;
        };
        // Build the Extend API JSON for order creation
        exports.buildExtendOrderJSON = function (objValues, objExtendConfig) {
            log.debug('EXTEND UTIL _buildExtendOrderJSON:', '**ENTER**');

            // Date is a string and we need to format for extend
            const stTranDate = new Date(objValues.tran_date);

            //If Demo use demo email for contracts
            //            var config = EXTEND_CONFIG.getConfig();
            if (objExtendConfig.email) {
                objValues.email = objExtendConfig.email;
            }

            var objJSON = {
                'currency': objValues.currency,
                'customer': {
                    'email': objValues.email,
                    'name': objValues.name,
                    'phone': objValues.phone,
                    'billingAddress': {
                        'address1': objValues.bill_address1,
                        'address2': objValues.bill_address2,
                        'city': objValues.bill_city,
                        'postalCode': objValues.bill_zip,
                        'countryCode': objValues.bill_country,
                        'province': objValues.bill_state,
                    },
                    'shippingAddress': {
                        'address1': objValues.ship_address1,
                        'address2': objValues.ship_address2,
                        'city': objValues.ship_city,
                        'postalCode': objValues.ship_zip,
                        'countryCode': objValues.ship_country,
                        'province': objValues.ship_state

                    }
                },
                'storeId': objExtendConfig.storeId,
                'lineItems': objValues.lineItems,
                'total': parseInt(objValues.total_amount * 100),
                'shippingCostTotal': parseInt(objValues.shipping_total_amount * 100),
                'taxCostTotal': parseInt(objValues.tax_total_amount * 100),
                'transactionId': objValues.id,
            }

            return objJSON;
        };
        // Build the Extend API JSON for shipment info
        exports.buildExtendShipmentJSON = function (objValues) {
            var shipmentInfo = [];
            for (key in objValues) {
            var objJSON = {
                'lineItemTransactionId': objValues[key].lineItemID,
                'productIds': objValues[key].prodcutIds,
                'shipmentDate': objValues[key].lineItemID,
                'shippingProvider': objValues[key].carrier,
                'trackingId': objValues[key].trackingId,
                'trackingUrl': objValues[key].trackingUrl,
                'destination': {
                    'address1': objValues[key].dest_address1,
                    'address2': objValues[key].dest_address2,
                    'city': objValues[key].dest_city,
                    'postalCode': objValues[key].dest_zip,
                    'countryCode': objValues[key].dest_country,
                    'province': objValues[key].dest_state,
                },
                'source': {
                    'address1': objValues[key].source_address1,
                    'address2': objValues[key].source_address2,
                    'city': objValues[key].source_city,
                    'postalCode': objValues[key].source_zip,
                    'countryCode': objValues[key].source_country,
                    'province': objValues[key].source_state,
                }
            }
            shipmentInfo.push(objJSON);

        }
            return shipmentInfo;
        };
        /***********************************Support Functions********************************************/
        //get Address Subrecord fields from transaction 
        exports.getAddress = function (objSalesOrderRecord, addressField) {
            var address = objSalesOrderRecord.getSubrecord({
                fieldId: addressField
            });
            var objAddress = {
                address1: address.getValue({
                    fieldId: 'addr1'
                }),
                address2: address.getValue({
                    fieldId: 'addr2'
                }),
                city: address.getValue({
                    fieldId: 'city'
                }),
                state: address.getValue({
                    fieldId: 'state'
                }),
                country: address.getValue({
                    fieldId: 'country'
                }),
                zip: address.getValue({
                    fieldId: 'zip'
                })
            };
            return objAddress;
        };
        //get Item's reference ID 
        exports.getItemRefId = function (stItemId, objExtendConfig) {
            //          var config = EXTEND_CONFIG.getConfig();
            var refIdValue = objExtendConfig.refId;
            var stItemRefId = stItemId;
            if (refIdValue) {
                // Lookup to item to see if it is eligible for warranty offers
                var arrItemLookup = search.lookupFields({
                    type: 'item',
                    id: stItemId,
                    columns: refIdValue
                });
                for (var prop in arrItemLookup) {
                    var stItemRefId = arrItemLookup[prop];
                    if (!stItemRefId) {
                        var stItemRefId = arrItemLookup[prop][0].text;
                    }
        
                    var arrItemRefId = stItemRefId.split(": ");
        
                    if (arrItemRefId.length > 1) {
                        stItemRefId = arrItemRefId[1]
        
                    }
                    break;
                }
            }

            return stItemRefId;
        };
        //get Transaction Date required for contract create
        exports.getTransactionDate = function (stDate) {
            var stTimeDate = new Date(stDate);
            return stTimeDate.getTime() / 1000;
        };
        //get Current Date in epoch format required for contract create
        exports.getepochDate = function () {
            var stTimeDate = new Date();
            return stTimeDate.getTime();
        };
        //get Customer Info required for contract create
        exports.getCustomerInfo = function (stCustomerId) {
            var objCustomerRecord = record.load({
                type: 'customer',
                id: stCustomerId
            });
            var objCustomerInfo = {
                "altName" : objCustomerRecord.getValue({ fieldId: 'altname' }),
                "name": objCustomerRecord.getValue({ fieldId: 'firstname' }) + ' ' + objCustomerRecord.getValue({ fieldId: 'lastname' }),
                "email": objCustomerRecord.getValue({ fieldId: 'email' }),
                "phone": objCustomerRecord.getValue({ fieldId: 'phone' }),
                "bill_address1": objCustomerRecord.getValue({ fieldId: 'billaddr1' }),
                "bill_address2": objCustomerRecord.getValue({ fieldId: 'billaddr2' }),
                "bill_city": objCustomerRecord.getValue({ fieldId: 'billcity' }),
                "bill_state": objCustomerRecord.getValue({ fieldId: 'billstate' }),
                "bill_zip": objCustomerRecord.getValue({ fieldId: 'billzip' }),
                "bill_country": "US",
                "ship_address1": objCustomerRecord.getValue({ fieldId: 'shipaddr1' }),
                "ship_address2": objCustomerRecord.getValue({ fieldId: 'shipaddr2' }),
                "ship_city": objCustomerRecord.getValue({ fieldId: 'shipcity' }),
                "ship_state": objCustomerRecord.getValue({ fieldId: 'shipstate' }),
                "ship_zip": objCustomerRecord.getValue({ fieldId: 'shipzip' }),
                "ship_country": "US",
            }
            log.debug('objCustomerInfo', objCustomerInfo)
            return objCustomerInfo;
        };
        //get Item Purchase Price
        exports.getPurchasePrice = function (stItemId) {
            var arrFilters = [];
            arrFilters.push(search.createFilter({ name: 'internalid', operator: 'is', values: [stItemId] }));
            var arrColumns = [];
            arrColumns.push(search.createColumn({ name: 'baseprice' }));

            var arrSearchResults = exports.search('item', null, arrFilters, arrColumns);
            var stPurchasePrice;
            if (arrSearchResults.length) {
                stPurchasePrice = arrSearchResults[0].getValue({ name: 'baseprice' });
            }
            return stPurchasePrice;
        };
        /***********************************Support Functions********************************************/
        /**
         * Performs empty validations
         */
        exports.objectIsEmpty = function (obj) {
            for (var prop in obj) {
                if (obj.hasOwnProperty(prop))
                    return false;
            }
            return true;
        };
        exports.stringIsEmpty = function (stValue) {
            if ((stValue == '') || (stValue == null) || (stValue == undefined)) {
                return true;
            }
            return false;
        };
        /**
         * Createa Custom Error Object
         */
        exports.createError = function (objErrorDetails) {
            var objCustomError = error.create({
                name: objErrorDetails.title,
                message: objErrorDetails.message,
                notifyOff: true
            });
            return objCustomError;
        };
        /**
         * Performs search with no size limitations
         */
        exports.search = function (stRecordType, stSearchId, arrSearchFilter, arrSearchColumn, bUseFilterExpressions, arrSearchSetting) {
            if (!stRecordType && !stSearchId) {
                throw 'search: Missing a required argument. Either stRecordType or stSearchId should be provided.';
            }

            var arrReturnSearchResults = [];
            var objSavedSearch;
            var intMaxResults = 1000;
            if (stSearchId) {
                objSavedSearch = search.load({
                    id: stSearchId
                });
            }
            else {
                objSavedSearch = search.create({
                    type: stRecordType
                });
            }

            // add search filter if one is passed
            if (arrSearchFilter) {
                //Use Filter Expressions if that option has been enabled
                if (bUseFilterExpressions) {
                    if (stSearchId) {
                        objSavedSearch.filterExpression = objSavedSearch.filters.concat(arrSearchFilter);
                    }
                    else {
                        objSavedSearch.filterExpression = arrSearchFilter;
                    }
                }
                else {
                    if (stSearchId) {
                        objSavedSearch.filters = objSavedSearch.filters.concat(arrSearchFilter);
                    }
                    else {
                        objSavedSearch.filters = arrSearchFilter;
                    }
                }
            }
            // add search column if one is passed
            if (arrSearchColumn) {
                if (stSearchId) {
                    objSavedSearch.columns = objSavedSearch.columns.concat(arrSearchColumn);
                }
                else {
                    objSavedSearch.columns = arrSearchColumn;
                }
            }
            // add search settings if one is passed
            if (arrSearchSetting && arrSearchSetting.length > 0) {
                if (stSearchId) {
                    objSavedSearch.settings = objSavedSearch.columns.concat(arrSearchSetting);
                }
                else {
                    objSavedSearch.settings = arrSearchSetting;
                }
            }

            var objResultSet = objSavedSearch.run();
            var intSearchIndex = 0;
            var arrResultSlice = null;
            do {
                arrResultSlice = objResultSet.getRange(intSearchIndex, intSearchIndex + intMaxResults);
                if (arrResultSlice == null) {
                    break;
                }
                arrReturnSearchResults = arrReturnSearchResults.concat(arrResultSlice);
                intSearchIndex = arrReturnSearchResults.length;
            }
            while (arrResultSlice.length >= intMaxResults);

            return arrReturnSearchResults;
        };
        return exports;
    });