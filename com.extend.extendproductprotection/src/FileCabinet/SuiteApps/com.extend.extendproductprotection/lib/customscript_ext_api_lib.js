/**
 * api.js
 * Houses calls to Extend API
 * @NApiVersion 2.1
 */
 define([
  'N/https',
  '../lib/customscript_ext_config_lib'
],

  //todo add additional extend API calls
  function (https, extendConfig) {

    var exports = {};


    /*****************************************PRODUCTS*****************************************/
    /**
     * CREATE PRODUCTS
     * API Documentation: https://developers.extend.com/default#tag/Products/paths/~1stores~1{storeId}~1products/post
     */
    exports.createProduct = function (arrProducts, bIsBatch, bIsUpsert) {
      var config = extendConfig.getConfig();
      try {
        var response = https.post({
          url: config.domain + '/stores/' + config.storeId + '/products?upsert=' + bIsUpsert + '?batch=' + bIsBatch,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(arrProducts),
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e));
        return false;
      }
    };
    /**
     * UPDATE PRODUCT
     * API Documentation: https://developers.extend.com/default#tag/Products/paths/~1stores~1{storeId}~1products~1{productId}/put
     */
    exports.updateProduct = function (objProductDetails, stItemId) {
      // log.debug('Extend Product Details', objProductDetails);
      var config = extendConfig.getConfig();
      try {
        var response = https.put({
          url: config.domain + '/stores/' + config.storeId + '/products/' + stItemId,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objProductDetails),
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e));
        return false;
      }
    };
    /**
     * GET PRODUCT
     * API Documentation: https://developers.helloextend.com/2020-08-01#tag/Products/paths/~1stores~1{storeId}~1products~1{productId}/get
     */
    exports.getProduct = function (stItemId) {
      var config = extendConfig.getConfig();
      try {
        var response = https.get({
          url: config.domain + '/stores/' + config.storeId + '/products/' + stItemId,
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e.message));
        return;
      }
    };
    /**
     * DELETE PRODUCT
     * API Documentation: https://developers.extend.com/default#tag/Products/paths/~1stores~1{storeId}~1products~1{productId}/delete
     */
    exports.deleteProduct = function (stItemId) {
      var config = extendConfig.getConfig();
      try {
        var response = https.get({
          url: config.domain + '/stores/' + config.storeId + '/products/' + stItemId,
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e.message));
        return;
      }
    };
    /*****************************************OFFERS*****************************************/

    /**
     * GET OFFERS
     * API Documentation: https://developers.extend.com/default#operation/getOffer
     */
    exports.getPlansByItem = function (stItemId) {
      var config = extendConfig.getConfig();
      try {
        var response = https.get({
          url: config.domain + '/offers?storeId=' + config.storeId + '&productId=' + stItemId,
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Fetcing Plans', JSON.stringify(e.message));
        return;
      }
    };
    /*****************************************CONTRACTS*****************************************/

    /**
     * CREATE CONTRACT
     * API Documentation: https://developers.extend.com/default#operation/createContracts
     */
    exports.createWarrantyContract = function (objContractDetails) {
      var config = extendConfig.getConfig();


      try {
        var response = https.post({
          url: config.domain + '/stores/' + config.storeId + '/contracts',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objContractDetails),
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e.message));
        return;
      }
    };
    /**
 * UPDATE CONTRACT
 * API Documentation: https://developers.helloextend.com/2020-08-01#operation/updateContracts
 */
    exports.updateWarrantyContract = function (objContractDetails, stContractId) {
      var config = extendConfig.getConfig();
      try {
        var response = https.put({
          url: config.domain + '/contracts/' + stContractId,
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objContractDetails),
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e.message));
        return;
      }
    };

    /**
     * CANCEL CONTRACT
     * API Documentation: https://developers.extend.com/default#operation/refundContract
     */
    exports.cancelWarrantyContract = function (stContractId, bIsCommit) {
      var config = extendConfig.getConfig();
      try {
        var response = https.post({
          url: config.domain + '/stores/' + config.storeId + '/contracts/' + stContractId + '/refund?commit=' + bIsCommit,
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Cancelling Contract', JSON.stringify(e.message));
        return;
      }
    };
    /*****************************************LEADS*****************************************/
    /**
     * CREATE LEAD
     * API Documentation:  https://developers.helloextend.com/2020-08-01#tag/Leads/paths/~1stores~1{storeId}~1leads/post
     */
    exports.createLead = function (objLeadDetails) {
      var config = extendConfig.getConfig();
      try {
        var response = https.post({
          url: config.domain + '/stores/' + config.storeId + '/leads',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objLeadDetails),
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e.message));
        return;
      }
    };
    /**
     * GET LEAD OFFERS
     * API Documentation:  https://developers.helloextend.com/2020-08-01#tag/Leads/paths/~1leads~1{leadToken}~1offers/get
     */
    exports.getLeadOffers = function (objLeadDetails) {
      var config = extendConfig.getConfig();
      try {
        var response = https.get({
          url: config.domain + '/leads/' + config.storeId + '/offers',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
        });
        if (response) {
          return response;
        }
      } catch (e) {
        log.debug('Error Calling API', JSON.stringify(e.message));
        return;
      }
    };

    return exports;
  });

