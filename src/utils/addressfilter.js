'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

require('./array');

/*******************************************************************************************************************//**
 * Variables.
 **********************************************************************************************************************/

var allowedAddresses = [];

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports.initialize = function (pAllowedAddresses) {

  if (pAllowedAddresses) {
    allowedAddresses = pAllowedAddresses;
  }
};

module.exports.middleware = function (request, response, next) {

  // Block access to a specific path only.
  //if (req.url.indexOf('/_app/') === 0)

  var requestIpAddress = request.socket.address().address;
  if (!allowedAddresses.contains(requestIpAddress)) {
    response.writeHead(401);
    return response.end();
  }

  next();
};
