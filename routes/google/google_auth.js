/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 10:50
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var google = require('googleapis');
var scopes = require('./scopes.json');

var User = require('../../models/user.js');
var GoogleUser = require('../../models/google/google_user.js');
var Organisation = require('../../models/google/google_organisation.js');


// Create Google OAuth2 Client for everyone
// Populate with tokens if available
router.use(function(req, res, next) {
  req.googleOAuth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  if (undefsafe(req.session, 'user.google.tokens')) {
    req.googleOAuth.setCredentials(req.session.user.google.tokens);
  }
  return next();
});

// Login redirection to Google login
// No Auth for that
router.get('/login', function(req, res, next) {
  url = req.googleOAuth.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  res.redirect(url);
});

// Login redirection from Google login
router.get('/login/callback', function(req, res, next) {
  req.googleOAuth.getToken(req.query.code, function(err, tokens) {
    if (err) return next(err);
    GoogleUser.getByTokens(tokens, req.googleOAuth, function(err, user) {
      if (err) return next(err);
      // we want the old refresh token and the new access & id tokens
      Object.assign(user.google.tokens, tokens);
      // update session with user credentials
      req.session.user = user;
      user.touchLogin(function(err) {
        if (err) return console.error(err);
      });
      if (user.needsWelcoming()) return res.redirect('/welcome');
      else return res.redirect(req.session.redirect_after_login || '/');
    });
  });
});

module.exports = router;
