var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var plus = google.plus('v1');
var User = require('../models/user.js');
var Record = require('../models/record.js');
var UrlHelper = require('../helpers/url_helper.js');

// Redirect raw to PWA
router.get('/', function(req, res, next) {
  return res.redirect((process.env.NODE_ENV == 'development' ? 'http://' : 'https://') +
  process.env.HOST_FRONTFLIP +
  '/' +
  req.getLocale() +
  '/' +
  res.locals.organisation.tag
  );
});

// Redirect search  to PWA (duplicate previous)
router.get('/search/:query?', function(req, res, next) {
  return res.redirect((process.env.NODE_ENV == 'development' ? 'http://' : 'https://') +
  process.env.HOST_FRONTFLIP +
  '/' +
  req.getLocale() +
  '/' +
  res.locals.organisation.tag
  );
});

router.use('/oldsearch/:query?', function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }
  return next();
});

router.get('/oldsearch/:query?', function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  res.locals.canInvite = res.locals.organisation.canInvite && res.locals.user && res.locals.user.belongsToOrganisation(res.locals.organisation._id);
  res.locals.qrcode = false;

  if(['quecbio', 'demo'].includes(res.locals.organisation.tag)) res.locals.isPublic = true; // useless condition because organisation.public is set ??

  res.render('search', {bodyClass: 'search', search: true, searchInput: true, searchQuery: req.params.query});
});

router.get('/stickers/:query?', function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  res.locals.canInvite = res.locals.organisation.canInvite && res.locals.user && res.locals.user.belongsToOrganisation(res.locals.organisation._id);
  res.locals.qrcode = true;

  res.render('search', {bodyClass: 'search', layout: 'print_layout', search: true, searchInput: true, searchQuery: req.params.query});
});

router.get('/account', function(req, res, next) {
  if (req.query.json) {
    return res.json(res.locals.user);
  } else {
    res.render('index',
      {
        title : res.__('Your Account Data'),
        details: res.__('You will find below ALL the Data we have about you'),
        content: res.locals.user
      }
    );
  }
});

router.get('/cookies', function(req, res, next) {
    res.render('index',
      {
        title : res.__('Your Cookies Data'),
        details: res.__('You will find below ALL the Cookies we have on your device'),
        content: req.cookies
      }
    );
});

router.get('/leave', function(req, res, next) {
  res.locals.user.detachOrg(res.locals.organisation._id, function(err, user) {
    res.redirect(UrlHelper.makeUrl());
  });
});

router.get('/toggleMonthly', function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }
  res.locals.user.toggleMonthly(res.locals.organisation._id, function(err, user) {
    if (err) return next(err);
    var title = res.__('Monthly email deactivated for {{organisationName}}', {organisationName: res.locals.organisation.name});
    var details = res.__('You will no longer receive the monthly information emails about your coworkers, your organisation and Wingzy.');
    if (user.getMonthly(res.locals.organisation._id)) {
      title = res.__('Monthly email activated for {{organisationName}}', {organisationName: res.locals.organisation.name});
      details = res.__('You will now receive the monthly information emails about your coworkers, your organisation and Wingzy.');
    }
    res.render('index',
      {
        title: title,
        details: details
      }
    );
  });
});

module.exports = router;
