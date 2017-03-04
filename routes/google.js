var express = require('express');
var router = express.Router();
var mongoose = require('mongoose');

var google = require('googleapis');
var secrets = require('../google/secrets.json');
var oauth2client = new google.auth.OAuth2(
    secrets.web.client_id,
    secrets.web.client_secret,
    secrets.web.redirect_uris.default
);
var scopes = require('../google/scopes.json');

router.get('/', function(req, res, next) {
  var tokens = req.session.tokens;
  oauth2client.setCredentials(tokens);
  console.log(oauth2client);
  google.oauth2("v2").userinfo.v2.me.get({access_token: tokens.access_token}, function(err, ans) {
    if (err) return console.error(err);
    console.log("UserInfo:");
    console.log(ans);
  });
  var title = 'Not logged in';
  var me = 'No personal information';
  if (tokens) {
    title = 'Logged In';
    me = 'No personal information yet';
  }
  res.render('google', { title: title, me: me});
});

router.get('/login', function(req, res, next) {
  url = oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  res.redirect(url);
});

router.get('/login/callback', function(req, res, next) {
  oauth2client.getToken(req.query.code, function(err, tokens) {
    //@todo use session to store user_id only.
    //@todo move tokens, emails, anything we get from google in user collection
    //@todo use session to pull user from DB and do stuff
    if (err) return next(err);
    req.session.tokens = tokens;
    res.redirect('/google');
  });
});

module.exports = router;
