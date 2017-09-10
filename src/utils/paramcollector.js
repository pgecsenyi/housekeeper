'use strict';

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports = function (request, response, next) {

  if (request.session.estateId === undefined) {
    request.session.estateId = 1;
  }

  if (request.query.lng !== undefined) {
    request.session.language = request.query.lng;
  }

  if (request.session.isAnimationEnabled === undefined) {
    request.session.isAnimationEnabled = true;
  }

  next();
};
