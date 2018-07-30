var express = require('express');
var router = express.Router();
var User = require('../models/user.js');
var undefsafe = require('undefsafe');
var UrlHelper = require('../helpers/url_helper.js');

// Simple easy logout
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    return res.redirect(UrlHelper.makeUrl(req.organisationTag, null, null, req.getLocale()));
  });
});

router.use(function(req, res, next) {
  res.locals.googleSigninUrl = new UrlHelper(req.organisationTag, 'google/login',  req.query.code ? '?code='+req.query.code : null, req.getLocale()).getUrl();
  res.locals.emailSigninUrl = new UrlHelper(req.organisationTag, 'email/login/', req.query.code ? '?code='+req.query.code : null, req.getLocale()).getUrl();
  next();
});

router.get('/login', function(req, res, next) {
  var googleSignin, emailSignin;
  if (res.locals.organisation && res.locals.organisation.public !== true) {
    googleSignin = res.locals.organisation.canGoogleSignin();
    emailSignin = res.locals.organisation.canEmailSignin();
  }
  if (!googleSignin && !emailSignin) {
    googleSignin = true;
    emailSignin = true;
  }

  res.render('signin', {bodyClass: 'signin', googleSignin: googleSignin, emailSignin: emailSignin});
});

// Setup User depending on Auth
//@todo avoid re-fetching the user on login
router.use(function(req, res, next) {
  if (req.session.user) {
    // @todo move to user model
    User.findByIdAndUpdate(req.session.user._id, {last_action: Date.now()})
    .populate('orgsAndRecords.record', 'name picture tag')
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


var google = require('googleapis');
// Create Google OAuth2 Client for everyone
// Populate with tokens if available
// @todo deduplicate this code (also in google_auth.js)
router.use(function(req, res, next) {
  if (undefsafe(req.session, 'user.google.tokens')) {
    req.googleOAuth = req.googleOAuth || new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      process.env.GOOGLE_REDIRECT_URI
    );
    req.googleOAuth.setCredentials(req.session.user.google.tokens);
  }
  return next();
});

// Setup impersonator if there is one
router.use(function(req, res, next) {
  if (req.session.impersonator) {
    res.locals.impersonator = req.session.impersonator;
  }
  return next();
});

module.exports = router;
