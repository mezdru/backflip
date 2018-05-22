var express = require('express');
var router = express.Router();

var Record = require('../models/record.js');
var UrlHelper = require('../helpers/url_helper.js');
var undefsafe = require('undefsafe');

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
  Record.findOneWithDeleted({_id:req.params.id, organisation:res.locals.organisation._id}, function(err, record) {
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
    res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
    return next();
  } else {
    let err = new Error('Forbidden Record');
    err.status = 403;
    return next(err);
  }
});

router.get('/id/:id', function(req, res, next) {
  res.locals.record.delete(res.locals.user._id, function(err) {
    if (err) return next(err);
    res.render('index', {
      title: req.__('Profile Suspended'),
      details: req.__('Your Profile {{profileName}} in the Organisation {{organisationName}} has been suspended. The following data cannot be used anymore and will be deleted within 1 year.',
        {
          profileName: res.locals.record.name,
          organisationName: res.locals.organisation.name
        }
      ),
      content: res.locals.record
    });
  });
});

module.exports = router;
