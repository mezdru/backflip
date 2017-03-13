var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var google = require('googleapis');
var secrets = require('../../secrets.json');
var scopes = require('./scopes.json');

var User = require('../../models/user.js');
var GoogleUser = require('../../models/google/google_user.js');
var Organisation = require('../../models/google/google_organisation.js');

// Create Google OAuth2 Client for everyone
// Populate with tokens if available
router.use(function(req, res, next) {
  req.googleOAuth = new google.auth.OAuth2(
    secrets.google.client_id,
    secrets.google.client_secret,
    secrets.google.redirect_uri
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
// No Auth for that
router.get('/login/callback', function(req, res, next) {
  req.googleOAuth.getToken(req.query.code, function(err, tokens) {
    if (err) return next(err);
    idPayload = decodeGoogleIdToken(tokens.id_token);
    //we have the google_id, now let's find our user_id
    GoogleUser.getFromIdPayload(idPayload, req.googleOAuth, function(err, user) {
        if (err) return next(err);
        //if no user is returned, create a new user
        if (!user) {
          user = new User({
            google: {
              id: idPayload.sub,
              email: idPayload.email,
              hd: idPayload.hd,
              tokens: {
                id_token: tokens.id_token,
                refresh_token: tokens.refresh_token
              },
            },
          });
          user.save(function(err) {
            if (err) return next(err);
            //once saved let's go back as a registered user
            req.session.user = {
              id: user.id,
              email: user.email,
              google: {
                tokens: tokens
              }
            };
            //@todo build nice welcome page (with TOS validation)
            return res.redirect('/welcome');
          });
        } else {
          tokens.refresh_token = user.google.tokens.refresh_token;
          req.session.user = {
            id: user.id,
            email: user.email,
            google: {
              tokens: tokens
            }
          };
          res.redirect(req.session.redirect_after_login || '/app');
        }
      });
  });
});

// A function taking the id_token from Google OAuth and returning the payload as an array
function decodeGoogleIdToken(idToken) {
    var encodedPayload = idToken.split('.')[1];
    var buffer = new Buffer(encodedPayload, 'base64');
    var decodedPayload = JSON.parse(buffer.toString('utf8'));
    return decodedPayload;
}

module.exports = router;
