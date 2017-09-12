'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var markdown = require('node-markdown').Markdown;
var router = require('express').Router();

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

/**
 * Configures template parameters for each category in Summary section. Calculates consumption averages.
 * 
 * @data {Array} The array which stores the consumption records.
 * @unit {string} The unit of the data records.
 * @return {Object} An object containing the consumption, date and average fields for the category.
 */
function buildSummaryData(data, unit) {

  // Initialize template fields for this category.
  var templateData = { avg : 'N/A', date : 'N/A', value : 'N/A' };

  // If there are no enough data available, then we have nothing else to do here.
  if (!data || data.length <= 0) {
    return templateData;
  }

  // Set the last value and it's date.
  unit = (unit && converter.getUnitDisplayFormat(unit)) || '';
  templateData.value = data[0].value.toFixed(decimal) + ' ' + unit;
  templateData.date = converter.getDateDisplayFormat(data[0].date);

  // Calculate averages.
  if (data.length > 2) {
    var average = 0;
    var i = 0;
    for (i = data.length - 2; i >= 0; i -= 1) {
      average += Number(data[i].value) - Number(data[i + 1].value);
    }
    average /= data.length;
    templateData.avg = average.toFixed(decimal) + ' ' + unit;
  }

  return templateData;
}

function calculateSummaryThenRenderResult(response, next, templateParams, categories) {

  if (!categories || categories.length <= 0) {
    response.render('summary', templateParams);
    return;
  }

  var processedCategories = 0;

  categories.forEach(function (category) {
    dal.getReadings(templateParams.estateId, category.id, 13)
      .then(function (data) {
        templateParams.data[category.id] = buildSummaryData(data, category.unit);
        processedCategories += 1;
        if (processedCategories >= categories.length) {
          response.render('summary', templateParams);
        }
      })
      .catch(function (error) {
        next(error);
      });
  });
}

function configureSession(request) {

  request.session.isAnimationEnabled = true;
}

function verifyEstateId(estateId, estates) {

  var i = 0;
  var estateIdString = estateId.toString();

  if (!inputValidator.validateId(estateIdString)) {
    return false;
  }

  for (i = 0; i < estates.length; i += 1) {
    if (estates[i].id.toString() === estateIdString) {
      return true;
    }
  }

  return false;
}

function fetchData(request, templateParams) {

  var categoryData = [];

  // Get the list of the estates first.
  return dal.getEstates()
    // Then the list of the categories.
    .then(function (estates) {
      templateParams.estates = estates;
      if (!verifyEstateId(request.session.estateId, estates)) {
        templateParams.errorWrongEstateId = true;
        return new Promise((resolve, reject) => reject());
      }
      return dal.getCategories();
    })
    // Then the description for the selected estate.
    .then(function (categories) {
      categoryData = categories;
      return dal.getEstateDescription(request.session.estateId);
    })
    // Then the data for each category.
    .then(function (description) {
      templateParams.description = (description && markdown(description)) || '';
      return categoryData;
    });
}

function renderResult(request, response, next) {

  var templateParams = {
    title : request.t('Summary') + ' - ' + title,
    estateId : request.session.estateId,
    t: request.t
  };

  // Fetch the necessary data from the database and render the results.
  fetchData(request, templateParams)
    // Handle errors -- the template may still can be rendered on a non-fatal error.
    .catch(function (error) {
      if (error) {
        return new Promise((resolve, reject) => reject(error));
      }
      response.render('summary', templateParams);
    })
    // Render response.
    .then(function (categoryData) {
      templateParams.data = [];
      calculateSummaryThenRenderResult(response, next, templateParams, categoryData);
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
  .get('/', function (request, response, next) {

    // Configure session parameters.
    configureSession(request);

    // Render result.
    renderResult(request, response, next);
  })
  .post('/', function (request, response, next) {

    // Set estate ID based on form input.
    request.session.estateId = request.body.estate;

    // Configure session parameters.
    configureSession(request);

    // Render result.
    renderResult(request, response, next);
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
