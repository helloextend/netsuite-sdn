/**
 *@name: EXTEND SUITESCRIPT SDK - Offer Modal Suitelet
 *@description: 
 *  Suitelet called by Sales Order client script to display protection plans
 *  in a popup window. The user can then select a warranty and on submit, 
 *  the suitelet will post and append a new line for the Warranty non-inventory item 
 *  with the description and pricing. 
 *  
 *@copyright Extend, Inc.
 *@author Michael Draper
 * 
 *@NApiVersion 2.x
 *@NScriptType Suitelet
 *@NModuleScope Public
 */
define([
    'N/ui/serverWidget',
    'N/runtime',
    'N/http',
    'N/error',
    '../lib/customscript_ext_api_lib',
    '../lib/customscript_ext_config_lib'
],
    function (ui, runtime, http, error, api, EXTEND_CONFIG) {

        var exports = {};

        exports.onRequest = function (context) {
            var objEventRouter = {};

            objEventRouter[http.Method.GET] = _handleGet;
            objEventRouter[http.Method.POST] = _handlePost;

            if (!objEventRouter[context.request.method]) {
                _handleError(context);
            }
            try {
                objEventRouter[context.request.method](context);
            } catch (e) { }
        };


        function _handleGet(context) {

            _renderForm(context);
        }
        // Post Handler
        function _handlePost(context) {
            try {
                log.debug('POST: Context Object', JSON.stringify(context));

                var objRequest = context.request;

                var objExtendItem = {};

                var stPlanCount = objRequest.getLineCount({ group: 'custpage_plans' });
                objExtendItem.stWarrantyItemId = runtime.getCurrentScript().getParameter({ name: 'custscript_ext_protection_plan' });

                //Line Number
                // var stProductLine = objRequest.parameters.custpage_line_num;
                // log.debug('POST: Product Line', stProductLine);

                objExtendItem.stItemId = objRequest.parameters.custpage_item_select;
                objExtendItem.stItemName = objRequest.parameters.custpage_item_name.trim();
                objExtendItem.stItemQty = objRequest.parameters.custpage_item_qty;
                objExtendItem.stPlanId = '';
                objExtendItem.stPrice = 0;
                objExtendItem.stDescription = '';

                // Get line information from selected line
                for (var i = 0; i < stPlanCount; i++) {

                    var bSelected = objRequest.getSublistValue({ group: 'custpage_plans', name: 'custpage_select', line: i }) == "T" ? true : false;

                    if (bSelected) {

                        objExtendItem.stPlanId = objRequest.getSublistValue({ group: 'custpage_plans', name: 'custpage_item_id', line: i });
                        objExtendItem.stPrice = objRequest.getSublistValue({ group: 'custpage_plans', name: 'custpage_plan_price', line: i });

                        objExtendItem.stTerm = objRequest.getSublistValue({ group: 'custpage_plans', name: 'custpage_plan_term', line: i });
                        objExtendItem.stDescription = _getDescription(objExtendItem.stTerm);
                        objExtendItem.stDescription += ' | ' + objExtendItem.stItemName;
                        break;
                    }
                }
                log.debug('objExtendItem', objExtendItem);

                var html = _buildhtml(objExtendItem);
                // Write repsponse
                context.response.write(html);

            } catch (e) {
                log.error('POST error', e);
            }
        }
        function _buildhtml(objExtendItem) {
            // Prepare window.opener html to post values back to the line
            try {
                var html = "<html>";
                html += " <body>";
                html += " <script language='JavaScript'>";
                html += " if(window.opener) {";
                html += " window.opener.nlapiSetFieldValue('custbody_ext_warranty_order', true, true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'item'," + objExtendItem.stWarrantyItemId + ", true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'rate'," + objExtendItem.stPrice + ", true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'quantity'," + objExtendItem.stItemQty + ", true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'description', '" + objExtendItem.stDescription + "', true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'custcol_ext_associated_item', " + objExtendItem.stItemId + ", true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'custcol_ext_plan_id', '" + objExtendItem.stPlanId + "', true, true);";
                html += " window.opener.nlapiSetCurrentLineItemValue('item', 'custcol_ext_plan_term', '" + objExtendItem.stTerm + "', true, true);";
                html += " window.opener.nlapiCommitLineItem('item');";
                /**
                 * IMPORTANT
                 * The below 3 lines of code will allow you to make an association between the Protection Plan item and the physical
                 * SKU. You can uncomment these lines to quickly make the association in the event you do not have more complex custom
                 * requirements for SKU association.
                 */
                // html += ` window.opener.nlapiSelectLineItem('item', ${parseInt(stProductLine)});`;
                // html += ` window.opener.nlapiSetCurrentLineItemValue('item', 'custcol_ext_plan_line', parseInt(stProductLine) + 1, true, true);`
                // html += ` window.opener.nlapiCommitLineItem('item');`;
                html += " };";
                html += " window.close();";
                html += " </script>";
                html += " </body>";
                html += "</html>";

                return html;
            } catch (e) {
                log.error('POST error', e);

            }
        };
        function _getDescription(stTerm) {
            var stText = '';
            //term change to formula instead of case
            var stTermYears = parseInt(stTerm) / 12;
            log.debug('stTermYears', stTermYears);
            stText = "Extend " + stTermYears + "yr Protection Plan";
            return stText;
        };
        function _handleError(context) {

            throw error.create({
                name: "SSS_UNSUPPORTED_REQUEST_TYPE",
                message: "Suitelet only supports GET and POST",
                notifyOff: true
            });
        };
        // Builds Suitelet Form
        function _renderForm(context) {
            try {
                log.debug('GET Params', context.request.parameters);
                // Get plans and populate sublist
                log.debug('arrItemList', context.request.parameters.arrItemid + typeof context.request.parameters.arrItemid);
                var arrItemList = [];
                arrItemList = JSON.parse(context.request.parameters.arrItemid);
                var stItemInternalId = context.request.parameters.itemid;
                var stItemRefId = context.request.parameters.refid;
                log.debug('stItemRefId', stItemRefId);

                // Create the form
                var objForm = ui.createForm({
                    title: 'Extend Protection Plans',
                    hideNavBar: true
                });
                /**
                 * HEADER FIELDS
                 */
                //Hidden field of line number
                var objLineNumField = objForm.addField({
                    id: 'custpage_line_num',
                    type: ui.FieldType.INTEGER,
                    label: 'Line Number'
                });
                objLineNumField.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                //Hidden field of item array
                var objItemListField = objForm.addField({
                    id: 'custpage_item_list',
                    type: ui.FieldType.TEXTAREA,
                    label: 'Item List'
                });
                objItemListField.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                if (context.request.parameters.arrItemid) {
                    objItemListField.defaultValue = context.request.parameters.arrItemid;

                }
                //Hidden field of item name
                var objItemNameField = objForm.addField({
                    id: 'custpage_item_name',
                    type: ui.FieldType.TEXT,
                    label: 'Item Name'
                });
                objItemNameField.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                if (context.request.parameters.itemtext) {
                    objItemNameField.defaultValue = context.request.parameters.itemtext;

                }
                //Hidden field of item refid
                var objItemRefIdField = objForm.addField({
                    id: 'custpage_item_ref_id',
                    type: ui.FieldType.TEXT,
                    label: 'Item Ref ID'
                });
                objItemRefIdField.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                if (context.request.parameters.refid) {
                    objItemRefIdField.defaultValue = context.request.parameters.refid;

                }
                //Hidden field of item name
                var objItemQtyField = objForm.addField({
                    id: 'custpage_item_qty',
                    type: ui.FieldType.TEXT,
                    label: 'Item Quantity'
                });
                objItemQtyField.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                if (context.request.parameters.quantity) {
                    objItemQtyField.defaultValue = context.request.parameters.quantity;

                }
                //Telesales Script Group
                var objScriptGroup = objForm.addFieldGroup({
                    id: 'custpage_script',
                    label: 'Telesales Script'
                });
                //OFFER TELESALES ASK SCRIPT
                var objOfferTextField = objForm.addField({
                    id: 'custpage_offer_text',
                    type: ui.FieldType.TEXTAREA,
                    label: 'Customer Ask:',
                    container: 'custpage_script'
                });
                objOfferTextField.updateBreakType({
                    breakType: ui.FieldBreakType.STARTCOL
                });
                objOfferTextField.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                objOfferTextField.defaultValue = "We have several protection plans available for your purchase \n These protection plans cover accidental damage in addition to standard defects \n Would you be interested in protecting your purchase with us today? \n <custom training text available>";
                //Next Steps Group
                var objProcessGroup = objForm.addFieldGroup({
                    id: 'custpage_process',
                    label: 'Adding an Extend Protection Plan'
                });
                //OFFER TELESALES INSTRUCTION SCRIPT
                var objProcessScript = objForm.addField({
                    id: 'custpage_process_text',
                    type: ui.FieldType.TEXTAREA,
                    label: 'Instructions',
                    container: 'custpage_process'
                });
                objProcessScript.updateBreakType({
                    breakType: ui.FieldBreakType.STARTCOL
                });
                objProcessScript.updateDisplayType({
                    displayType: ui.FieldDisplayType.INLINE
                });
                objProcessScript.defaultValue = "1. Select an Item from the drop down list \n 2.Check the box next to the protection plan your customer has selected \n 3. Click on the blue submit button to add the protection plan and return to the order \n 4. If the customer does not want a protection plan, simply click cancel";
                var objItemGroup = objForm.addFieldGroup({
                    id: 'custpage_item',
                    label: 'Item'
                });
                var objItemSelectField = objForm.addField({
                    id: 'custpage_item_select',
                    type: ui.FieldType.SELECT,
                    label: 'Select Item',
                    container: 'custpage_item'
                });
                //Iterate Items from params
                for (var i = 0; i < arrItemList.length; i++) {
                    objItemSelectField.addSelectOption({
                        value: arrItemList[i].id,
                        text: arrItemList[i].name
                    });
                }
                if (stItemInternalId) {
                    objItemSelectField.defaultValue = stItemInternalId;
                }
                /**
                 * BUILD SUBLIST 
                 */
                // Add plans sublist
                var objPlanList = objForm.addSublist({
                    id: 'custpage_plans',
                    type: ui.SublistType.LIST,
                    label: 'Eligble Plans'
                });
                objPlanList.addField({
                    id: 'custpage_select',
                    type: ui.FieldType.CHECKBOX,
                    label: 'Select'
                });
                var objItemIdField = objPlanList.addField({
                    id: 'custpage_item_id',
                    type: ui.FieldType.TEXT,
                    label: 'ID'
                });
                objItemIdField.updateDisplayType({
                    displayType: ui.FieldDisplayType.HIDDEN
                });
                objPlanList.addField({
                    id: 'custpage_plan_title',
                    type: ui.FieldType.TEXT,
                    label: 'Title'
                });
                objPlanList.addField({
                    id: 'custpage_plan_term',
                    type: ui.FieldType.TEXT,
                    label: 'Coverage Term (Months)'
                });
                objPlanList.addField({
                    id: 'custpage_plan_price',
                    type: ui.FieldType.CURRENCY,
                    label: 'Price'
                });

                // Add Submit Button
                objForm.addButton({
                    id: 'custpage_cancel',
                    label: 'Cancel',
                    functionName: 'handleClose()'
                });
                objForm.addSubmitButton('Submit');
                /**
                 * POPULATE SUBLIST 
                 */
                if (stItemRefId) {
                    try {
                        var config = EXTEND_CONFIG.getConfig();
                        var objResponse = api.getOffers(stItemRefId, config);
                        log.debug('OFFER MODAL SUITELET: Offers JSON Response', objResponse);

                        if (objResponse.code == 200) {
                            var objResponseBody = JSON.parse(objResponse.body);
                            log.debug('OFFER MODAL SUITELET: Offers JSON Response', objResponseBody);

                            var objPlans = objResponseBody.plans;
                            log.debug('OFFER MODAL SUITELET: objPlans', objPlans);

                            var arrPlans = objPlans.base;
                            log.debug('OFFER MODAL SUITELET: arrPlans', arrPlans);

                            if (arrPlans.length == 0) {
                                var arrPlans = objPlans.adh;
                            }
                            log.debug('arrPlans', arrPlans);

                            //Populate Sublist Values
                            for (var i = 0; i < arrPlans.length; i++) {
                                objPlanList.setSublistValue({
                                    id: 'custpage_item_id',
                                    line: i,
                                    value: arrPlans[i].id
                                });
                                objPlanList.setSublistValue({
                                    id: 'custpage_plan_title',
                                    line: i,
                                    value: arrPlans[i].title
                                });
                                objPlanList.setSublistValue({
                                    id: 'custpage_plan_term',
                                    line: i,
                                    value: parseInt(arrPlans[i].contract.termLength)
                                });
                                objPlanList.setSublistValue({
                                    id: 'custpage_plan_price',
                                    line: i,
                                    value: parseFloat(arrPlans[i].price) / 100
                                });
                            }
                        }

                    } catch (e) {

                    }

                }
                //Set Client handler
                objForm.clientScriptModulePath = '../client/customscript_ext_offer_modal_controller.js';
                //Write Page
                context.response.writePage(objForm);
            } catch (e) {

            }
        };
        return exports;

    });