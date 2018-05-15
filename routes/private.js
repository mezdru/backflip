var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var plus = google.plus('v1');
var User = require('../models/user.js');
var Record = require('../models/record.js');
var UrlHelper = require('../helpers/url_helper.js');

router.get('/google/app', function(req, res, next) {
  plus.people.get({userId: 'me', auth: req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    return res.render('index', {title: 'You are', content: ans});
  });
});

router.get('/', function(req, res, next) {
  res.redirect(UrlHelper.makeUrl(res.locals.organisation.tag, 'search', null, req.getLocale()));
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
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  res.locals.canInvite = res.locals.organisation.canInvite;
  res.render('search', {bodyClass: 'search', search: true, searchInput: true, searchQuery: req.params.query});
});

router.get('/leave', function(req, res, next) {
  res.locals.user.detachOrg(res.locals.organisation._id, function(err, user) {
    res.redirect(UrlHelper.makeUrl());
  });
});

module.exports = router;
