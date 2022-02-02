/**
 *@name: EXTEND SUITESCRIPT SDK - Models JS
 *@description: Structures the various JSON request bodies to the Extend API
 * @NApiVersion 2.x
 */
 define([
    'N/search',
    'N/record',
    'N/error',
    '../libs/customscript_ext_api_lib',
],
    function (search, record, error, EXTEND_API) {
        var exports = {};
   exports.getCONSTANTS = function(){
     const CONSTANTS = {};
         CONSTANTS.objWarrantyStatus = {
            notSynced: 1,
            synced: 2,
            warrantable: 3,
            nonWarrantable: 4,
            syncError: 5
        };
     return CONSTANTS;
   }
     
        /**
         * Contract Functions
         */
        //create extend contracts
        exports.createExtendContracts = function (objExtendData, objSalesOrderRecord) {
            log.debug('EXTEND UTIL _createExtendContracts:', '**ENTER**');
            log.debug('EXTEND UTIL _createExtendContracts: SO ID', objSalesOrderRecord.id);

            for (key in objExtendData) {

                var objExtendContractRequestJSON = {};
                var stQuantity = objExtendData[key].quantity;
                log.debug('EXTEND UTIL _createExtendContracts: Quantity of Line', stQuantity);
                var arrContractIds = [];
                var stExtendContractQty = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_qty', line: objExtendData[key].line });
                var stExtendContractId = objSalesOrderRecord.getSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: objExtendData[key].line });;

                if (stExtendContractId) {
                    arrContractIds = JSON.parse(stExtendContractId);
                }
                // Create contract call for quantity fulfilled on the Extend item 
                for (var i = 0; i < stQuantity; i++) {
                    objExtendContractRequestJSON = exports.buildExtendContractJSON(objExtendData[key]);
                    log.debug('EXTEND UTIL _createExtendContracts: objExtendContractRequestJSON', objExtendContractRequestJSON);

                    var objExtendResponse = EXTEND_API.createWarrantyContract(objExtendContractRequestJSON);
                    log.debug('EXTEND UTIL _createExtendContracts: Extend Response Object: ' + i, objExtendResponse);
                    if (objExtendResponse.code === 201) {
                        var objExtendResponseBody = JSON.parse(objExtendResponse.body);
                        arrContractIds.push(objExtendResponseBody.id);
                        stExtendContractQty++;
                    } else {
                        log.error('EXTEND UTIL _createExtendContracts', objExtendResponse);
                        objSalesOrderRecord.setValue({ fieldId: 'custbody_ext_process_error', value: true });
                        // create user note attached to record                 
                        var objNoteRecord = record.create({
                            type: record.Type.NOTE,
                        })
                        objNoteRecord.setValue('transaction', objSalesOrderRecord.id);
                        objNoteRecord.setValue('title', 'Extend Contract Create Error | Line ' + key);
                        objNoteRecord.setValue('note', objExtendResponse);
                        var stNoteId = objNoteRecord.save();
                    }
                }
                log.debug('EXTEND UTIL _createExtendContracts: arrContractIds', arrContractIds);
                log.debug('EXTEND UTIL _createExtendContracts: new stExtendContractQty', stExtendContractQty);

                // If Extend contract is created, populate the appropriate custom column field for contracts
                // on the Sales Order line
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_qty', line: objExtendData[key].line, value: stExtendContractQty });
                objSalesOrderRecord.setSublistValue({ sublistId: 'item', fieldId: 'custcol_ext_contract_id', line: objExtendData[key].line, value: JSON.stringify(arrContractIds) });
            }

            objSalesOrderRecord.save();
        };

        //get Sales Order Info required for contract create
        exports.getSalesOrderInfo = function (objExtendData, objSalesOrderRecord) {
            log.debug('EXTEND UTIL _getSalesOrderInfo:', '**ENTER**');

            for (stKey in objExtendData) {
                log.debug('EXTEND UTIL _getSalesOrderInfo: Key', stKey);
                log.debug('EXTEND UTIL _getSalesOrderInfo: ExtendData Object', objExtendData);
                var objCustomerInfo = exports.getCustomerInfo(objSalesOrderRecord.getValue({ fieldId: 'entity' }));
                //Build SO Info Object
                objExtendData[stKey].id = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
                objExtendData[stKey].tran_date = exports.getepochDate();
                objExtendData[stKey].currency = 'USD';
                objExtendData[stKey].order_number = objSalesOrderRecord.getValue({ fieldId: 'tranid' });
                objExtendData[stKey].total_amount = objSalesOrderRecord.getValue({ fieldId: 'total' });
                objExtendData[stKey].name = objSalesOrderRecord.getText({ fieldId: 'entity' }).replace(/[0-9]/g, '');
                objExtendData[stKey].email = objCustomerInfo.email;
                objExtendData[stKey].phone = objCustomerInfo.phone;
                objExtendData[stKey].bill_address1 = objCustomerInfo.bill_address1;
                objExtendData[stKey].bill_address2 = objCustomerInfo.bill_address2;
                objExtendData[stKey].bill_city = objCustomerInfo.bill_city;
                objExtendData[stKey].bill_state = objCustomerInfo.bill_state;
                objExtendData[stKey].bill_zip = objCustomerInfo.bill_zip;
                objExtendData[stKey].bill_country = objCustomerInfo.bill_country;
                objExtendData[stKey].ship_address1 = objCustomerInfo.ship_address1;
                objExtendData[stKey].ship_address2 = objCustomerInfo.ship_address2;
                objExtendData[stKey].ship_city = objCustomerInfo.ship_city;
                objExtendData[stKey].ship_state = objCustomerInfo.ship_state;
                objExtendData[stKey].ship_zip = objCustomerInfo.ship_zip;
                objExtendData[stKey].ship_country = objCustomerInfo.ship_country;
            }
            return objExtendData;
        };

        //get Transaction Date required for contract create
        exports.getTransactionDate = function (stDate) {
            var stTimeDate = new Date(stDate);
            return stTimeDate.getTime() / 1000;
        };
        //get Current Date in epoch format required for contract create
        exports.getepochDate = function () {
            var stTimeDate = new Date();
            return stTimeDate.getTime() / 1000;
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

        // Build the Extend API JSON for contract creation
        exports.buildExtendContractJSON = function (objValues) {
            log.debug('EXTEND UTIL _buildExtendContractJSON:', '**ENTER**');

            // Date is a string and we need to format for extend
            const stTranDate = new Date(objValues.tran_date);
            var objJSON = {
                'transactionId': objValues.id,
                'transactionDate': objValues.tran_date,
                'transactionTotal':  objValues.total_amount * 100,
/*
                'transactionTotal': {
                    'currencyCode': objValues.currency,
                    'amount': objValues.total_amount * 100
                },
*/
                'currency': objValues.currency,
                'poNumber': objValues.order_number,
                'customer': {
                    'email': objValues.email,
                    'name': objValues.name,
                    'phone': objValues.phone,
                    'billingAddress': {
                        'address1': objValues.bill_address1,
                        'address2': objValues.bill_address2,
                        'city': objValues.bill_city,
                        'provinceCode': objValues.bill_state,
                        'countryCode': objValues.bill_country,
                        'postalCode': objValues.bill_zip
                    },
                    'shippingAddress': {
                        'address1': objValues.ship_address1,
                        'address2': objValues.ship_address2,
                        'city': objValues.ship_city,
                        'provinceCode': objValues.ship_state,
                        'countryCode': objValues.ship_country,
                        'postalCode': objValues.ship_zip
                    }
                },
                'product': {
                    'referenceId': objValues.extend_sku,
                     'purchasePrice': objValues.purchase_price * 100,
/*
                    'purchasePrice': {
                        'currencyCode': objValues.currency,
                        'amount': objValues.purchase_price * 100,
                    }
                    */
                    // 'serialNumber' : objValues.serial_number
                },
                'plan': {
                     'purchasePrice':  objValues.plan_price * 100,
/*
                    'purchasePrice': {
                        'currencyCode': objValues.currency,
                        'amount': objValues.plan_price * 100
                    },
*/
                    'planId': objValues.extend_plan_id
                }
            };
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