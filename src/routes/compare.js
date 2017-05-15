'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var q = require('q');
var router = require('express').Router();

require('../utils/array');
var converter = require('../utils/converter');
var inputValidator = require('../utils/inputvalidator');

/*******************************************************************************************************************//**
 * Variables.
 **********************************************************************************************************************/

var dal = null;
var decimal = 0;
var title = '';

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function removeFirstItemIfPossible(output) {

  if (output.consumptionYear1.length > 1) {
    output.consumptionYear1.splice(0, 1);
    output.consumptionYear2.splice(0, 1);
    output.months.splice(0, 1);
  }
}

/**
 * Creates an array that contains the consumption values for each year per month. Only those months are listed where
 * there are data available for both years.
 *
 * @data {Array} The array which stores the consumption records.
 * @return {Object} An object containing three arrays (months, consumptions in year 1, consumptions in from year2).
 */
function calculateOutputData(data, idxYear2Start) {

  // Stores the consumptions for both years and the corresponding months.
  var output = {
    consumptionYear1 : [],
    consumptionYear2 : [],
    months : []
  };
  // Store always the previous recordings so difference (consumption) can be calculated easily. 
  var base1 = 0, base2 = 0;
  // The indexes of the current items in the different arrays.
  var idxOutput = 0, idxYear1 = data.length - 1, idxYear2 = idxYear2Start;
  // The current and the previous month in year 1 and in year 2.
  var month1 = 0, month2 = 0, prevMonth1 = 0, prevMonth2 = 0;
  // Those consumptions will be stored if everything is fine. 
  var consumption1 = 0, consumption2 = 0, monthDiff1 = 0, monthDiff2 = 0;

  while (idxYear2 >= 0) {

    if (idxYear1 <= idxYear2Start) {
      break;
    }

    month1 = converter.getMonth(data[idxYear1].date);
    month2 = converter.getMonth(data[idxYear2].date);
    monthDiff1 = (month1 - prevMonth1 > 0) ? month1 - prevMonth1 : 1;
    monthDiff2 = (month2 - prevMonth2 > 0) ? month2 - prevMonth2 : 1;
    consumption1 = (data[idxYear1].value - base1) / monthDiff1;
    consumption2 = (data[idxYear2].value - base2) / monthDiff2;

    if (month1 < month2) {
      base1 = data[idxYear1].value;
      prevMonth1 = month1;
      idxYear1 -= 1;
    } else if (month2 < month1) {
      base2 = data[idxYear2].value;
      prevMonth2 = month2;
      idxYear2 -= 1;
    } else {
      output.consumptionYear1[idxOutput] = consumption1.toFixed(decimal);
      output.consumptionYear2[idxOutput] = consumption2.toFixed(decimal);
      output.months[idxOutput] = converter.monthIdentifiers[month1 - 1];
      idxOutput += 1;

      base1 = data[idxYear1].value;
      prevMonth1 = month1;
      idxYear1 -= 1;

      base2 = data[idxYear2].value;
      prevMonth2 = month2;
      idxYear2 -= 1;
    }
  }

  removeFirstItemIfPossible(output);

  return output;
}

/**
 * Determines the index of the first record from the second year in an ordered flat array.
 *
 * @data {Array} The array which stores the consumption records.
 * @return {number} The index of the first record from the second year.
 */
function determineSecondYearStart(data) {

  var lastIndex = data.length - 1;
  var prev = converter.getYear(data[lastIndex].date);
  var i = 0;

  for (i = lastIndex; i >= 0; i -= 1) {
    if (converter.getYear(data[i].date) !== prev) {
      return i;
    }
  }

  return -1;
}

function indicateError(message, templateParams) {

  templateParams.error = { message: message };
}

function fetchData(request, templateParams) {

  // Get the name of the selected estate.
  return dal.getEstateName(request.session.estateId)
    // Get the parameters of the selected category.
    .then(function (estateName) {
      if (!estateName) {
        indicateError('Invalid estate', templateParams);
        return q.reject();
      }
      templateParams.estate = estateName;
      return dal.getCategory(request.params.categoryId);
    })
    // Get the list of years for the selected category.
    .then(function (category) {
      if (!category) {
        indicateError('Invalid category', templateParams);
        return q.reject();
      }
      templateParams.category = category.name;
      templateParams.unit = converter.getUnitDisplayFormat(category.unit);
      return dal.getReadingsFor2Years(
        request.session.estateId,
        request.params.categoryId,
        request.query.year1,
        request.query.year2
      );
    });
}

/**
 * Processes database data.
 *
 * @data {Array} The array which stores the consumption records.
 */
function processData(data) {

  if (!data || data.length < 1) {
    return;
  }

  var idxYear2Start = determineSecondYearStart(data);
  if (idxYear2Start < 0) {
    return null;
  }

  return calculateOutputData(data, idxYear2Start);
}

function validateInput(request) {

  if (!request.query.year1
      || !request.query.year2
      || !inputValidator.validateYear(request.query.year1)
      || !inputValidator.validateYear(request.query.year2)) {
    return 'Invalid years';
  }

  return null;
}

function renderResult(request, response, next) {

  var templateParams = {
    title : request.t('Compare') + ' - ' + title,
    animation : request.session.isAnimationEnabled,
    t : request.t
  };

  // Check for input validation errors.
  var validationError = validateInput(request);
  if (validationError !== null) {
    indicateError(validationError, templateParams);
    response.render('handlederror', templateParams);
    return;
  }

  // Fetch necessary data from the database, process it and render the results.
  fetchData(request, templateParams)
    // Handle errors -- the template may still can be rendered on a non-fatal error.
    .catch(function (error) {
      if (error) {
        return q.reject(error);
      }
      response.render('handlederror', templateParams);
    })
    // Render response.
    .then(function (data) {
      templateParams.data = processData(data);
      templateParams.year1 = request.query.year1;
      templateParams.year2 = request.query.year2;
      if (templateParams.data) {
        templateParams.data.months = templateParams.data.months.transform(request.t);
        templateParams.data.sumYear1 = templateParams.data.consumptionYear1.sum();
        templateParams.data.sumYear2 = templateParams.data.consumptionYear2.sum();
      }
      response.render('compare', templateParams);
    })
    // Skip on fatal errors.
    .catch(function (error) {
      next(error);
    });
}

/*******************************************************************************************************************//**
 * Routing.
 **********************************************************************************************************************/

router
  .get('/:categoryId', function (request, response, next) {

    // Render result.
    if (!request.query) {
      return;
    }
    renderResult(request, response, next);

    // Disable animations.
    request.session.isAnimationEnabled = false;
  });

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports = function (pDal, pTitle, pDecimal) {

  dal = pDal;
  title = pTitle;
  decimal = pDecimal;

  return router;
};
