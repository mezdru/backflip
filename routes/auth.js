var express = require('express');
var router = express.Router();

var google = require('googleapis');
var secrets = require('../secrets.json');
var scopes = require('../scopes.json');

var Organisation = require('../models/organisation.js');
var User = require('../models/user.js');

// Create Google OAuth2 Client for everyone
router.use(function(req, res, next) {
  req.oauth2client = new google.auth.OAuth2(
    secrets.google.client_id,
    secrets.google.client_secret,
    secrets.google.redirect_uri
  );
  return next();
});

router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    return res.redirect('/bye');
  });
});

// Login redirection to Google login
// No Auth for that
router.get('/google/login', function(req, res, next) {
  url = req.oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  res.redirect(url);
});

// Login redirection from Google login
// No Auth for that
router.get('/google/login/callback', function(req, res, next) {
  req.oauth2client.getToken(req.query.code, function(err, tokens) {
    if (err) return next(err);
    tokenPayload = decodeGoogleIdToken(tokens.id_token);
    //we have the google_id, now let's find our user_id
    User.findOne({google:  {id: tokenPayload.sub } }, function(err, user) {
        if (err) return next(err);
        //if no user is returned, create a new user
        if (!user) {
          user = new User({
            google: {
              id: tokenPayload.sub,
              email: tokenPayload.email,
              hd: tokenPayload.hd,
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

// Auth check & Google OAuth2 setup
router.use(function(req, res, next) {
  if (!req.session.user) {
    req.session.redirect_after_login = req.originalUrl;
    var err = new Error('Not Authenticated');
    err.status = 401;
    return next(err);
  }
  req.oauth2client.setCredentials(req.session.user.google.tokens);
  return next();
});

// A function taking the id_token from Google OAuth and returning the payload as an array
function decodeGoogleIdToken(id_token) {
    var payload = id_token.split('.')[1];
    var buffer = new Buffer(payload, 'base64');
    return JSON.parse(buffer.toString('utf8'));
}

module.exports = router;
