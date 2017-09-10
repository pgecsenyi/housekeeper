'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var log4js = require('log4js');
var morgan = require('morgan');

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

var appLogger = null;
var webLogger = null;

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function configureLog4js(options) {

  if (!options.console && !options.file) {
    return null;
  }

  var log4jsConfig = createLog4jsConfigSkeleton(options);
  addConsoleLogger(log4jsConfig, options);
  addFileLogger(log4jsConfig, options);
  log4js.configure(log4jsConfig);

  return log4js;
}

function createLog4jsConfigSkeleton(options) {

  var log4jsConfig = { appenders: {}, categories: {} };
  log4jsConfig.categories['default'] = { appenders: [], level: 'WARN' };
  if (options.isInDebugMode)
    log4jsConfig.categories['default'].level = 'DEBUG';

  return log4jsConfig;
}

function addConsoleLogger(log4jsConfig, options) {

  if (options.console) {
    log4jsConfig.appenders['consoleLog'] = { type: 'console' };
    log4jsConfig.categories['default'].appenders.push('consoleLog');
  }
}

function addFileLogger(log4jsConfig, options) {

  if (options.file) {
    if (!options.filePath || options.filePath.trim() === '') {
      console.log('Undefined log file.');
    } else {
      log4jsConfig.appenders['fileLog'] = {
        absolute: false,
        type: 'file',
        filename: options.filePath,
        maxLogSize: 10240,
        backups: 3
      };
      log4jsConfig.categories['default'].appenders.push('fileLog');
    }
  }
}

function configureMorgan(appLogger) {

  var format = ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"';
  var webLog = morgan(
    format,
    { stream: { write: function (str) { appLogger.debug(str); } } }
  );

  return webLog;
}

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports.appLogger = appLogger;
module.exports.webLogger = webLogger;

module.exports.initialize = function (options) {

  var log4js = configureLog4js(options);

  appLogger = log4js.getLogger();
  if (appLogger !== null) {
    configureMorgan(appLogger);
  }
};
