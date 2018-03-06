var express = require('express');
var router = express.Router();

var Record = require('../../models/record.js');
var FullContact = require('../../models/fullcontact/fullcontact.js');

router.get('/enrich/:recordId', function (req, res, next) {
  Record.findById(req.params.recordId, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
       err = new Error('No record found');
       err.status = 400;
       return next(err);
    }
    if (!record.organisation.equals(res.locals.organisation._id)) {
       err = new Error('Record not in this organisation');
       err.status = 403;
       return next(err);
    }
    fullContact = new FullContact(record);
    fullContact.enrich(function(err, record){
      if (err) return next(err);
      res.render('index',
      {
        title: 'Enrich Record',
        details: 'The Record has been enriched with FullContact',
        content: record
      });
    });
  });
});

// Load the whole organisation records, we'll need those for further use
// Duplicate in google_admin && fullcontact_admin && record_admin
// @todo this is such a bad idea. But makeWithin and makeIncludes require that at the moment
router.use(function(req, res, next) {
  if (res.locals.organisation.records) return next();
  Record.find({organisation: res.locals.organisation._id})
  .exec(function(err, records) {
    if (err) return next(err);
    res.locals.organisation.records = records;
    return next();
  });
});

router.get('/enrichable', function(req, res, next) {
  var enrichable = res.locals.organisation.records.filter(record => !record.fullcontact_updated);
  res.render('admin/enrichable',
  {
    title: 'Enrichable Records',
    details: `${enrichable.length} out of ${res.locals.organisation.records.length} Records could be enriched`,
    content: enrichable
  });
});

router.get('/enrichall', function(req, res, next) {
  var results = [];
  res.locals.organisation.records.forEach(function(record) {
    fullContact = new FullContact(record);
    fullContact.enrich(function(err, savedRecord) {
      if (err) results.push({name: record.name, msg: err.message});
      else results.push({name: record.name, msg: 'Enriched'});
      if (results.length === res.locals.organisation.records.length) {
        enrichedLength = results.filter(result => result.msg === 'Enriched').length;
        res.render('index',
        {
          title: 'Enrich Records',
          details: `${enrichedLength} out of ${results.length} Record has been enriched with FullContact`,
          content: results
        });
      }
    });
  });
});

 module.exports = router;
