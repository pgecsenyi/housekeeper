'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var bodyParser = require('body-parser');
var cookieSession = require('cookie-session');
var express = require('express');
var favicon = require('serve-favicon');
var fs = require('fs');
var nconf = require('nconf');
var path = require('path');

var addressFilter = require('./utils/addressfilter');
var errorHandler = require('./utils/errorhandler');
var localizer = require('./utils/localizer');
var logger = require('./utils/logger');
var paramCollector = require('./utils/paramcollector');

/*******************************************************************************************************************//**
 * Variables.
 **********************************************************************************************************************/

var configFilePath = 'config.json';
var isInDebugMode = false;
var workingDirectory = __dirname;

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function configureAddressFilter() {

  if (!nconf.get('addressFilter:isFilteringEnabled')) {
    return false;
  }

  addressFilter.initialize(nconf.get('addressFilter:allowedAddresses'));

  return true;
}

function loadConfigurationFile() {

  if (!fs.existsSync(configFilePath)) {
    console.log('Configuration file not found.');
    process.exit(1);
  }
  nconf.file({ file: configFilePath });
}

function parseCommandLineArgs() {

  var argv = require('minimist')(process.argv.slice(2));

  isInDebugMode = argv.d || argv.debug || false;
  if (argv.c) {
    configFilePath = argv.c.trim();
  } else if (argv.config) {
    configFilePath = argv.config.trim();
  }
}

/*******************************************************************************************************************//**
 * Initialization.
 **********************************************************************************************************************/

// Parse command line arguments, then load configuration file.
parseCommandLineArgs();
loadConfigurationFile();

// Initialize logging.
var loggerOptions = nconf.get('log');
loggerOptions.isInDebugMode = isInDebugMode;
logger.initialize(loggerOptions);

// Initialize DAL.
var dal = require('./dal/dal.js')(nconf.get('database:path'));
dal.setLogger(logger.appLogger);

// Initialize localizer.
localizer.initialize(path.join(workingDirectory, 'locales'), isInDebugMode);

// Initialize address filter.
var isAddressFilteringEnabled = configureAddressFilter();

// Initialize routing logic.
var decimal = nconf.get('display:decimal') === undefined ? 3 : nconf.get('display:decimal');
var title = nconf.get('display:title') || '';
var compare = require('./routes/compare')(dal, title, decimal);
var details = require('./routes/details')(dal, title, decimal);
var edit = require('./routes/edit')(dal, title);
var install = require('./routes/install')(dal, title, isInDebugMode);
var summary = require('./routes/summary')(dal, title, decimal);

// Create Express Application instance.
var app = express();

// Set up view engine.
app.set('views', path.join(workingDirectory, 'views'));
app.set('view engine', 'pug');

// Configure middlewares.
if (logger.webLogger !== null) {
  app.use(logger.webLogger);
}
if (isAddressFilteringEnabled) {
  app.use(addressFilter.middleware);
}
app.use(favicon(path.join(workingDirectory, 'public', 'images', 'favicon.ico')));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieSession({'keys' : ['topSecretKey']}));
app.use(require('stylus').middleware({ src: path.join(workingDirectory, 'public'), compress: !isInDebugMode }));
app.use(express.static(path.join(workingDirectory, 'public')));
app.use(require('connect-timeout')(5000));
app.use(localizer.middleware);
app.use(paramCollector);

// Configure custom middlewares -- routing.
app.use('/', summary);
app.use('/compare', compare);
app.use('/details', details);
app.use('/edit', edit);
app.use('/install', install);

// Configure error handlers.
app.use(errorHandler.handle404Errors);
if (app.get('env') === 'development') {
  app.use(errorHandler.handleDevErrors);
}
app.use(errorHandler.handleProdErrors);

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports = app;
