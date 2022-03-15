/**
 *@name: EXTEND SUITESCRIPT SDK - Offer Modal Controller
 *@description: 
 * User Event script that shows a button on Sales Order to call a popup suitelet
 * for the user to select the appropriate protection plan. 
 * 
 *@copyright Extend, Inc.
 *@author Michael Draper
 * 
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 */
 define(['N/runtime'], function(runtime) {
    // Add button for Suitelet
    var exports = {};
    exports.beforeLoad = function(context){


        var objEventRouter = {
            'create': _addButton,
            'edit': _addButton
        }

        if (typeof objEventRouter[context.type] !== 'function') {
            return true;
        }

        objEventRouter[context.type](context);
        return true;
       
    }
    function _addButton(context){
        try
        {
            const recCurrent = context.newRecord;
            const objForm = context.form;
            objForm.clientScriptModulePath = '../client/customscript_ext_so_offer_controller_cs.js';
            objForm.addButton({
                id : 'custpage_open_suitelet',
                label: 'Add Protection Plan',
                functionName: 'openSuitelet()'
            });
        } catch (error)
        {
            log.error('beforeLoad_addButton', error.message);
        }
    }
    
    return exports;

    
});