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
    exports.getOffers= function (stItemId) {
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
        log.debug('Error Calling API', JSON.stringify(e.message));
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
    /*****************************************ORDERS*****************************************/

    /**
     * CREATE ORDER
     * API Documentation: https://docs.extend.com/reference/orderscreate
     */
     exports.createOrder = function (objOrderDetails) {
      var config = extendConfig.getConfig();

      try {
        var response = https.post({
          url: config.domain + '/orders',
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objOrderDetails),
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
 * UPDATE ORDER LINE FULFILLMENT
 * API Documentation: https://docs.extend.com/reference/lineitemsfulfill
 */
    exports.fulfillOrderLine = function (objOrderDetails) {
      var config = extendConfig.getConfig();
      try {
        var response = https.post({
          url: config.domain + '/line-items/fulfill',
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objOrderDetails),
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
     * REFUND CONTRACT
     * API Documentation: https://docs.extend.com/reference/refundscreate
     */
    exports.refundContract = function (objRefundDetails) {
      var config = extendConfig.getConfig();
      try {
        var response = https.post({
          url: config.domain + '/refunds',
          headers: {
            'Content-Type': 'application/json',
            'X-Extend-Access-Token': config.key,
            'Accept': 'application/json;version=' + config.version
          },
          body: JSON.stringify(objRefundDetails),
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
     * GET REFUND QUOTE
     * API Documentation: https://docs.extend.com/reference/refundsget
     */
         exports.getRefundQuote = function (objRefundDetails) {
          var config = extendConfig.getConfig();
          try {
            var response = https.get({
              url: config.domain + '/refunds',
              headers: {
                'Content-Type': 'application/json',
                'X-Extend-Access-Token': config.key,
                'Accept': 'application/json;version=' + config.version
              },
              body: JSON.stringify(objRefundDetails),
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
     * REQUEST REFUND
     * API Documentation: https://docs.extend.com/reference/refundscreate
     */
 exports.requestRefund = function (objRefundDetails) {
  var config = extendConfig.getConfig();
  try {
    var response = https.post({
      url: config.domain + '/refunds',
      headers: {
        'Content-Type': 'application/json',
        'X-Extend-Access-Token': config.key,
        'Accept': 'application/json;version=' + config.version
      },
      body: JSON.stringify(objRefundDetails),
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

