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
        exports.createExtendOrder = function (objSalesOrderRecord, objExtendConfig) {
            log.audit('EXTEND UTIL _createExtendOrder:', '**ENTER**');
            log.audit('EXTEND UTIL _createExtendOrder: SO ID', objSalesOrderRecord.id);
            var objExtendOrderRequestJSON = {};

            //build order data obj
            var objExtendData = {};
            //get SO header data
            objExtendData = exports.getSalesOrderInfo(objSalesOrderRecord);
            log.audit('EXTEND UTIL _createExtendOrder: getSalesOrderInfo objExtendData', objExtendData);
            //build array of items
            var objExtendItemData = exports.getSalesOrderItemInfo(objSalesOrderRecord);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendItemData', objExtendItemData);
            //format items
            objExtendData.lineItems = exports.buildExtendItemJSON(objExtendItemData, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendData', objExtendData);

            //build order json obj
            objExtendOrderRequestJSON = exports.buildExtendOrderJSON(objExtendData, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: objExtendOrderRequestJSON', objExtendOrderRequestJSON);
            //call api
            var objExtendResponse = EXTEND_API.createOrder(objExtendOrderRequestJSON, objExtendConfig);
            log.audit('EXTEND UTIL _createExtendOrder: Extend Response Object: ', objExtendResponse);
            //handle response
            if (objExtendResponse.code === 201) {
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
        //fulfill items on order
        exports.fulfillExtendOrder = function (objSalesOrderRecord, stFulfillmentId, objExtendConfig) {
            log.audit('EXTEND UTIL _fulfillExtendOrder:', '**ENTER**');
            log.audit('EXTEND UTIL _fulfillExtendOrder: SO ID', objSalesOrderRecord.id);

            //build order data obj
            var objExtendData = {};
            //get fulfillment data
            objExtendData = exports.getFulfillmentData(objSalesOrderRecord);
            log.audit('EXTEND UTIL _fulfillExtendOrder: getFulfillmentData objExtendData', objExtendData);

            for (key in objExtendData) {
                //build fulfillment json obj
                var objExtendFulfillRequestJSON = {};
                objExtendFulfillRequestJSON = exports.buildExtendFulfillJSON(objExtendData[key]);
                log.audit('EXTEND UTIL _fulfillExtendOrder: objExtendFulfillRequestJSON', objExtendFulfillRequestJSON);
                // Create contract call for quantity fulfilled on the Extend item 
                for (var i = 0; i < objExtendData[key].quantity; i++) {
                    //get extend contract array for line
                    log.debug('EXTEND UTIL _fulfillExtendOrder: objExtendFulfillRequestJSON',objExtendData[key].contractIds);
                    //call api
                    var objExtendResponse = EXTEND_API.fulfillOrderLine(objExtendFulfillRequestJSON, objExtendConfig);
                    log.audit('EXTEND UTIL _fulfillExtendOrder: Extend Response Object: ', objExtendResponse);
                    //handle response
                    if (objExtendResponse.code === 201) {
                        var objExtendResponseBody = JSON.parse(objExtendResponse.body);
                        //push new contract id to contracts array
                        objExtendData[key].contractIds.push();

                        //submit fields to IF
                        record.submitFields({
                            type: record.Type.ITEM_FULFILLMENT,
                            id: stFulfillmentId,
                            values: {
                                'custbody_ext_order_create': true
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });

                    } else {
                        log.error('EXTEND UTIL _fulfillExtendOrder', objExtendResponse);
                        //submit fields
                        record.submitFields({
                            type: record.Type.ITEM_FULFILLMENT,
                            id: stFulfillmentId,
                            values: {
                                'custbody_ext_process_error': true
                            },
                            options: {
                                enableSourcing: false,
                                ignoreMandatoryFields : true
                            }
                        });
                        // create user note attached to record                 
                        var objNoteRecord = record.create({
                            type: record.Type.NOTE,
                        })
                        objNoteRecord.setValue('transaction', stFulfillmentId);
                        objNoteRecord.setValue('title', 'Extend Order Create Error');
                        objNoteRecord.setValue('note', JSON.stringify(objExtendResponse));
                        var stNoteId = objNoteRecord.save();
                    }
                }
                //set contract column on SO line
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: key, value: JSON.stringify(objExtendData[key].contractIds) });
            }
            objFulfillmentRecord.save();

        };

        //refund item by line item transaction id
        exports.refundExtendOrder = function (objRefundData) {
            log.audit('EXTEND UTIL _refundExtendOrder:', '**ENTER**');
            log.audit('EXTEND UTIL _refundExtendOrder: objRefundData', JSON.stringify(objRefundData));

            var config = EXTEND_CONFIG.getConfig();
            var objLineToRefund = {'lineItemTransactionId': objRefundData['lineItemTransactionId']}
            var objExtendResponse = EXTEND_API.refundContract(objLineToRefund, config);
            log.audit('EXTEND UTIL _refundExtendOrder: Extend Response Object: ', objExtendResponse);

            var objRefundedRecord = record.load({
                    type: objRefundData.TYPE,
                    id: objRefundData.ID
                });

            //handle response
            if (objExtendResponse.code === 201) {
                var objExtendResponseBody = JSON.parse(objExtendResponse.body);
                log.debug('EXTEND UTIL _refundExtendOrder: objExtendResponseBody: ', JSON.stringify(objExtendResponseBody));

                // exports.handleOrderResponse(objExtendResponseBody, objRefundedRecord);

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
        exports.getFulfillmentData = function (objNewRecord) {
            log.debug('_getExtendData: Get Extend Data', '**ENTER**');
            var objExtendItemData = {};

            var stExtendItemId = runtime.getCurrentScript().getParameter('custscript_ext_protection_plan');
            var stLineCount = objNewRecord.getLineCount({ sublistId: 'item' });

            for (var i = 0; i < stLineCount; i++) {
                var stItemId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                //Check if item is one of the configured extend items
                if (stExtendItemId === stItemId) {
                    log.debug('_getExtendData: Item Found | Line ', stItemId + ' | ' + i);
                    //get qty of contracts created & compare to extend item qty
                    var arrContracyQty = JSON.parse(objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: i }));
                    log.debug('_getExtendData: stContractID', arrContracyQty + '|' + typeof arrContracyQty);
                    objExtendItemData[stUniqueKey].contractIds = arrContracyQty;

                    var stExtendItemQty = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });

                    if (arrContracyQty.length < stExtendItemQty) {

                        //get related item from extend line
                        var stExtendItemRefId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                        //check for new fulfillments
                        for (var j = 0; j < stLineCount; j++) {
                            var stRelatedItem = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                            if (stRelatedItem === stExtendItemRefId) {

                                var stRelatedItemQtyFulfilled = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantityfulfilled', line: j });
                                if (stRelatedItemQtyFulfilled <= stExtendItemQty && stRelatedItemQtyFulfilled > stContractQty) {

                                    var stUniqueKey = i;
                                    // Start building the Extend Order Info Object
                                    objExtendItemData[stUniqueKey] = {};
                                    objExtendItemData[stUniqueKey].quantity = Math.min(stRelatedItemQtyFulfilled, (stExtendItemQty - stContractQty));
                                    objExtendItemData[stUniqueKey].line = i;
                                    objExtendItemData[stUniqueKey].lineItemID = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_line_id', line: i });
                                }
                            }
                        }

                    }
                }
            }

            log.debug('_getExtendData: return objExtendItemData', objExtendItemData);

            return objExtendItemData
        };
        exports.handleOrderResponse = function (objExtendResponseBody, objSalesOrderRecord) {

            log.debug('EXTEND UTIL _createExtendOrder: Extend Response Body Parsed: ', objExtendResponseBody);
            var arrLineItems = objExtendResponseBody.lineItems;
            var objExtendResponseData = {};
            log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData: ', objExtendResponseData);
            var arrContractID = [];
            var arrLeadToken = [];

            for (var i = 0; i < arrLineItems.length; i++) {
                log.debug('EXTEND UTIL _createExtendOrder: arrLineItems: ', arrLineItems[i]);
                var line = arrLineItems[i].lineItemTransactionId;
               // line = line.substring(objSalesOrderRecord.id.toString().length, line.length);
                line = line.split('-');
                line = line[1];
                log.debug('EXTEND UTIL _createExtendOrder: line: ', line + '|' + typeof line);
                stUniqueKey = line;
                objExtendResponseData[stUniqueKey] = {};
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData: ', objExtendResponseData);
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[stUniqueKey]: ', objExtendResponseData[stUniqueKey]);


                objExtendResponseData[stUniqueKey].lineItemTransactionId = arrLineItems[i].lineItemTransactionId;

                for (var j = 0; j < arrLineItems.length; j++) {
                if (arrLineItems[j].type == 'contract') {
                    log.debug('EXTEND UTIL _createExtendOrder: contractid arrLineItems: ', arrLineItems[j].id);
                    if (arrLineItems[i].id) {
                        objExtendResponseData[stUniqueKey].contractIds.push(arrLineItems[j].id);
                    }
                }
                if (arrLineItems[j].type == 'lead') {
                   // var arrLeadIds = [];
                   // arrLeadIds = objExtendResponseData[stUniqueKey].leadTokens;
                   // log.debug('EXTEND UTIL _createExtendOrder:  arrLeadIds: ', arrLeadIds);
                   // log.debug('EXTEND UTIL _createExtendOrder: leadTokens arrLineItems: ', arrLineItems[i].leadToken);
                    if (arrLineItems[j].leadToken) {
                        objExtendResponseData[stUniqueKey].leadTokens.push(arrLineItems[j].leadToken);
                  //      arrLeadIds.push(arrLineItems[i].leadToken)
                    }
                    //objExtendResponseData[stUniqueKey].leadTokens = arrLeadIds;
                }
            }
            objExtendResponseData[stUniqueKey].contractIds = [];
            objExtendResponseData[stUniqueKey].leadTokens = [];
            }
            log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData', objExtendResponseData);

            for (key in objExtendResponseData) {
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[key].contractIds: ', key + '|' + objExtendResponseData[key].contractIds);
                log.debug('EXTEND UTIL _createExtendOrder: objExtendResponseData[key].leadTokens: ', key + '|' + objExtendResponseData[key].leadTokens);

                // If Extend contract is created, populate the appropriate custom column field for contracts
                // on the Sales Order line
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: key, value: JSON.stringify(objExtendResponseData[key].contractIds) });
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_lead_token', line: key, value: JSON.stringify(objExtendResponseData[key].leadTokens) });
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_line_id', line: key, value: JSON.stringify(objExtendResponseData[key].lineItemTransactionId) });

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
            objExtendData.id = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
            objExtendData.tran_date = exports.getepochDate();
            objExtendData.currency = 'USD';
            objExtendData.order_number = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
            objExtendData.total_amount = objSalesOrderRecord.getValue({ fieldId: 'total' });
            objExtendData.name = objSalesOrderRecord.getText({ fieldId: 'entity' }).replace(/[0-9]/g, '');
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

        exports.getSalesOrderItemInfo = function (objSalesOrderRecord) {
            //////////////////////////SUPPORT FUNCTIONS///////////////////////////
            var stLineCount = objSalesOrderRecord.getLineCount({ sublistId: 'item' });

            log.debug('EXTEND UTIL _createExtendOrder: Line Count', stLineCount);
            log.debug('_getExtendData: Get Extend Data', '**ENTER**');

            var objExtendItemData = {};

            var stExtendItemId = runtime.getCurrentScript().getParameter('custscript_ext_protection_plan');
            for (var i = 0; i < stLineCount; i++) {
                var stItemId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });
                stUniqueKey = i;
                if (stExtendItemId !== stItemId) {
                    objExtendItemData[stUniqueKey] = {};
                }
                //Check if item is one of the configured extend items
                if (stExtendItemId === stItemId) {
                    log.debug('_getExtendData: Item Found | Line ', stItemId + ' | ' + i);

                    //get related item from extend line
                    var stExtendItemRefId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                    for (var j = 0; j < stLineCount; j++) {
                        var stRelatedItem = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                        if (stRelatedItem === stExtendItemRefId) {
                            log.debug('_getExtendData: stRelatedItem| stExtendItemRefId ', stRelatedItem + ' | ' + stExtendItemRefId);

                            stUniqueKey = j;
                            // Start building the Extend Order Plan Info Object
                            objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                            objExtendItemData[stUniqueKey].extend_plan_id = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_plan_id', line: i });
                            objExtendItemData[stUniqueKey].itemId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });;
                            objExtendItemData[stUniqueKey].extend_line = i;
                            objExtendItemData[stUniqueKey].plan_price = parseInt(objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) * 100);
                            //set Extend Line Item Transaction ID of related product on Extend Line
                            var stRelatedItemID = "" + objSalesOrderRecord.id + "-" + j + "-" + i;
                            log.debug('_getExtendData: stRelatedItemID ', stRelatedItemID);
                            objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_so_line', line: i, value: stRelatedItemID });
                        }
                    }
                } else {
                    // Start building the Extend Order Item Info Object
                    objExtendItemData[stUniqueKey].quantity = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    objExtendItemData[stUniqueKey].itemId = stItemId
                    //objExtendItemData[stUniqueKey].uniqueLine = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'lineuniquekey', line: i });
                    objExtendItemData[stUniqueKey].line = i;
                    objExtendItemData[stUniqueKey].purchase_price = parseInt(objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i }) * 100);
                    objExtendItemData[stUniqueKey].lineItemID = "" + objSalesOrderRecord.id + "-" + i;
                }

            }
            return objExtendItemData;
        };
        // Build the Extend API JSON for order lines
        exports.buildExtendItemJSON = function (objValues, objExtendConfig) {
            //item json
            var lineItems = [];
            for (key in objValues) {
                //get product refId
                objValues.refId = exports.getItemRefId(objValues[key].itemId, objExtendConfig);
                var item = {
                    'product': {
                        'id': objValues.refId,
                        // 'serialNumber': objValues.serial_number,
                        'purchasePrice': objValues[key].purchase_price
                    },
                    'status': 'unfulfilled',
                    'quantity': objValues[key].quantity,
                    'lineItemTransactionId': objValues[key].lineItemID
                }
                if (objValues[key].extend_plan_id && objValues[key].plan_price) {
                    item.plan = {
                        'id': objValues[key].extend_plan_id.toString(),
                        'purchasePrice': objValues[key].plan_price
                    }
                }
                lineItems.push(item);


            }
            log.debug('_buildExtendItemJSON: lineItems', lineItems);

            return lineItems;
        };
        // Build the Extend API JSON for order creation
        exports.buildExtendOrderJSON = function (objValues, config) {
            log.debug('EXTEND UTIL _buildExtendOrderJSON:', '**ENTER**');

            // Date is a string and we need to format for extend
            const stTranDate = new Date(objValues.tran_date);

            //If Demo use demo email for contracts
//            var config = EXTEND_CONFIG.getConfig();
            if (config.email) {
                objValues.email = config.email;
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
                'storeId': config.storeId,
                'lineItems': objValues.lineItems,
                'total': parseInt(objValues.total_amount * 100),
                'transactionId': objValues.id,
            }

            return objJSON;
        };
        // Build the Extend API JSON for line fulfillment
        exports.buildExtendFulfillJSON = function (objValues) {
            var objJSON = {
                'lineItemTransactionId': objValues.lineItemID
            }
            return objJSON;
        }
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
        }
        //get Item's reference ID 
        exports.getItemRefId = function (stItemId, config) {
  //          var config = EXTEND_CONFIG.getConfig();
            var refIdValue = config.refId;
            var stItemRefId = stItemId;
            if (refIdValue) {
                // Lookup to item to see if it is eligible for warranty offers
                var arrItemLookup = search.lookupFields({
                    type: 'item',
                    id: stItemId,
                    columns: refIdValue
                });
                for (var prop in arrItemLookup) {
                    //var stItemRefId = arrItemLookup[prop]
                    var stItemRefId = arrItemLookup[prop][0].text;
                    break;
                }
            }

            return stItemRefId;
        }
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