var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');
var parseDomain = require('parse-domain');

var User = require('../models/user.js');
var Record = require('../models/record.js');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var UrlHelper = require('../helpers/url_helper.js');
var EmailUser = require('../models/email/email_user.js');
var FullContact = require('../models/fullcontact/fullcontact.js');


// First we check there is an organisation.
// If there is an org, we now the user belongs there from restrict.js
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 400;
    return next(err);
  }
  res.locals.errors = [];
  return next();
});

// Get the record
router.use(function(req, res, next) {
  var myRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
  if (!myRecordId) return next();

  Record.findById(myRecordId).populate('within').exec(function(err, record) {
    if (err) return next(err);
    if (!record) {
      //@todo we could throw an error, but it's better to create a new record for the user
      return next();
    }
    res.locals.record = record;
    return next();
  });
});

// No Record ? If the user is logged in with Google, we have a chance to find the record by Google Id
var GoogleRecord = require('../models/google/google_record.js');
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  if (!undefsafe(res.locals.user, 'google.id')) return next();

  GoogleRecord.getByGoogleId(res.locals.user.google.id, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    res.locals.record = record;
    res.locals.user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
      if (err) return next(err);
      return next();
    });
  });

});

// No Record ? If the user is looged in with Google, we can create one with Google Plus
// @todo do the same to enrich existing record with google plus profile
var googlePlus = require('../models/google/google_plus.js');
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  if (!req.googleOAuth) return next();
  var plus = new googlePlus(req.googleOAuth);

  plus.getRecord(res.locals.organisation._id, function(err, record) {
    record.save(function(err, record) {
      if (err) return next(err);
      res.locals.record = record;
      res.locals.user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
        if (err) return next(err);
        return next();
      });
    });
  });
});

// No Record ? Last Chance, we always have a login email to create a record from :)
router.use(function(req, res, next) {
  if (res.locals.record) return next();

  let record = Record.makeFromEmail(res.locals.user.loginEmail, res.locals.organisation._id);
  record.save(function(err, record) {
    if (err) return next(err);
    res.locals.record = record;
    res.locals.user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
      if (err) return next(err);
      return next();
    });
  });
});

// Finally if we get here, there's something wrong somewhere.
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  var err = new Error('No record found');
  err.status = 400;
  return next(err);
});

router.use(function(req, res, next) {
  res.locals.onboard = {
    introAction: new UrlHelper(req.organisationTag, 'onboard/intro', null, req.getLocale()).getUrl(),
    tagsAction: new UrlHelper(req.organisationTag, 'onboard/tags', null, req.getLocale()).getUrl(),
    linksAction: new UrlHelper(req.organisationTag, 'onboard/links', null, req.getLocale()).getUrl()
  };
  next();
});

//@todo record the datetime of clic on "I am ready" on the welcome page to validate tos
router.get('/welcome', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'onboard/intro', null, req.getLocale()).getUrl();
  res.render('onboard_welcome');
  next();
});

// We try our luck with fullcontact to help user fill her profile.
// That can be done after rendering the page ;)
router.use('/welcome', function(req, res, next) {
  var fullcontact = new FullContact(res.locals.record);
  fullcontact.enrich(function(err, record) {
    if (err) {
      if (err.status === 418) return console.log(err.message);
      else return console.error(err);
    }
    res.locals.record = record;
  });
});

// On post we always expect an _id field matching the record for the current user/organisation
router.post('/:context/:recordId?', function(req, res, next) {
  if (req.body._id != res.locals.record._id) {
    err = new Error('Record Mismatch');
    err.status = 500;
    return next(err);
  }
  return next();
});


// Here we provide the action url to the view.
router.use('/intro', function(req, res, next) {
  res.locals.onboard.step = "intro";
  res.locals.onboard.intro = true;
  res.render('onboard_intro');
});


// Load the whole organisation records, we'll need those for further use
// Duplicate in google_admin && fullcontact_admin && record_admin
// @todo this is such a bad idea. But makeWithin and makeIncludes require that at the moment
router.post('*', function(req, res, next) {
  if (res.locals.organisation.records) return next();
  res.locals.organisation.populateRecords(function(err, organisation) {
    if (err) return next(err);
    else return next();
  });
});

module.exports = router;
