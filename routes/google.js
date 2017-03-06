var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');
var User = require('../models/user.js');

var google = require('googleapis');
var secrets = require('../google/secrets.json');
var oauth2client = new google.auth.OAuth2(
    secrets.web.client_id,
    secrets.web.client_secret,
    secrets.web.redirect_uris.default
);
var scopes = require('../google/scopes.json');

router.get('/', function(req, res, next) {
  //@todo that's the login middleware, move it there
  if (!req.session.user_id) return res.render('google', { title: 'Not Logged In', me: 'Nothing'});
  //we probably can avoid making 2 requests (1 for the session, 1 for the user) by putting the google tokens in the session.
  User.findById( req.session.user_id, function(err, user) {
    if (err) return next(err);
    if (!user) return next(new Error('No user matching session. This should not happen'));
    //@todo check whats up with the access & refresh tokens. We store only the first access token, but should store the last.
    oauth2client.setCredentials(user.google.tokens);
    google.oauth2("v2").userinfo.v2.me.get({access_token: user.google.tokens.access_token}, function(err, ans) {
      if (err) return next(err);
      res.render('google', { title: "Hello Connected World", me: JSON.stringify(ans)});
    });
  });
});

router.get('/login', function(req, res, next) {
  url = oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  res.redirect(url);
});

router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    else res.redirect('/google');
  });
});



router.get('/login/callback', function(req, res, next) {
  oauth2client.getToken(req.query.code, function(err, tokens) {
    if (err) return next(err);
    //@todo get out of the pyramid of death.
    //@todo readuserid from Token JWT instead of querying userinfo.
    //@todo find out what "userinfoplus" is about and where to find those.
    google.oauth2("v2").userinfo.v2.me.get({access_token: tokens.access_token}, function(err, ans) {
      if (err) return next(err);
      //we have the google_id, now let's find our user_id
      console.log(ans.id);
      User.findOne({'google.id': ans.id}, function(err, user) {
        if (err) return next(err);
        //if no user is returned, create a new user
        //@todo add domain information, image, etc...
        console.log(user);
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
            //@todo build & redirect to nice welcome page (with TOS validation)
            req.session.user_id = user.id;
            res.redirect('/google');
          });
        } else {
          //@todo update profile with the information we got from userinfo
          req.session.user_id = user.id;
          res.redirect('/google');
        }
      });
    });
  });
});

module.exports = router;
