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

  // Check requested log type.
  if (!options.console && !options.file) {
    return null;
  }

  // Configure logger.
  var log4jsConfig = { appenders: [] };

  if (options.console) {
    log4jsConfig.appenders.push({ type: 'console' });
  }
  if (options.file) {
    if (!options.filePath || options.filePath.trim() === '') {
      console.log('Undefined log file, fallback to console.');
    } else {
      log4jsConfig.appenders.push({
        absolute: false,
        type: 'file',
        filename: options.filePath,
        maxLogSize: 10240,
        backups: 3
      });
    }
  }

  log4js.configure(log4jsConfig);

  return log4js;
}

function configureMorgan(appLog) {

  var format = ':remote-addr - :remote-user ":method :url HTTP/:http-version" :status :response-time ms :res[content-length] ":referrer" ":user-agent"';
  var webLog = morgan(
    format,
    { stream: { write: function (str) { appLog.debug(str); } } }
  );

  return webLog;
}

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports.appLogger = appLogger;
module.exports.webLogger = webLogger;

module.exports.initialize = function (options) {

  // Configure application log.
  var log4js = configureLog4js(options);

  appLogger = log4js.getLogger();
  if (options.isInDebugMode) {
    appLogger.setLevel('DEBUG');
  } else {
    appLogger.setLevel('ERROR');
  }

  // Configure web interface log.
  if (appLogger !== null) {
    configureMorgan();
  }
};
