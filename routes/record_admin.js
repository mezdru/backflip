/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 03:56
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var User = require('../models/user.js');
var Record = require('../models/record.js');
var RecordCollection = require('../helpers/record_collection.js');
var RecordObjectCSVHelper = require('../helpers/record_csv_helper.js');
var csv = require('csv-express');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({storage: storage});
var csvtojson = require('csvtojson');

// Load the whole organisation records, we'll need those for further use
router.use(function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.locals.organisation.records = records;
    return next();
  });
});

router.get('/clear', function(req, res, next) {
  Record.delete({organisation: res.locals.organisation._id}, res.locals.user._id, function(err, result) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Records have been cleared',
        details: 'This function does not remove from algolia. Use admin/algolia/clear to clear Algolia.',
        content: result
      }
    );
  });
});

router.get('/resync', function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    var countdown = records.length;
    var countup = 0;
    records.forEach(function (record) {
      record.updateWithin(res.locals.organisation.tree, function(err, record) {
        if(err) return next(err);
        record.save(function(err, record, numAffected) {
          countup += numAffected;
          countdown--;
          if (err) next(err);
          if (countdown === 0) {
            res.render('index',
              {
                title: 'Records have been resynced',
                details: `${countup} of ${records.length} Records have been retrieved & resaved`,
                content: records
              }
            );
          }
        });
      });
    });
  });
});

router.get('/delete/:recordId', function(req, res, next) {
  Record.findOneWithDeleted({_id:req.params.recordId}, function(err, record) {
    if (err) return next(err);
    if (!record) {
      err = new Error('No record to delete');
      err.status = 500;
      return next(err);
    }
    record.delete(res.locals.user._id, function(err) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Record has been deleted',
          details: `You deleted the record ${record._id}`,
          content: record
        }
      );
    });
  });
});

router.get('/csv', function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.setHeader('Content-disposition', `attachment; filename=${res.locals.organisation.tag}.csv`);
    res.csv(RecordObjectCSVHelper.getCSVfromRecords(records));
  });
});

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/upload', function(req, res, next) {
  res.locals.formAction = '/admin/records/csv/upload';
  if (req.app.get('env') === 'development') res.locals.formAction = '/admin/records/csv/upload/?subdomains=' + req.query.subdomains;
  return next();
});

router.get('/upload', function(req, res, next) {
  res.render('upload',
    {
      title: `Update ${res.locals.organisation.tag} by CSV`,
      details: `Upload a CSV file to <strong>overwrite</strong> all records from ${res.locals.organisation.tag}`,
    });
});

router.post('/upload', upload.single('file'), function(req, res, next) {
  var csvLinesAsJson = [];
  var collection = new RecordCollection(res.locals.organisation);
  csvtojson()
    .fromString(req.file.buffer.toString())
    .on('json', function(csvLineAsJson) {
      csvLinesAsJson.push(csvLineAsJson);
      collection.add(csvLineAsJson);
      /*Record.importRecordFromCsvLineAsJson(csvLineAsJson, res.locals.organisation._id, res.locals.organisation.tree, res.locals.user._id, function(err, record) {
        if (err) console.error(err);
      });*/
    })
    //@todo this is very wrong, we provide fake output instead of waiting for the real result
    .on('done', function(err) {
      console.log(collection.records);
      if (err) next(err);
      res.render('update_csv',
        {
          delete: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'delete';}),
          create: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'create';}),
          overwrite: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'overwrite';}),
          update: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'update';}),
          keep: csvLinesAsJson.filter(csvLineAsJson => {return csvLineAsJson.action == 'keep';}),
        });
    });
});

function logMemory() {
  mem = process.memoryUsage();
  console.log(`RSS ${bToMB(mem.rss)}MB, HEAP ${Math.round(100*mem.heapUsed/mem.heapTotal)}% of ${bToMB(mem.heapTotal)}MB, EXT ${bToMB(mem.external)}MB`);
}

function bToMB(b) {
  return Math.round(b/1024/1024, -2);
}



module.exports = router;
