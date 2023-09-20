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
    "N/url",
    "N/search",
    "N/currentRecord",
    "../libs/customscript_ext_util",
  ], function (url, search, currentRecord, EXTEND_UTIL) {
    var exports = {};
    const objWarrantyStatus = {
      notSynced: 1,
      synced: 2,
      warrantable: 3,
      nonWarrantable: 4,
      syncError: 5,
    };
    exports.pageInit = function () {};
    //todo consolidate open suitelet & validate line functions
    exports.validateLine = function (context) {
      log.debug("Validating Line", context);
  
      var objEventRouter = {
        item: _handleItemInput,
      };
  
      if (typeof objEventRouter[context.sublistId] !== "function") {
        return true;
      }
  
      objEventRouter[context.sublistId](context);
      return true;
    };
    exports.openSuitelet = function (context) {
      log.debug("openSuitelet", JSON.stringify(context));
  
      var objCurrentRecord = currentRecord.get();
      //create item array
      var arrItemList = [];
      var stSublistId = "item";
      var linecount = objCurrentRecord.getLineCount({
        sublistId: stSublistId,
      });
      log.debug("openSuitelet", "linecount - " + linecount);
  
      //loop item sublist or retrieve for single line item if validate line function
      for (var i = 0; i < linecount; i++) {
        var stItemId = objCurrentRecord.getSublistValue({
          sublistId: stSublistId,
          fieldId: "item",
          line: i,
        });
        var stItemName = objCurrentRecord.getSublistText({
          sublistId: stSublistId,
          fieldId: "item",
          line: i,
        });
        var intQty = objCurrentRecord.getSublistText({
          sublistId: stSublistId,
          fieldId: "quantity",
          line: i,
        });
  
        // Lookup to item to see if it is eligible for warranty offers
       // var stWarrantyStatus = _getWarrantyStatus(stItemId);
       // log.debug("openSuitelet", "Index : Warranty Status :: " + i + " : " + stWarrantyStatus);
  
        // If item is not a warranty item, return
     //   if (stWarrantyStatus == objWarrantyStatus.warrantable) {
          var objItem = {};
          objItem.id = stItemId;
          objItem.name = stItemName;
          objItem.qty = intQty;
          objItem.line = i;
          log.debug("objItem", JSON.stringify(objItem));
  
          //push to array
          arrItemList.push(objItem);
      //  }
      }
      var stArrayItemList = JSON.stringify(arrItemList);
      log.debug("openSuitelet", "stArrayItemList - " + stArrayItemList);
  
      _callSuitelet(
        stArrayItemList,
        arrItemList[0].id,
        arrItemList[0].name,
        arrItemList[0].line,
        arrItemList[0].qty
      );
    };
  
    function _handleItemInput(context) {
      log.debug("_handleItemInput", context);
      log.debug("_handleItemInput", "Sublist - " + context.currentRecord.getSublist({ sublistId: context.sublistId }));
  
      var objCurrentRecord = context.currentRecord;
  
      var arrItemList = [];
  
      var stItemId = objCurrentRecord.getCurrentSublistValue({
        sublistId: context.sublistId,
        fieldId: "item",
      });
      log.debug("_handleItemInput", "stItemId - " + stItemId);
  
    //  var stWarrantyStatus = _getWarrantyStatus(stItemId);
   //   log.debug("_handleItemInput", "Is warranty - " + typeof stWarrantyStatus + ", " + stWarrantyStatus);
  
      // If item is not a warranty item, return
    //  if (stWarrantyStatus != objWarrantyStatus.warrantable) {
    //    return true;
    //  }
      var stLineNum = objCurrentRecord.getCurrentSublistIndex({
        sublistId: context.sublistId,
      });
      var stItemName = objCurrentRecord.getCurrentSublistText({
        sublistId: context.sublistId,
        fieldId: "item",
      });
      var intQty = objCurrentRecord.getCurrentSublistValue({
        sublistId: context.sublistId,
        fieldId: "quantity",
      });
      // If item is a warranty item, return
      var objItem = {};
      objItem.id = stItemId;
      objItem.name = stItemName;
      objItem.qty = intQty;
      objItem.line = stLineNum;
      //log.debug('objItem', objItem);
      //push to array
      arrItemList.push(objItem);
      arrItemList = JSON.stringify(arrItemList);
      log.debug("_handleItemInput", "arrItemList - " + arrItemList);
  
      _callSuitelet(arrItemList, stItemId, stItemName, stLineNum, intQty);
  
      return true;
    }
    function _getWarrantyStatus(stItemId) {
      try {
          log.debug('_getWarrantyStatus', "stItemId - "+stItemId);
  
          // Lookup to item to see if it is eligible for warranty offers
          var arrItemLookup = search.lookupFields({
              type: "item",
              id: stItemId,
              columns: "custitem_ext_warranty_status",
          });
          var stWarrantyStatus;
          if (arrItemLookup.custitem_ext_warranty_status[0]) {
              stWarrantyStatus = arrItemLookup.custitem_ext_warranty_status[0].value;
          } 
      } catch (error) {
          log.error('ERROR: Unable to retrieve status', JSON.stringify(error))
          var stWarrantyStatus = 5;
      }finally{
          return stWarrantyStatus;
      }
    }
  
    function _callSuitelet(
      arrItemList,
      stItemId,
      stItemName,
      stLineNum,
      stItemQty
    ) {
      //Resolve suitelet URL
      var slUrl = url.resolveScript({
        scriptId: "customscript_ext_offer_presentation_sl",
        deploymentId: "customdeploy_ext_offer_presentation_sl",
        params: {
          itemid: stItemId,
          itemtext: stItemName,
          arrItemid: arrItemList,
          line: stLineNum,
          quantity: stItemQty,
        },
      });
      //Call the pop up suitelet
      window.open(
        slUrl,
        "_blank",
        "screenX=300,screenY=300,width=900,height=500,titlebar=0,status=no,menubar=no,resizable=0,scrollbars=0"
      );
    }
    return exports;
  });
  