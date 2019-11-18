var express = require('express');
var router = express.Router();

var Record = require('../models/record.js');
var UrlHelper = require('../helpers/url_helper.js');
var undefsafe = require('undefsafe');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');


const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

//@todo "about" is still called "description" in the record model
//@todo trash this code

// First we check there is an organisation.
// If there is an org, we now the user belongs there from restrict.js
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }
  return next();
});

router.use('/id/:id', function(req, res, next) {
  Record.findById(req.params.id, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      let error = new Error('Profile not found');
      error.status = 404;
      return next(error);
    }
    res.locals.record = record;
    next();
  });
});

//@todo deduplicate in profile.js and onboard.js
router.use(function(req, res, next) {
  if (res.locals.user.ownsRecord(res.locals.record._id) ||
    res.locals.user.isAdminToOrganisation(res.locals.organisation._id) ||
    res.locals.user.isSuperAdmin()) {
    return next();
  } else {
    let err = new Error('Forbidden Record');
    err.status = 403;
    return next(err);
  }
});

router.use(function(req, res, next) {
  res.locals.aboutAction = UrlHelper.makeUrl(req.organisationTag, 'about/id/'+res.locals.record._id, null, req.getLocale());
  res.locals.backUrl = UrlHelper.makeUrl(req.organisationTag, 'profile/'+res.locals.record.tag, null, req.getLocale());
  res.locals.coverUrl = undefsafe(res.locals.record, 'cover.url') || undefsafe(res.locals.organisation, 'cover.url') || true;
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  return next();
});

// On post we always expect an _id field matching the record for the current user/organisation
router.post('*', function(req, res, next) {
  if (!res.locals.record._id.equals(req.body._id)) {
    err = new Error('Record Mismatch');
    err.status = 403;
    return next(err);
  }
  return next();
});

router.post('/id/:id',
  sanitizeBody('about').trim().escape().stripLow(true),
  sanitizeBody('about').customSanitizer(value => {
    return value.substr(0, 16384);
  })
);

router.post('/id/:id',
  body('about').isLength({ max: 16384 }).withMessage((value, {req}) => {
    return req.__('Please write an intro no larger than 16384 characters.');
  })
);

// Load the whole organisation records, we'll need those for further use
// Duplicate in google_admin  && record_admin
// @todo this is such a bad idea. But makeWithin and makeIncludes require that at the moment
router.post('/id/:id', function(req, res, next) {
  if (res.locals.organisation.records) return next();
  res.locals.organisation.populateRecords(function(err, organisation) {
    if (err) return next(err);
    else return next();
  });
});

router.post('/id/:id', function(req, res, next) {
  res.locals.record.description = req.body.about;
  var errors = validationResult(req);
  res.locals.errors = errors.array();
  if (errors.isEmpty()) {
      res.locals.record.save(function(err, record) {
        if(err) return next(err);
        res.redirect(res.locals.backUrl);
      });
  } else next();
});

router.all('/id/:id', function(req, res, next) {
  res.render('about', { bodyClass: 'about-edit'});
});

module.exports = router;
