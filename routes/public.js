var express = require('express');
var router = express.Router();

var undefsafe = require('undefsafe');

var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var Application = require('../models/application.js');
var UrlHelper = require('../helpers/url_helper.js');

router.get('/', function(req, res, next) {
  if (res.locals.organisation) {
    return next();
  } else {
    res.render('home/home', {bodyClass: 'home', googleSignin: true, emailSignin: true, home: true});
  }
});

router.get('/product', function(req, res, next) {
  res.redirect(UrlHelper.makeUrl(null, null, null, req.getLocale()));
});

router.get('/why', function(req, res, next) {
  res.redirect(UrlHelper.makeUrl(null, null, null, req.getLocale()));
});

router.get('/pricing', function(req, res, next) {
  res.redirect(UrlHelper.makeUrl(null, null, null, req.getLocale()));
});

router.get('/privacy', function(req, res, next) {
  res.render('home/privacy', {bodyClass: 'home privacy', home: true});
});

router.get('/terms', function(req, res, next) {
  res.render('home/privacy', {bodyClass: 'home privacy', home: true});
});

router.get('/security', function(req, res, next) {
  res.render('home/privacy', {bodyClass: 'home privacy', home: true});
});

router.get('/cheers', function(req, res, next) {
  res.render('home/cheers', {bodyClass: 'home cheers', email: undefsafe(res.locals, 'user.loginEmail') || '', home: true});
});


module.exports = router;
