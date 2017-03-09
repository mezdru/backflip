var express = require('express');
var router = express.Router();

var google = require('googleapis');
var secrets = require('../secrets.json');
var scopes = require('../scopes.json');

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
    //@todo get out of the pyramid of death.
    //@todo readuserid from Token JWT instead of querying userinfo.
    //@todo find out what "userinfoplus" is about and where to find those.
    google.oauth2("v2").userinfo.v2.me.get({access_token: tokens.access_token}, function(err, ans) {
      if (err) return next(err);
      //we have the google_id, now let's find our user_id
      User.getByGoogleId( ans.id, function(err, user) {
        if (err) return next(err);
        //if no user is returned, create a new user
        //@todo add domain information, image, etc...
        //@todo the access_token is useless.
        if (!user) {
          user = new User({
            google: {
              id: ans.id,
              email: ans.email,
              tokens: tokens
            },
            created: Date.now(),
            touched: Date.now(),
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
            res.redirect('/welcome');
          });
        } else {
          //@todo update profile with the information we got from userinfo
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

module.exports = router;
