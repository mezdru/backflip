var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var plus = google.plus('v1');
var User = require('../models/user.js');
var Record = require('../models/record.js');

router.get('/google/app', function(req, res, next) {
  plus.people.get({userId: 'me', auth: req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    return res.render('index', {title: 'You are', content: ans});
  });
});

router.get('/', function(req, res, next) {
  res.redirect('/search');
});

router.use('/search/:query?', function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }
  return next();
});

router.get('/search/:query?', function(req, res, next) {
  //@todo deduplicate these next 10 lines with private.js / public.js
  res.locals.isProduction = req.app.get('env') == 'production';
  res.locals.isAdmin = res.locals.user.isAdminToOrganisation(res.locals.organisation._id);
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  res.render('search', {bodyClass: 'search', search: true, searchInput: true, searchQuery: req.params.query});
});

module.exports = router;
