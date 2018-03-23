var express = require('express');
var router = express.Router();

var Record = require('../models/record.js');

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

// Get the record
router.get('/:tag', function(req, res, next) {
  Record.findByTag(req.params.tag, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      var error = new Error('Profile not found');
      error.status = 404;
      return next(error);
    }
    res.locals.record = record;
    next();
  });
});

router.get('/id/:id', function(req, res, next) {
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

router.get('*', function(req, res, next) {
  if (res.locals.user.ownsRecord(res.locals.record._id) ||
    res.locals.user.isAdminToOrganisation(res.locals.organisation._id)
  ) {
    res.locals.canEdit = true;
  }
  next();
});

router.get('*', function(req, res, next) {
  if (res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
    res.locals.canDelete = true;
  }
  next();
});

router.get('*', function(req, res, next) {
  res.render('profile', {
    title: res.locals.record.name,
    bodyClass: 'profile'
  });
});

module.exports = router;
