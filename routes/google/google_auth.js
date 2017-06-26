/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 26-06-2017 12:55
* @Copyright: Clément Dietschy 2017
*/

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
    scope: scopes
  });
  if (res.locals.organisation) req.session.redirect_after_login_tag = res.locals.organisation.tag;
  res.redirect(url);
});

// Login redirection to Google login for Admins (larger oatuh scopes)
router.get('/admin_login', function(req, res, next) {
  url = req.googleOAuth.generateAuthUrl({
    access_type: 'offline',
    scope: admin_scopes
  });
  res.redirect(url);
});

// Login redirection from Google login
router.get('/login/callback', function(req, res, next) {
  if (req.query.error == 'access_denied') {
    console.log("OAUTH - ACCESS DENIED (someone clicked CANCEL on the google authorization screen)");
    return res.redirect(req.session.redirect_after_login || '/');
  }
  req.googleOAuth.getToken(req.query.code, function(err, tokens) {
    if (err) return next(err);
    GoogleUser.getByTokens(tokens, req.googleOAuth, function(err, user) {
      if (err) return next(err);
      // we want the old refresh token and the new access & id tokens
      user.google.tokens = Object.assign(user.google.tokens, tokens);
      // update session with user credentials
      req.session.user = user;
      user.touchLogin(function(err) {
        if (err) return console.error(err);
      });
      if (req.session.redirect_after_login_tag && req.session.redirect_after_login_tag != 'demo') {
        return res.redirect(new UrlHelper(req.session.redirect_after_login_tag).getUrl());
      }
      // we don't have session info about redirect, so we guess...
      var firstOrgId = user.getFirstOrgId();
      if (firstOrgId) {
        Organisation.findById(firstOrgId, 'tag', function(err, organisation) {
          if(err) return next(err);
          res.redirect(new UrlHelper(organisation.tag).getUrl());
        });
      } else {
        return res.redirect(new UrlHelper(null, 'welcome').getUrl());
      }
    });
  });
});

module.exports = router;
