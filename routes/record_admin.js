var express = require('express');
var router = express.Router();

var User = require('../models/user.js');
var Record = require('../models/record.js');
var RecordFactory = require('../helpers/record_factory.js');
var RecordObjectCSVHelper = require('../helpers/record_object_csv_helper.js');
var csv = require('csv-express');
var multer = require('multer');
var storage = multer.memoryStorage();
var upload = multer({storage: storage});
var csvtojson = require('csvtojson');
var UrlHelper = require('../helpers/url_helper.js');


// Load the whole organisation records, we'll need those for further use
// Duplicate in google_admin && fullcontact_admin
// @todo this is such a bad idea. But makeWithin and makeIncludes require that at the moment
router.use(function(req, res, next) {
  if (res.locals.organisation.records) return next();
  res.locals.organisation.populateRecords(function(err, organisation) {
    if (err) return next(err);
    else return next();
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

//@todo Fix pyramid of death, async fail & performance issues.
router.get('/remake', function(req, res, next) {
  res.locals.organisation.records.forEach( function(record) {
    record.makeWithin(res.locals.organisation);
  });
  var countdown = res.locals.organisation.records.length;
  var countup = 0;
  res.locals.organisation.records.forEach (function (record) {
    record.makeStructure(res.locals.organisation);
    record.makeIncludes(res.locals.organisation);
    record.save(function(err, record, numAffected) {
      countup += numAffected;
      countdown--;
      if (err) console.error(err);
      if (countdown === 0) {
        logMemory(`Remake by ${res.locals.user._id}`);
        res.render('index',
          {
            title: 'Records have been remade',
            details: `${countup} of ${res.locals.organisation.records.length} Records have been retrieved & remade & resaved`,
            content: res.locals.organisation.records
          }
        );
      }
    });
  });
});

//@todo Fix pyramid of death, async fail & performance issues.
router.get('/remakeTags', function(req, res, next) {
  var countdown = res.locals.organisation.records.length;
  var countup = 0;
  res.locals.organisation.records.forEach (function (record) {
    record.makeTag();
    record.save(function(err, record, numAffected) {
      countup += numAffected;
      countdown--;
      if (err) console.error(err);
      if (countdown === 0) {
        logMemory(`RemakeTag by ${res.locals.user._id}`);
        res.render('index',
          {
            title: 'Records Tags have been remade',
            details: `${countup} of ${res.locals.organisation.records.length} Records Tags have been remade`,
            content: res.locals.organisation.records
          }
        );
      }
    });
  });
});

//@todo Fix pyramid of death, async fail & performance issues.
router.get('/remakeTeams', function(req, res, next) {
  var countdown = res.locals.organisation.records.length;
  var countup = 0;
  res.locals.organisation.records.forEach (function (record) {
    record.makeTeamIntoHashtags();
    record.save(function(err, record, numAffected) {
      countup += numAffected;
      countdown--;
      if (err) console.error(err);
      if (countdown === 0) {
        logMemory(`Make Team Into Hashatags by ${res.locals.user._id}`);
        res.render('index',
          {
            title: 'Teams have been made Hashtags',
            details: `${countup} of ${res.locals.organisation.records.length} records have been transformed.`,
            content: res.locals.organisation.records
          }
        );
      }
    });
  });
});

router.get('/delete/:recordId', function(req, res, next) {
  Record.findOneWithDeleted({_id:req.params.recordId, organisation:res.locals.organisation._id}, function(err, record) {
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
    res.csv(RecordObjectCSVHelper.makeCSVsfromRecords(records));
  });
});

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/upload', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'admin/record/upload', null, req.getLocale()).getUrl();
  return next();
});

router.get('/upload', function(req, res, next) {
  res.render('admin/upload',
    {
      title: `Update ${res.locals.organisation.tag} by CSV`,
      details: `Upload a CSV file to update all records from ${res.locals.organisation.tag}`,
    });
});

router.post('/upload', upload.single('file'), function(req, res, next) {
  var factory = new RecordFactory(res.locals.organisation, res.locals.user);
  csvtojson()
    .fromString(req.file.buffer.toString())
    .on('json', function(csvLineAsJson) {
      factory.inputObject(RecordObjectCSVHelper.makeRecordObjectfromCSV(csvLineAsJson, res.locals.organisation._id));
    })
    //@todo this is very wrong, we provide fake output instead of waiting for the real result
    .on('done', function(err) {
      if (err) next(err);
      factory.makeOutput();
      factory.saveOutput(function(err, result) {
        if (err) return next(err);
        logMemory(`Upload by ${res.locals.user._id}`);
        res.render('admin/update_csv',
          {
            created: result.created,
            updated: result.updated,
            deleted: result.deleted,
            errors: result.errors
          });
        });
      });
});

function logMemory(details) {
  mem = process.memoryUsage();
  console.log(`RSS ${bToMB(mem.rss)}MB, HEAP ${Math.round(100*mem.heapUsed/mem.heapTotal)}% of ${bToMB(mem.heapTotal)}MB, EXT ${bToMB(mem.external)}MB. ${details}`);
}

function bToMB(b) {
  return Math.round(b/1024/1024, -2);
}



module.exports = router;
