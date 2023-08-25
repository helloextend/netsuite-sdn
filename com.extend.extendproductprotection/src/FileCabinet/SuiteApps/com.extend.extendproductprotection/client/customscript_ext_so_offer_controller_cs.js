/**
 *@name: EXTEND SUITESCRIPT SDK - Offer Modal Controller
 *@description: 
 * Client script that supoorts button on Sales Order. The script
 * checks if the items are protection plan items and calls a popup suitelet
 * for the user to select the appropriate protection plan. 
 * 
 *@copyright Extend, Inc.
 *@author Michael Draper
 * 
 *@NApiVersion 2.0
 *@NScriptType ClientScript
 *@NModuleScope Public
*/
define([
    'N/url',
    'N/runtime',
    'N/search',
    'N/currentRecord',
    '../lib/customscript_ext_util',
    '../lib/customscript_ext_config_lib'
],
    function (url, runtime, search, currentRecord, EXTEND_UTIL, EXTEND_CONFIG) {
        var exports = {};
        exports.pageInit = function () {

        };
        exports.validateLine = function (context) {
            console.log('Validating Line', context);
console.log('Validating Line', context)
            var objEventRouter = {
                'item': _handleItemInput
            }

            if (typeof objEventRouter[context.sublistId] !== 'function') {
                return true;
            }
            try {
                objEventRouter[context.sublistId](context);
            } catch (e) {

            }
            return true;
        };
        function _handleItemInput(context) {

            console.log('Handling Input', context);
           // console.log('Sublist', context.currentRecord.getCurrentSublistValue({ sublistId: context.sublistId }));
            console.log('config', 'getting.....');
          var config = EXTEND_CONFIG.getConfig(1);
                      console.log('config', config);

            var refIdValue = config.refId;

            var objCurrentRecord = context.currentRecord;

            var arrItemList = [];
            var stExtendItem = config.product_plan_item;

            var stItemId = objCurrentRecord.getCurrentSublistValue({
                sublistId: context.sublistId,
                fieldId: 'item'
            });
			console.log('stExtendItem', stExtendItem);
			
			console.log('stItemId', stItemId);
            if (stExtendItem == stItemId) {
                return;
            }

            var stItemRefId = stItemId;
            var stLineNum = objCurrentRecord.getCurrentSublistIndex({
                sublistId: context.sublistId
            });
            var stItemName = objCurrentRecord.getCurrentSublistText({
                sublistId: context.sublistId,
                fieldId: 'item'
            });
            var intQty = objCurrentRecord.getCurrentSublistValue({
                sublistId: context.sublistId,
                fieldId: 'quantity'
            });
            if (refIdValue) {
                // Lookup to item to see if it is eligible for warranty offers
                var arrItemLookup = search.lookupFields({
                    type: 'item',
                    id: stItemId,
                    columns: refIdValue
                });
              console.log('arrItemLookup', arrItemLookup)
                for (var prop in arrItemLookup) {
                    var stItemRefId = arrItemLookup[prop];
                  if(!stItemRefId){
                    var stItemRefId = arrItemLookup[prop][0].text;
                  }
                                      var arrItemRefId = stItemRefId.split(": ");
                                console.log('arrItemRefId', arrItemRefId)

                  if(arrItemRefId.length > 1){
                    stItemRefId = arrItemRefId[1]
                                                    console.log('stItemRefId', stItemRefId)

                  }
                                console.log('stItemRefId', stItemRefId)

                    break;
                }
            }


            var objItem = {};
            objItem.id = stItemId;
            objItem.name = stItemName;
            objItem.qty = intQty;
            objItem.line = stLineNum;
            objItem.refId = stItemRefId;
            //console.log('objItem', objItem);
            //push to array
            arrItemList.push(objItem);
            arrItemList = JSON.stringify(arrItemList);
            console.log('arrItemList', arrItemList);

            _callSuitelet(arrItemList, stItemId, stItemName, stLineNum, intQty, stItemRefId);

            return true;
        }

        exports.openSuitelet = function (context) {
            console.log('Open Suitelet', context);

            var objCurrentRecord = currentRecord.get();
            //create item array
            var arrItemList = [];
            var stSublistId = 'item';
            var linecount = objCurrentRecord.getLineCount({
                sublistId: stSublistId
            });
            console.log('linecount', linecount);
           console.log('config', 'getting.....');
          var config = EXTEND_CONFIG.getConfig(1);
                      console.log('config', config);

            var refIdValue = config.refId;
          var stExtendItem = config.product_plan_item;
            //get extend item
           // var stExtendItem = runtime.getCurrentScript().getParameter({ name: 'custscript_ext_protection_plan' });

            //loop item sublist or retrieve for single line item if validate line function
            for (var i = 0; i < linecount; i++) {
                var stItemId = objCurrentRecord.getSublistValue({
                    sublistId: stSublistId,
                    fieldId: 'item',
                    line: i
                });

                var stItemRefId = stItemId;
                var stItemName = objCurrentRecord.getSublistText({
                    sublistId: stSublistId,
                    fieldId: 'item',
                    line: i
                });
                var intQty = objCurrentRecord.getSublistText({
                    sublistId: stSublistId,
                    fieldId: 'quantity',
                    line: i
                });
                if (refIdValue) {
                    // Lookup to item to see if it is eligible for warranty offers
                    var arrItemLookup = search.lookupFields({
                        type: 'item',
                        id: stItemId,
                        columns: refIdValue
                    });
              console.log('arrItemLookup', arrItemLookup)
                for (var prop in arrItemLookup) {
                    var stItemRefId = arrItemLookup[prop];
                  if(!stItemRefId){
                    var stItemRefId = arrItemLookup[prop][0].text;
                  }

                    var arrItemRefId = stItemRefId.split(": ");
                                console.log('arrItemRefId', arrItemRefId)

                  if(arrItemRefId.length > 1){
                    stItemRefId = arrItemRefId[1]
                                                    console.log('stItemRefId', stItemRefId)

                  }
                                console.log('stItemRefId', stItemRefId)

                    break;
                }
                }

                var objItem = {};
                objItem.id = stItemId;
                objItem.name = stItemName;
                objItem.qty = intQty;
                objItem.line = i;
                objItem.refId = stItemRefId;
                //console.log('objItem', objItem);
                //push to array
                if (stExtendItem != stItemId) {
                    arrItemList.push(objItem);
                }
            }
            var stArrayItemList = JSON.stringify(arrItemList);
            console.log('stArrayItemList', stArrayItemList);
            _callSuitelet(stArrayItemList, arrItemList[0].id, arrItemList[0].name, arrItemList[0].line, arrItemList[0].qty, arrItemList[0].refId);
        }

        function _callSuitelet(arrItemList, stItemId, stItemName, stLineNum, stItemQty, stItemRefId) {
            //Resolve suitelet URL
            var slUrl = url.resolveScript({
                scriptId: 'customscript_ext_offer_presentation_sl',
                deploymentId: 'customdeploy_ext_offer_presentation_sl',
                params: {
                    'itemid': stItemId,
                    'itemtext': stItemName,
                    'arrItemid': arrItemList,
                    'line': stLineNum,
                    'quantity': stItemQty,
                    'refid': stItemRefId
                }
            });
            //Call the pop up suitelet
            window.open(slUrl, '_blank', 'screenX=300,screenY=300,width=900,height=500,titlebar=0,status=no,menubar=no,resizable=0,scrollbars=0');

        }
        return exports;

    });