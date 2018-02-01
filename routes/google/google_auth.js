var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var google = require('googleapis');
const scopes = require('./scopes.json');
const admin_scopes = require('./admin_scopes.json');

var User = require('../../models/user.js');
var Organisation = require('../../models/organisation.js');

var GoogleUser = require('../../models/google/google_user.js');

var UrlHelper = require('../../helpers/url_helper.js');


// Create Google OAuth2 Client for everyone
// Populate with tokens if available
// @todo deduplicate this code (also in admin.js)
// @todo the oauth2client generated can be set as a global auth option to be used everywhere...
router.use(function(req, res, next) {
  req.googleOAuth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (undefsafe(req.session, 'user.google.tokens')) {
    req.googleOAuth.setCredentials(req.session.user.google.tokens);
    google.options({
      auth: req.googleOAuth
    });
  }
  return next();
});

// Login redirection to Google login
// No Auth for that
router.get('/login', function(req, res, next) {
  url = req.googleOAuth.generateAuthUrl({
    access_type: 'offline',
    scope: scopes,
    state: req.organisationTag
  });
  req.session.locale = req.getLocale();
  return res.redirect(url);
});

// Login redirection to Google login for Admins (larger oatuh scopes)
router.get('/admin_login', function(req, res, next) {
  url = req.googleOAuth.generateAuthUrl({
    access_type: 'offline',
    scope: admin_scopes,
    state: req.organisationTag
  });
  return res.redirect(url);
});

// Login redirection from Google login
router.get('/login/callback', function(req, res, next) {
  if (req.query.error == 'access_denied') {
    console.log("OAUTH - ACCESS DENIED (someone clicked CANCEL on the google authorization screen)");
    //@todo create a page to explain the authorization we ask on the google login screen
    return res.redirect('/');
  }
  req.redirectionTag = req.query.state;
  req.googleOAuth.getToken(req.query.code, function(err, tokens) {
    if (err) return next(err);
    GoogleUser.getByTokens(tokens, req.googleOAuth, function(err, user) {
      if (err) return next(err);
      // we want the old refresh token and the new access & id tokens
      user.google.tokens = Object.assign(user.google.tokens, tokens);
      // update session with user credentials
      req.session.user = user;
      return next();
    });
  });
});

module.exports = router;
