/**
 *@name: EXTEND SUITESCRIPT SDK - Models JS
 *@description: Structures the various JSON request bodies to the Extend API
 * @NApiVersion 2.x
 */
define([
    'N/search',
    'N/record',
    'N/error',
    '../lib/customscript_ext_api_lib',
    '../lib/customscript_ext_config_lib'

],
    function (search, record, error, EXTEND_API, EXTEND_CONFIG) {
        var exports = {};
        /**
         * Order Functions
         */
        //create extend order
        exports.createExtendOrder = function (objSalesOrderRecord) {
            log.debug('EXTEND UTIL _createExtendOrder:', '**ENTER**');
            log.debug('EXTEND UTIL _createExtendOrder: SO ID', objSalesOrderRecord.id);
            var objExtendOrderRequestJSON = {};

            //build array of items
            var objExtendItemData = exports.getSalesOrderInfo(objSalesOrderRecord);
            log.debug('EXTEND UTIL _createExtendOrder: objExtendItemData', objExtendItemData);

            //build order data obj
            var objExtendData = {};
            objExtendData = exports.getSalesOrderInfo(objSalesOrderRecord);
            log.debug('EXTEND UTIL _createExtendOrder: objExtendData', objExtendData);


            objExtendData.lineItems = exports.buildExtendItemJSON(objExtendItemData);
            log.debug('EXTEND UTIL _createExtendOrder: objExtendData', objExtendData);

            //build order json obj
            objExtendOrderRequestJSON = exports.buildExtendOrderJSON(objExtendData);
            log.debug('EXTEND UTIL _createExtendOrder: objExtendContractRequestJSON', objExtendOrderRequestJSON);
            //call api
            var objExtendResponse = EXTEND_API.createWarrantyContract(objExtendOrderRequestJSON);
            log.debug('EXTEND UTIL _createExtendOrder: Extend Response Object: ', objExtendResponse);
            //handle response
            if (objExtendResponse.code === 201) {
                var objExtendResponseBody = JSON.parse(objExtendResponse.body);
                log.debug('EXTEND UTIL _createExtendOrder: Extend Response Body Parsed: ', objExtendResponseBody);

            } else {
                log.error('EXTEND UTIL _createExtendContracts', objExtendResponse);
                objSalesOrderRecord.setValue({ fieldId: 'custbody_ext_process_error', value: true });
                // create user note attached to record                 
                var objNoteRecord = record.create({
                    type: record.Type.NOTE,
                })
                objNoteRecord.setValue('transaction', objSalesOrderRecord.id);
                objNoteRecord.setValue('title', 'Extend Order Create Error');
                objNoteRecord.setValue('note', JOSN.stringify(objExtendResponse));
                var stNoteId = objNoteRecord.save();
            }

            //storing returned contract ids
            /*
            var arrContractIds = [];
            var stExtendContractId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: objExtendData[key].line });;

            if (stExtendContractId) {
                arrContractIds = JSON.parse(stExtendContractId);
            }

        // If Extend contract is created, populate the appropriate custom column field for contracts
        // on the Sales Order line
        objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: objExtendData[key].line, value: JSON.stringify(arrContractIds) });
*/
            objSalesOrderRecord.save();
        };

        //get Sales Order Info required for contract create
        exports.getSalesOrderInfo = function (objSalesOrderRecord) {
            log.debug('EXTEND UTIL _getSalesOrderInfo:', '**ENTER**');
            var objExtendData = {};
            log.debug('EXTEND UTIL _getSalesOrderInfo: ExtendData Object', objExtendData);
            var objCustomerInfo = exports.getCustomerInfo(objSalesOrderRecord.getValue({ fieldId: 'entity' }));
            //Build SO Info Object
            objExtendData.id = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
            objExtendData.tran_date = exports.getepochDate();
            objExtendData.currency = 'USD';
            objExtendData.order_number = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
            objExtendData.total_amount = objSalesOrderRecord.getValue({ fieldId: 'total' });
            objExtendData.name = objSalesOrderRecord.getText({ fieldId: 'entity' }).replace(/[0-9]/g, '');
            objExtendData.email = objCustomerInfo.email;
            objExtendData.phone = objCustomerInfo.phone;
            objExtendData.bill_address1 = objCustomerInfo.bill_address1;
            objExtendData.bill_address2 = objCustomerInfo.bill_address2;
            objExtendData.bill_city = objCustomerInfo.bill_city;
            objExtendData.bill_state = objCustomerInfo.bill_state;
            objExtendData.bill_zip = objCustomerInfo.bill_zip;
            objExtendData.bill_country = objCustomerInfo.bill_country;
            objExtendData.ship_address1 = objCustomerInfo.ship_address1;
            objExtendData.ship_address2 = objCustomerInfo.ship_address2;
            objExtendData.ship_city = objCustomerInfo.ship_city;
            objExtendData.ship_state = objCustomerInfo.ship_state;
            objExtendData.ship_zip = objCustomerInfo.ship_zip;
            objExtendData.ship_country = objCustomerInfo.ship_country;
            return objExtendData;
        };
        exports.getItemRefId = function (stItemId) {
            var refIdValue = EXTEND_CONFIG.getConfig().refId;
            var stItemRefId = stItemId;
            if (refIdValue) {
                // Lookup to item to see if it is eligible for warranty offers
                var arrItemLookup = search.lookupFields({
                    type: 'item',
                    id: stItemId,
                    columns: refIdValue
                });
                for (var prop in arrItemLookup) {
                    var stItemRefId = arrItemLookup[prop]
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
        exports.getSalesOrderItemInfo = function (objSalesOrderRecord) {

            //////////////////////////SUPPORT FUNCTIONS///////////////////////////
            var stLineCount = objSalesOrderRecord.getLineCount({ sublistId: 'item' });

            log.debug('EXTEND UTIL _createExtendOrder: Line Count', stLineCount);
            log.debug('_getExtendData: Get Extend Data', '**ENTER**');

            var objExtendItemData = {};

            var stExtendItemId = runtime.getCurrentScript().getParameter('custscript_ext_protection_plan');
            for (var i = 0; i < stLineCount; i++) {
                stUniqueKey = i;
                objExtendItemData[stUniqueKey] = {};
                var stItemId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: i });

                //Check if item is one of the configured extend items
                if (stExtendItemId === stItemId) {
                    log.debug('_getExtendData: Item Found | Line ', stItemId + ' | ' + i);

                    //get related item from extend line
                    var stExtendItemRefId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                    for (var j = 0; j < stLineCount; j++) {
                        var stRelatedItem = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'item', line: j });
                        if (stRelatedItem === stExtendItemRefId) {
                            // Start building the Extend Order Plan Info Object
                            objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });
                            objExtendItemData[stUniqueKey].extend_plan_id = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_plan_id', line: i });
                            objExtendItemData[stUniqueKey].itemId = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_associated_item', line: i });;
                            objExtendItemData[stUniqueKey].plan_price = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });

                        }
                    }
                } else {
                    // Start building the Extend Order Item Info Object
                    objExtendItemData[stUniqueKey].quantity = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'quantity', line: i });
                    objExtendItemData[stUniqueKey].item = stItemId
                    objExtendItemData[stUniqueKey].line = i;
                    objExtendItemData[stUniqueKey].purchase_price = objNewRecord.getSublistValue({ sublistId: 'item', fieldId: 'rate', line: i });
                }

            }
        };
        exports.buildExtendItemJSON = function (objValues) {
            //item json
            var lineItems = [];
            for (key in objValues) {
                var item = {
                    'plan': {
                        'id': objValues[key].extend_plan_id,
                        'purchasePrice': parseInt(objValues[key].plan_price * 100)
                    },
                    'product': {
                        'id': objValues.refId,
                        // 'serialNumber': objValues.serial_number,
                        'purchasePrice': parseInt(objValues[key].purchase_price * 100)
                    },
                    'quantity': objValues[key].quantity
                }
                log.debug('_buildExtendItemJSON: Item obj | Line ', item + ' | ' + key);
                lineItems.push(item);

            }
            log.debug('_buildExtendItemJSON: lineItems', lineItems);

            return lineItems;
        };
        // Build the Extend API JSON for contract creation
        exports.buildExtendOrderJSON = function (objValues) {
            log.debug('EXTEND UTIL _buildExtendOrderJSON:', '**ENTER**');

            // Date is a string and we need to format for extend
            const stTranDate = new Date(objValues.tran_date);

            //get product refId
            objValues.refId = exports.getItemRefId(objValues.itemId);
            //If Demo use demo email for contracts
            var config = EXTEND_CONFIG.getConfig();
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