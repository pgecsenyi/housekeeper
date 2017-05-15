'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var i18next = require('i18next');
var i18nBackend = require('i18next-node-fs-backend');
var i18nMiddleware = require('i18next-express-middleware');
var path = require('path');

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports.middleware = i18nMiddleware.handle(i18next, { removeLngFromUrl: true });

module.exports.initialize = function (localesPath, isInDebugMode) {

  var i18nBackendOptions = {
    // The path where resources get loaded from.
    loadPath: path.join(localesPath, '{{lng}}', '{{ns}}.json'),
    // The path to post missing resources.
    addPath: path.join(localesPath, '{{lng}}', '{{ns}}.missing.json'),
    // The indent to use when storing JSON files.
    jsonIndent: 2
  };
  var i18nLanguageDetectorOptions = {
    // The order in which user language should be detected.
    order: [ /*'path', 'cookie' */ 'querystring', 'session', 'header' ],
    // Language lookup options. 
    lookupCookie: 'i18next',
    lookupFromPathIndex: 0,
    lookupPath: 'lng',
    lookupQuerystring: 'lng',
    lookupSession: 'language',
    // Cache user language. 
    caches: false, // ['cookie'] 
    // Optional expire and domain for set cookie. 
    // cookieExpirationDate: new Date(),
    // cookieDomain: 'myDomain',
    templateStrings: true
  };
  i18next
    .use(i18nBackend)
    .use(i18nMiddleware.LanguageDetector)
    .init({
      backend: i18nBackendOptions,
      debug: isInDebugMode,
      detection: i18nLanguageDetectorOptions,
      fallbackLng: 'en',
      lng: 'en',
      saveMissing: false
    });
};
