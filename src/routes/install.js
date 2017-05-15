'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var router = require('express').Router();

/*******************************************************************************************************************//**
 * Variables.
 **********************************************************************************************************************/

var dal = null;
var isInDebugMode = false;
var title = '';

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function createDatabase(estateString, categoryString) {

  // Execute all commands serialized in a transaction.
  dal.executeSerial(function () {

    var i = 0;
    var matches = [];

    // Create database.
    dal.create();

    // Insert estates.
    var estates = estateString.split(',');
    for (i = 0; i < estates.length; i += 1) {
      dal.insertEstate(estates[i].trim());
    }

    // Insert categories.
    var categories = categoryString.split(',');
    for (i = 0; i < categories.length; i += 1) {
      matches = categories[i].match(/^\s*([A-Za-z0-9 ]+)\s*\(([A-Za-z0-9\^ ]+)\)\s*$/);
      if (matches && matches.length === 3) {
        dal.insertCategory(matches[1].trim(), matches[2].trim());
      }
    }
  });
}

/*******************************************************************************************************************//**
 * Routing.
 **********************************************************************************************************************/

router
  .get('/', function (request, response) {

    var templateParameters = {
      title : request.t('Install') + ' - ' + title,
      t: request.t
    };
    if (isInDebugMode) {
      templateParameters.categories = 'Electric energy (kWh), Gas (m^3), Water (m^3)';
      templateParameters.estates = 'London, New York';
    } else {
      templateParameters.categories = '';
      templateParameters.estates = '';
    }
    response.render('install', templateParameters);
  })
  .post('/', function (request, response) {

    createDatabase(request.body.estates, request.body.categories);
    response.send(request.t('The application is now installed'));
  });

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports = function (pDal, pTitle, pIsInDebugMode) {

  dal = pDal;
  title = pTitle;
  isInDebugMode = pIsInDebugMode;

  return router;
};
