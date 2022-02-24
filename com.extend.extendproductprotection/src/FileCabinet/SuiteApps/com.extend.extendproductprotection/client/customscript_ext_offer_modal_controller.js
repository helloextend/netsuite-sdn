/**
 *@name: EXTEND SUITESCRIPT SDK - Sales Order Trigger Offer Controller
 *@description: 
 * Plan presentation suitelet controller 
 * 
 *@copyright Aimpoint Technology Services, LLC
 *@author Michael Draper
 * 
 *@NApiVersion 2.x
 *@NScriptType ClientScript
 *@NModuleScope Public
*/
define(['N/url',
'../lib/customscript_ext_util'
], 
function(url, EXTEND_UTIL){
    var exports = {};
    exports.fieldChanged = function(context){

        console.log('Event Handler', context);
        const objEventRouter = {
            'custpage_select' : _handleSelectInput,
          	'custpage_item_select': _handleItemInput
        }
        console.log('objEventRouter', objEventRouter);

        if(typeof objEventRouter[context.fieldId] !== 'function'){
            return;
        }

        objEventRouter[context.fieldId](context);
        return true;

    };
    exports.saveRecord = function(context){
        var objCurrentRec = context.currentRecord;
        const planCount = objCurrentRec.getLineCount({sublistId: 'custpage_plans'});
        var stItemId = '';
        // Get line information from selected line
        for(var i=0; i < planCount; i++){

            var isSelected = objCurrentRec.getSublistValue({
                sublistId: 'custpage_plans', 
                fieldId: 'custpage_select', 
                line: i
            });

            if(isSelected){
                stItemId = objCurrentRec.getSublistValue({
                    sublistId: 'custpage_plans', 
                    fieldId: 'custpage_item_id', 
                    line: i
                });
                break;
            }
        }
        if(!stItemId){
            alert('You have not selected a plan. Please select a plan before submitting.');
            return false;
        }
        else {
            return true;
        }
    };
    function _handleSelectInput(context){

        var objCurrentRec = context.currentRecord;
        var stLineIndex = objCurrentRec.getCurrentSublistIndex({sublistId: 'custpage_plans'});
        var stLineCount = objCurrentRec.getLineCount({sublistId: 'custpage_plans'});
        var bTrue = objCurrentRec.getCurrentSublistValue({sublistId: 'custpage_plans', fieldId: 'custpage_select'});
        
        if(bTrue == true){
            for(var i = 0; i < stLineCount; i++){
                if(i == stLineIndex) continue;
                objCurrentRec.selectLine({sublistId: 'custpage_plans', line: i});
                objCurrentRec.setCurrentSublistValue({ sublistId: 'custpage_plans', fieldId: 'custpage_select', value: false});
                objCurrentRec.commitLine({sublistId: 'custpage_plans'});
            }
        }
        
        return true;
    }
  function _handleItemInput(context){
       	//update sublist on item field change
        var objCurrentRec = context.currentRecord;
        var stItemId = objCurrentRec.getValue({fieldId: 'custpage_item_select'});
        console.log('stItemId', stItemId);
        var stItemName = objCurrentRec.getText({fieldId: 'custpage_item_select'});
        var stItemList = objCurrentRec.getValue({fieldId: 'custpage_item_list'});
        var stItemQty;
        var stLineNum;
        var stItemRefId;

        if(!EXTEND_UTIL.objectIsEmpty(stItemId)){
            var arrItemList = JSON.parse(stItemList);
            //var stItemQty = arrItemList.find(x => x.id === stItemId).quantity;
            var objItem = _searchArray(stItemId, 'id', arrItemList);
            stItemQty = objItem.qty;
            stLineNum = objItem.line;
            stItemRefId = objItem.refId;
        }
        
        var URL = url.resolveScript({
            scriptId: 'customscript_ext_offer_presentation_sl',
            deploymentId: 'customdeploy_ext_offer_presentation_sl',
                params : {
                  'itemid' : stItemId,
                  'itemtext' : stItemName,
                  'arrItemid': stItemList,
                  'line' : stLineNum,
                  'quantity' : stItemQty,
                  'refid': stItemRefId
                }
        });
        
        //avoid the standard NetSuite warning message when navigating away
        if (window.onbeforeunload){
            window.onbeforeunload=function() { null;};
        };
        //refresh window
        window.open(URL, '_self', false);
            return true;
    }
  function _searchArray(nameKey, prop, myArray){
    for (var i=0; i < myArray.length; i++) {
        if (myArray[i][prop]=== nameKey) {
            return myArray[i];
        }
    }
}
    exports.handleClose = function(){
        window.close();
    }

    return exports;
});