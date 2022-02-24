/**
 *@name: EXTEND SUITESCRIPT SDK - Configuration & Item Field Validation UE
 *@description: 
 * This script Validate Single Config Custom Record per environment type
 * 
 *@copyright Extend, Inc
 *@author Michael Draper
 * 
 *@NApiVersion 2.x
 *@NScriptType UserEventScript
 *@ModuleScope Public
 */
define([
    'N/runtime',
    'N/record',
    'N/search',
    '../libs/customscript_ext_util'
],
    function (runtime, record, search, EXTEND_UTIL) {

        var exports = {};

        exports.beforeSubmit = function (context) {
            log.debug('BEFORESUBMIT: Execution Context', runtime.executionContext);
            log.debug('BEFORESUBMIT: Context', context);

            var objEventRouter = {
                'CREATE': environmentValidate,
                'EDIT': itemFieldValidate
            }

            if (typeof objEventRouter[context.type] !== 'function') {
                return true;
            }

            objEventRouter[context.type](context);
            return true;

        };
        exports.environmentValidate = function (){
                //get environment field on current rec
                var objNewRecord = context.newRecord;
                log.debug('BEFORESUBMIT: objNewRecord', objNewRecord);
                var stEnvironmentId = objNewRecord.getValue({ fieldId: 'custrecord_ext_environment' });
                log.debug('BEFORESUBMIT: stEnvironmentId', stEnvironmentId);

                //check if active record already exists with same environment
                var customrecord_ext_configurationSearchObj = search.create({
                    type: "customrecord_ext_configuration",
                    filters:
                        [
                            ["custrecord_ext_environment", "anyof", stEnvironmentId],
                            "AND",
                            ["isinactive", "is", "F"]
                        ],
                    columns:
                        [
                            search.createColumn({ name: "id", label: "ID" }),
                            search.createColumn({ name: "custrecord_ext_environment", label: "Environment " }),
                        ]
                });
                var searchResultCount = customrecord_ext_configurationSearchObj.runPaged().count;
                log.debug("customrecord_ext_configurationSearchObj result count", searchResultCount);
                
                //if result throw error
                if (searchResultCount>0) {
                    objErrorDetails = {};
                    objErrorDetails.title = 'Extend Configuration Error';
                    objErrorDetails.message = 'Configuration record already exists for this environment type';
                    log.error('BEFORESUBMIT: Congiuration exists for selected Environment', objErrorDetails);
                    throw EXTEND_UTIL.createError(objErrorDetails);
                }
        };
        exports.itemFieldValidate = function (){
            try {
                //get environment field on current rec
                var objNewRecord = context.newRecord;
                log.debug('BEFORESUBMIT: objNewRecord', objNewRecord);
                var stEnvironmentId = objNewRecord.getValue({ fieldId: 'custrecord_ext_environment' });
                log.debug('BEFORESUBMIT: stEnvironmentId', stEnvironmentId);
                var itemField = objNewRecord.getValue({ fieldId: 'custrecord_ext_ref_id'});
    
                //check if active record already exists with same environment
                var itemSearchObj = search.create({
                    type: "item",
                    filters:
                        [
                            ["type","anyof","Assembly","InvtPart","Group","Kit"]
                        ],
                    columns:
                        [
                            search.createColumn({
                                name: "type",
                                summary: "GROUP",
                                label: "Type"
                            }),
                            search.createColumn({
                                name: "internalid",
                                summary: "MAX",
                                label: "Internal ID"
                            })
                        ]
                });
                var searchResultCount = itemSearchObj.runPaged().count;
                log.debug("itemSearchObj result count",searchResultCount);
                var itemTypeObj = {};
                var recordTypeMap = { "Assembly" : 'assemblyitem' , "InvtPart" : "inventoryitem", "Kit" :"kititem" }
    
                itemSearchObj.run().each(function(result){
                    // .run().each has a limit of 4,000 results
                    var type = result.getValue({name : 'type' , summary: "GROUP"});
                    var internalId =  result.getValue({name : 'internalid' , summary: "MAX"});
                    itemTypeObj[recordTypeMap[type]] = internalId;
                    return true;
                });
                var searchResultCount = itemSearchObj.runPaged().count;
                log.debug("itemSearchObj result count", searchResultCount);
                log.debug("itemTypeObj", itemTypeObj);
                var fieldArray = [];
                //create field array of all "warrantable" item type fields
                for(types in itemTypeObj){
                    var objRecord = record.load({ type: types, id : itemTypeObj[types]});
                    var objFields = objRecord.getFields();
                    fieldArray = fieldArray.concat(objFields);
                    log.debug("fieldArray", fieldArray);
                }
                log.debug("index of " + itemField,fieldArray.indexOf(itemField));
    
                if(fieldArray.indexOf(itemField) == -1){
                    log.error('invalid item field id', itemField);
    
                    objNewRecord.setValue({ fieldId: 'custrecord_ext_ref_id', value : 'internalid'});
                    //Not working to prevent record from saving
                    return false;
                }
            } catch (e) {
                            log.debug('BEFORESUBMIT: Error ', JSON.stringify(e.message));
            }
        }

        return exports;
    });
