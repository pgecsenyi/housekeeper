'use strict';

/*******************************************************************************************************************//**
 * Modules.
 **********************************************************************************************************************/

require('date-format-lite');

var sqlite3 = require('sqlite3').verbose();
var q = require('q');

/*******************************************************************************************************************//**
 * Variables.
 **********************************************************************************************************************/

var databasePath = null;
var logger = null;
var openedDb = null;

/*******************************************************************************************************************//**
 * Functions.
 **********************************************************************************************************************/

function closeDatabase(db) {

  if (db !== null && db !== openedDb) {
    db.close();
  }
}

function getDatabase() {

  if (openedDb === null) {
    return new sqlite3.Database(databasePath);
  }

  return openedDb;
}

function logError(message) {

  if (logger !== null) {
    logger.error(message);
  }
}

function setDatabase(db) {

  openedDb = db;
}

/*******************************************************************************************************************//**
 * Functions (exported).
 **********************************************************************************************************************/

function create() {

  var db = getDatabase();

  db.serialize(function () {
    db.run('DROP TABLE IF EXISTS estates');
    db.run('DROP TABLE IF EXISTS categories');
    db.run('DROP TABLE IF EXISTS readings');
    db.run(
      'CREATE TABLE estates ('
        + 'id INTEGER PRIMARY KEY,'
        + 'name VARCHAR(255),'
        + 'description TEXT)'
    );
    db.run(
      'CREATE TABLE categories ('
        + 'id INTEGER PRIMARY KEY,'
        + 'name VARCHAR(255),'
        + 'unit VARCHAR(32))'
    );
    db.run(
      'CREATE TABLE readings ('
        + 'id INTEGER PRIMARY KEY,'
        + 'id_estate INTEGER,'
        + 'id_category INTEGER,'
        + 'value DECIMAL,'
        + 'date DATE,'
        + 'note VARCHAR(255),'
        + 'time_posted DATETIME,'
        + 'FOREIGN KEY(id_estate) REFERENCES estates(id),'
        + 'FOREIGN KEY(id_category) REFERENCES categories(id))'
    );
    db.run(
      'CREATE TABLE reading_revisions ('
        + 'id INTEGER PRIMARY KEY,'
        + 'id_reading INTEGER,'
        + 'value DECIMAL,'
        + 'date DATE,'
        + 'note VARCHAR(255),'
        + 'time_posted DATETIME,'
        + 'FOREIGN KEY(id_reading) REFERENCES readings(id))'
    );
    db.run('CREATE INDEX estate_id_index ON readings (id_estate);');
    db.run('CREATE INDEX category_id_index ON readings (id_category);');
  });

  closeDatabase(db);
}

function executeSerial(func) {

  var db = new sqlite3.Database(databasePath);
  setDatabase(db);

  db.serialize();
  db.run('BEGIN');
  func();
  db.run('COMMIT');
  db.parallelize();

  db.close();
  setDatabase(null);
}

function getCategories(categoryId) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all(
    'SELECT id, name, unit FROM categories',
    [categoryId],
    function (error, rows) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
        return;
      }
      deferred.resolve(rows);
    }
  );

  closeDatabase(db);

  return deferred.promise;
}

function getCategory(categoryId) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all(
    'SELECT name, unit FROM categories WHERE id=? LIMIT 1',
    [categoryId],
    function (error, rows) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
        return;
      }
      if (rows.length < 1) {
        deferred.resolve(null);
        return;
      }
      deferred.resolve(rows[0]);
    }
  );

  closeDatabase(db);

  return deferred.promise;
}

function getReading(readingId) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all(
    'SELECT id_estate, id_category, value, date, note, time_posted FROM readings WHERE id=? LIMIT 1',
    [readingId],
    function (error, rows) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
        return;
      }
      if (rows.length < 1) {
        deferred.resolve(null);
        return;
      }
      deferred.resolve(rows[0]);
    }
  );

  closeDatabase(db);

  return deferred.promise;
}

function getReadings(estateId, categoryId, limit, year, includeLastFromPrevYear) {

  var limitClause = '';
  var whereClause = '';
  var queryParameters = {
    $estateId : estateId,
    $categoryId : categoryId
  };

  if (limit) {
    limitClause = ' LIMIT $limit';
    queryParameters.$limit = limit;
  }
  if (year) {
    if (includeLastFromPrevYear) {
      whereClause += ' AND CAST(strftime("%Y", date) AS INTEGER) <= $year';
      limitClause = ' LIMIT ('
        + 'SELECT COUNT(DISTINCT id) + 1 FROM readings'
        + ' WHERE id_category=$categoryId AND strftime("%Y", date)=$year)';
    } else {
      whereClause += ' AND strftime("%Y", date) = $year';
    }
    queryParameters.$year = year;
  }

  var db = getDatabase();
  var deferred = q.defer();

  db.all(
    'SELECT id, value, date, note FROM readings WHERE id_estate=$estateId AND id_category=$categoryId'
      + whereClause
      + ' ORDER BY date DESC'
      + limitClause,
    queryParameters,
    function (error, rows) {
        if (error !== null) {
          logError(error);
          deferred.reject(error);
          return;
        }
        deferred.resolve(rows);
      }
  );

  closeDatabase(db);

  return deferred.promise;
}

function getReadingsFor2Years(estateId, categoryId, year1, year2) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all(
    'SELECT value, date, note FROM readings WHERE id_estate=$estateId AND id_category=$categoryId'
      + ' AND (strftime("%Y", date) == $year1 OR strftime("%Y", date) == $year2)'
      + ' ORDER BY date DESC',
    {
        $estateId : estateId,
        $categoryId : categoryId,
        $year1 : year1,
        $year2 : year2
      },
    function (error, rows) {
        if (error !== null) {
          logError(error);
          deferred.reject(error);
          return;
        }
        deferred.resolve(rows);
      }
  );

  closeDatabase(db);

  return deferred.promise;
}

function getEstateDescription(estateId) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all('SELECT description FROM estates WHERE id=? LIMIT 1', [estateId], function (error, rows) {
    if (error !== null) {
      logError(error);
      deferred.reject(error);
      return;
    }
    if (rows.length < 1) {
      deferred.resolve(null);
      return;
    }
    deferred.resolve(rows[0].description);
  });

  closeDatabase(db);

  return deferred.promise;
}

function getEstateName(estateId) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all('SELECT name FROM estates WHERE id=? LIMIT 1', [estateId], function (error, rows) {
    if (error !== null) {
      logError(error);
      deferred.reject(error);
      return;
    }
    if (rows.length < 1) {
      deferred.resolve(null);
      return;
    }
    deferred.resolve(rows[0].name);
  });

  closeDatabase(db);

  return deferred.promise;
}

function getEstates() {

  var db = getDatabase();
  var deferred = q.defer();

  db.all('SELECT id, name FROM estates', [], function (error, rows) {
    if (error !== null) {
      logError(error);
      deferred.reject(error);
      return;
    }
    deferred.resolve(rows);
  });

  closeDatabase(db);

  return deferred.promise;
}

function getYears(estateId, categoryId) {

  var db = getDatabase();
  var deferred = q.defer();

  db.all(
    'SELECT DISTINCT strftime("%Y", date) AS year FROM readings WHERE id_estate=? AND id_category=? ORDER BY year DESC',
    [estateId, categoryId],
    function (error, rows) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
        return;
      }
      var i = 0;
      var result = [];
      for (i = 0; i < rows.length; i += 1) {
        result.push(rows[i].year);
      }
      deferred.resolve(result);
    }
  );

  closeDatabase(db);

  return deferred.promise;
}

function insertCategory(name, unit) {

  var db = getDatabase();

  var stmt = db.prepare('INSERT INTO categories (name, unit) VALUES (?, ?)');
  stmt.run(name, unit);
  stmt.finalize();

  closeDatabase(db);
}

function insertEstate(name) {

  var db = getDatabase();

  var stmt = db.prepare('INSERT INTO estates (name) VALUES (?)');
  stmt.run(name);
  stmt.finalize();

  closeDatabase(db);
}

function insertReading(estateId, categoryId, value, date, note) {

  var db = getDatabase();
  var deferred = q.defer();

  var timePosted = new Date().format('YYYY-MM-DD hh:mm:ss');

  var stmt = db.prepare(
    'INSERT INTO readings'
      + ' (id_estate, id_category, value, date, note, time_posted)'
      + ' VALUES (?, ?, ?, ?, ?, ?)'
  );
  stmt.run(
    estateId,
    categoryId,
    value,
    date,
    note,
    timePosted,
    function (error) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }
  );
  stmt.finalize();

  closeDatabase(db);

  return deferred.promise;
}

function insertReadingRevision(id, reading) {

  var db = getDatabase();
  var deferred = q.defer();

  var stmt = db.prepare(
    'INSERT INTO reading_revisions'
      + ' (id_reading, value, date, note, time_posted)'
      + ' VALUES (?, ?, ?, ?, ?)'
  );
  stmt.run(
    id,
    reading.value,
    reading.date,
    reading.note,
    reading.time_posted,
    function (error) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }
  );
  stmt.finalize();

  closeDatabase(db);

  return deferred.promise;
}

function setLogger(pLogger) {

  logger = pLogger;
}

function updateReading(id, newValue, newDate, newNote) {

  var db = getDatabase();
  var deferred = q.defer();

  var timePosted = new Date().format('YYYY-MM-DD hh:mm:ss');

  var stmt = db.prepare('UPDATE readings SET value=?, date=?, note=?, time_posted=? WHERE id=?');
  stmt.run(
    newValue,
    newDate,
    newNote,
    timePosted,
    id,
    function (error) {
      if (error !== null) {
        logError(error);
        deferred.reject(error);
      } else {
        deferred.resolve();
      }
    }
  );
  stmt.finalize();

  closeDatabase(db);

  return deferred.promise;
}

function createReadingRevision(id, newValue, newDate, newNote) {

  var db = new sqlite3.Database(databasePath);
  setDatabase(db);

  db.run('BEGIN');

  return getReading(id)
    .then(function (reading) {

      return insertReadingRevision(id, reading);
    })
    .then(function () {

      return updateReading(id, newValue, newDate, newNote);
    })
    .then(function () {

      db.run('COMMIT');
      db.close();
      setDatabase(null);

      return q.when(null);
    })
    .catch(function (error) {

      db.run('ROLLBACK');
      db.close();
      setDatabase(null);

      return q.when(error);
    });
}

/*******************************************************************************************************************//**
 * Exports.
 **********************************************************************************************************************/

module.exports = function Dal(pDatabasePath) {

  databasePath = pDatabasePath;

  return {
    create : create,
    createReadingRevision : createReadingRevision,
    executeSerial : executeSerial,
    getCategories : getCategories,
    getCategory : getCategory,
    getEstateDescription : getEstateDescription,
    getEstateName : getEstateName,
    getEstates : getEstates,
    getReading : getReading,
    getReadings : getReadings,
    getReadingsFor2Years : getReadingsFor2Years,
    getYears : getYears,
    insertCategory : insertCategory,
    insertReading : insertReading,
    insertEstate : insertEstate,
    setLogger : setLogger
  };
};
