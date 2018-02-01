var express = require('express');
var router = express.Router();
var User = require('../models/user.js');
var undefsafe = require('undefsafe');
var UrlHelper = require('../helpers/url_helper.js');

// Simple easy logout
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    return res.redirect(new UrlHelper(req.organisationTag, null, null, req.getLocale()).getUrl());
  });
});

// Generic login page
//@todo deduplicate the /login logic found in auth.js and email_auth.js
router.use('/login', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'email/login/', null, req.getLocale()).getUrl();
  return next();
});

router.get('/login', function(req, res, next) {
  res.render('home/signin', {layout: 'home/layout_home', bodyClass: 'home signin', signinText: 'login'});
});

// Catch all login callbacks and touch the user
router.get('*/login/callback', function(req, res, next) {
  if (!req.session.user) {
    err = new Error('Authentification failed');
    err.status = 500;
    return next(err);
  }
  req.session.user.touchLogin(function(err) {
    if (err) return console.error(err);
    return next();
  });
});

// Setup User depending on Auth
router.use(function(req, res, next) {
  if (req.session.user) {
    // @todo move to user model
    User.findByIdAndUpdate(req.session.user._id, {last_action: Date.now()})
    .populate('orgsAndRecords.record')
    .populate('orgsAndRecords.organisation', 'name picture tag')
    .exec(function(err, user) {
      if (err) return next(err);
      req.session.user = user;
      res.locals.user = req.session.user;
      return next();
    });
  } else {
    res.locals.user = false;
    return next();
  }
});

// Setup impersonator if there is one
router.use(function(req, res, next) {
  if (req.session.impersonator) {
    res.locals.impersonator = req.session.impersonator;
  }
  return next();
});

module.exports = router;
