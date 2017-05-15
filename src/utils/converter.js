'use strict';

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports.monthIdentifiers = [
  'January', 'February', 'March', 'April',
  'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

module.exports.getDateDatabaseFormat = function (date) {

  return date.substring(0, date.length - 1).replace(/\./g, '-');
};

module.exports.getDateDisplayFormat = function (date) {

  return date.replace(/-/g, '.') + '.';
};

module.exports.getMonth = function (date) {

  return date.substring(5, 7);
};

module.exports.getUnitDisplayFormat = function (unit) {

  return unit.replace(/\^[0-9]+/g, '<sup>3</sup>');
};

module.exports.getYear = function (date) {

  return date.substring(0, 4);
};
