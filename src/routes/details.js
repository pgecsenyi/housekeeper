'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var router = require('express').Router();
var url = require('url');

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
 * Classes.
 **********************************************************************************************************************/

function Reading(id, date, value, consumption, note) {

  this.id = id;
  this.date = date;
  this.value = value;
  this.consumption = consumption;
  this.note = note;
}

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function calculateConsumptions(data, startIndex, prev, output) {

  var fixedValue = 0;
  var i = 0;
  var month = 0, prevMonth = -1;

  for (i = startIndex; i >= 0; i -= 1) {

    // Create new display record.
    fixedValue = data[i].value.toFixed(decimal);
    output.readings.splice(0, 0, new Reading(
      data[i].id,
      converter.getDateDisplayFormat(data[i].date),
      fixedValue,
      (fixedValue - prev).toFixed(decimal),
      data[i].note
    ));

    // Remember last consumption.
    prev = fixedValue;

    // If the measurement comes from the same month as before, update the old value for the chart.
    month = converter.getMonth(data[i].date);
    if (month === prevMonth) {
      output.consumptions[0] = output.readings[0].consumption;
    // In case it is not the same month, display it on the chart.
    } else {
      prevMonth = month;
      output.consumptions.push(output.readings[0].consumption);
      output.monthNames.push(converter.monthIdentifiers[month - 1]);
    }
  }
}

function configureSession(request) {

  request.year = request.query && request.query.year;
  request.validationError = null;
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
        return new Promise((resolve, reject) => reject());
      }
      templateParams.estate = estateName;
      return dal.getCategory(request.params.categoryId);
    })
    // Get the list of years for the selected category.
    .then(function (category) {
      if (!category) {
        indicateError('Invalid category', templateParams);
        return new Promise((resolve, reject) => reject());
      }
      templateParams.category = category.name;
      templateParams.unit = converter.getUnitDisplayFormat(category.unit);
      return dal.getYears(request.session.estateId, request.params.categoryId);
    })
    // Get details.
    .then(function (years) {
      templateParams.years = years;
      return dal.getReadings(
        request.session.estateId,
        request.params.categoryId,
        request.year ? undefined : 13,
        request.year,
        true
      );
    });
}

function processData(data, years, year) {

  // Initialize template parameters.
  var output = {
    consumptions : [],
    monthNames : [],
    readings : []
  };

  // If there are not enough data to display, return.
  if (!data || data.length <= 0 || !years || years.length <= 0) {
    return output;
  }

  // Determine whether we should put the very first value too in the data table.
  var prev = 0;
  var startIndex = data.length - 1;
  var isEarliestYear = year === years[years.length - 1];
  if (!year || !isEarliestYear) {
    prev = data[data.length - 1].value;
    startIndex -= 1;
  }

  // If there are not enough data to display, return.
  if (startIndex < 0) {
    prev = 0;
    startIndex = 0;
  }

  calculateConsumptions(data, startIndex, prev, output);

  // Do not display the very first record on the chart, it is probably an extremely high value.
  if (isEarliestYear) {
    output.consumptions.splice(0, 1);
    output.monthNames.splice(0, 1);
  }

  return output;
}

function redirect(request, response) {

  if (request.query.year === undefined
      || request.body.yearToCompareWith === undefined) {
    return;
  }

  request.session.isAnimationEnabled = true;
  response.redirect('/compare/'
    + request.params.categoryId
    + '?year1=' + request.query.year
    + '&year2=' + request.body.yearToCompareWith);
}

function setInputValues(request, templateParams) {

  var shouldBeFilled = request.validationError !== null && request.body;

  templateParams.inputDate = (shouldBeFilled && request.body.date) || '';
  templateParams.inputReading = (shouldBeFilled && request.body.reading) || '';
  templateParams.inputNote = (shouldBeFilled && request.body.note) || '';
}

function renderResult(request, response, next) {

  // Set basic parameters.
  var templateParams = {
    title : request.t('Details') + ' - ' + title,
    animation : request.session.isAnimationEnabled,
    t : request.t
  };

  // Fetch necessary data from the database, process it and render the results.
  fetchData(request, templateParams)
    // Handle errors -- the template may still can be rendered on a non-fatal error.
    .catch(function (error) {
      if (error) {
        return new Promise((resolve, reject) => reject());
      }
      response.render('handlederror', templateParams);
    })
    // Render response.
    .then(function (data) {
      setInputValues(request, templateParams);
      templateParams.selectedYear = request.year;
      templateParams.url = request.baseUrl + url.parse(request.url).pathname;
      templateParams.validationError = request.t(request.validationError);
      var processed = null;
      if (data !== null) {
        processed = processData(data, templateParams.years, request.year);
        templateParams.consumptions = processed.consumptions;
        templateParams.monthNames = processed.monthNames.transform(request.t);
        templateParams.readings = processed.readings;
      }
      response.render('details', templateParams);
    })
    // Skip on fatal errors.
    .catch(function (error) {
      next(error);
    });
}

function validateAndStoreInput(request) {

  // Validate date.
  if (!inputValidator.validateDate(request.body.date)) {
    request.validationError = 'Invalid date';
    return new Promise(resolve => resolve());
  }
  // Validate reading.
  if (!inputValidator.validateReading(request.body.reading)) {
    request.validationError = 'Invalid reading';
    return new Promise(resolve => resolve());
  }

  // In case everything is right, insert the data into the database.
  return dal.insertReading(
    request.session.estateId,
    request.params.categoryId,
    request.body.reading,
    converter.getDateDatabaseFormat(request.body.date),
    request.body.note
  );
}

/*******************************************************************************************************************//**
 * Routing.
 **********************************************************************************************************************/

router
  .get('/:categoryId', function (request, response, next) {

    // Configure session parameters.
    configureSession(request);

    // Render result.
    renderResult(request, response, next);

    // Disable animations.
    request.session.isAnimationEnabled = false;
  })
  .post('/:categoryId', function (request, response, next) {

    // Redirect to compare page if necessary.
    redirect(request, response);

    // Configure session parameters.
    configureSession(request);

    // Validate and store input.
    validateAndStoreInput(request)
      .then(function () {
        // Render result.
        request.session.isAnimationEnabled = request.validationError === null;
        renderResult(request, response, next);
        // Disable animations.
        request.session.isAnimationEnabled = false;
      });
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
