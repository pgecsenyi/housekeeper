'use strict';
/*jslint unparam: true*/

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

// If we got here that means an error. Catch 404 and forward to error handler.
module.exports.handle404Errors = function (request, response, next) {

  var error = new Error(request.t('Not Found'));
  error.status = 404;
  next(error);
};

// Development error handler will print stacktrace.
module.exports.handleDevErrors = function (error, request, response, next) {

  response.status(error.status || 500);
  response.render('error', {
    message: error.message,
    error: error
  });
};

// Production error handler -- no stacktraces leaked to user.
module.exports.handleProdErrors = function (error, request, response, next) {

  response.status(error.status || 500);
  response.render('error', {
    message: error.message,
    error: {}
  });
};
