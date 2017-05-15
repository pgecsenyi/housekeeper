'use strict';

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

Array.prototype.contains = function (item) {

  var i = 0;

  for (i = 0; i < this.length; i += 1) {
    if (this[i] === item) {
      return true;
    }
  }

  return false;
};

Array.prototype.sum = function () {

  var i = 0;
  var total = 0;

  for (i = 0; i < this.length; i += 1) {
    total += parseInt(this[i], 0);
  }

  return total;
};

Array.prototype.transform = function (transformation) {

  var i = 0;
  var result = [];

  for (i = 0; i < this.length; i += 1) {
    result.push(transformation(this[i]));
  }

  return result;
};
