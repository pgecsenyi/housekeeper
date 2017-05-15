'use strict';

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports.validateDate = function (date) {

  return date.match(/^[0-9]{4}\.[0-9]{2}\.[0-9]{2}\.$/);
};

module.exports.validateId = function (id) {

  return id.match(/^[0-9]+$/);
};

module.exports.validateReading = function (reading) {

  return reading.match(/^[0-9]+(|\.)[0-9]+$/);
};

module.exports.validateYear = function (year) {

  return year.match(/^[0-9]{0,4}$/);
};
