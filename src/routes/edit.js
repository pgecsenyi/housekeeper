'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var router = require('express').Router();

var converter = require('../utils/converter');
var inputValidator = require('../utils/inputvalidator');

/*******************************************************************************************************************//**
 * Variables.
 **********************************************************************************************************************/

var dal = null;
var title = '';

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function indicateError(message, templateParams) {

  templateParams.error = { message: message };
}

function fetchData(request, templateParams) {

  // Get the reading details.
  var readingData = null;

  return dal.getReading(request.params.readingId)
    // Get the name of the estate.
    .then(function (reading) {
      if (!reading) {
        indicateError('Invalid reading identifier', templateParams);
        return new Promise((resolve, reject) => reject());
      }
      readingData = reading;
      return dal.getEstateName(readingData.id_estate);
    })
    // Get the name of the category.
    .then(function (estateName) {
      templateParams.estate = estateName;
      return dal.getCategory(readingData.id_category);
    })
    // Get details.
    .then(function (category) {
      templateParams.category = {
        name: category.name,
        unit: converter.getUnitDisplayFormat(category.unit)
      };
      templateParams.reading = {
        id: request.params.readingId,
        value: readingData.value,
        date: converter.getDateDisplayFormat(readingData.date),
        note: readingData.note
      };
    });
}

function redirect(request, response) {

  if (request.body.readingId === undefined || request.validationError !== undefined) {
    return;
  }

  // Get the category ID from the reading.
  dal.getReading(request.params.readingId)
    .then(function (reading) {
      // Reject promise on error.
      if (!reading) {
        return new Promise((resolve, reject) => reject());
      }
      // Redirect if everything goes well.
      response.redirect('/details/' + reading.id_category);
      return new Promise(resolve => resolve());
    });
}

function setInputValues(request, templateParams) {

  if (!request.body || (templateParams.error && templateParams.error.isFatal)) {
    return;
  }

  templateParams.inputDate = request.body.readingDate || templateParams.reading.date;
  templateParams.inputId = request.body.readingId || templateParams.reading.id;
  templateParams.inputNote = request.body.readingNote || templateParams.reading.note;
  templateParams.inputValue = request.body.readingValue || templateParams.reading.value;
}

function validateInput(request) {

  var readingId = request.params.readingId;
  if (request.body.readingId) {
    readingId = request.body.readingId;
  }

  if (!inputValidator.validateId(readingId)) {
    return 'Invalid reading identifier';
  }

  return null;
}

function renderResult(request, response, next) {

  // Set basic parameters.
  var templateParams = {
    title : request.t('Edit') + ' - ' + title,
    t: request.t
  };

  // Check for bad input.
  var validationError = validateInput(request);
  if (validationError !== null) {
    indicateError(validationError, templateParams);
    response.render('handlederror', templateParams);
    return;
  }

  // Fetch the necessary data from the database and render the results.
  fetchData(request, templateParams)
    // Handle errors -- the template may still can be rendered on a non-fatal error.
    .catch(function (error) {
      if (error) {
        return new Promise((resolve, reject) => reject(error));
      }
      response.render('handlederror', templateParams);
    })
    // Render response.
    .then(function () {
      templateParams.validationError = request.validationError;
      setInputValues(request, templateParams);
      response.render('edit', templateParams);
    })
    // Skip on fatal errors.
    .catch(function (error) {
      next(error);
    });
}

function validateAndStoreInput(request) {

  // Validate reading ID.
  if (!inputValidator.validateId(request.body.readingId)) {
    request.validationError = 'Invalid reading identifier';
    return new Promise(resolve => resolve());
  }
  // Validate date.
  if (!inputValidator.validateDate(request.body.readingDate)) {
    request.validationError = 'Invalid date';
    return new Promise(resolve => resolve());
  }
  // Validate reading value.
  if (!inputValidator.validateReading(request.body.readingValue)) {
    request.validationError = 'Invalid reading';
    return new Promise(resolve => resolve());
  }

  // In case everything is right, update reading data in the database.
  return dal.createReadingRevision(
    request.body.readingId,
    request.body.readingValue,
    converter.getDateDatabaseFormat(request.body.readingDate),
    request.body.readingNote
  );
}

/*******************************************************************************************************************//**
 * Routing.
 **********************************************************************************************************************/

router
  .get('/:readingId', function (request, response, next) {

    // Render result.
    renderResult(request, response, next);
  })
  .post('/:readingId', function (request, response, next) {

    // Validate and store input, then render result.
    validateAndStoreInput(request)
      .then(function () {
        redirect(request, response);
      })
      .then(function () {
        renderResult(request, response, next);
      })
      .catch(function (error) {
        next(error);
      });
  });

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports = function (pDal, pTitle) {

  dal = pDal;
  title = pTitle;

  return router;
};
