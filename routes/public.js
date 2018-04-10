var express = require('express');
var router = express.Router();

var undefsafe = require('undefsafe');

var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var Application = require('../models/application.js');
var UrlHelper = require('../helpers/url_helper.js');

/* GET homepage depending on context */
router.get('/', function(req, res, next) {
  if (res.locals.organisation) {
    if (res.locals.organisation.public === true) {
      res.redirect(UrlHelper.makeUrl(res.locals.organisation.tag, 'search', null, req.getLocale()));
    } else if (!res.locals.user) {
      res.redirect(UrlHelper.makeUrl(res.locals.organisation.tag, 'login', null, req.getLocale()));
    } else {
      return next();
    }
  } else {
    res.render('home/home', {bodyClass: 'home', googleSignin: true, emailSignin: true, home: true});
  }
});


//@todo deduplicate with private.js / public.js
router.use('/search/:query?', function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }
  return next();
});

//@todo deduplicate with private.js / public.js
router.get('/search/:query?', function(req, res, next) {
  if (res.locals.organisation.public === true) {
    //@todo deduplicate with restrict.js
    if (res.locals.user) res.locals.isAdmin = res.locals.user.isAdminToOrganisation(res.locals.organisation._id);
    res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
    res.render('search', {bodyClass: 'search', search: true, searchInput: true, searchQuery: req.params.query});
  } else {
    next();
  }
});

router.get('/product', function(req, res, next) {
  res.redirect(UrlHelper.makeUrl(null, '#wings', null, req.getLocale()));
});

router.get('/why', function(req, res, next) {
  res.redirect(UrlHelper.makeUrl(null, '#wings', null, req.getLocale()));
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
