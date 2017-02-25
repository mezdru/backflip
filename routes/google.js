var express = require('express');
var router = express.Router();

var google = require('googleapis');
var secrets = require('./secrets.json');

var oauth2client = new google.auth.OAuth2(
  secrets.web.client_id,
  secrets.web.client_secret,
  secrets.web.redirect_uris.default
);

var scopes = [
  'https://www.googleapis.com/auth/plus.me'
];

/* GET Google entry point */
router.get('/', function(req, res, next) {
  var tokens = req.session.tokens;
  var title = '';
  if (tokens) {
    title = 'Access token :' + tokens.access_token;
  } else {
    title = 'Not logged in';
  }
  res.render('index', { title: title });
});

router.get('/login', function(req, res, next) {
  url = oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  console.log(url);
  res.redirect(url);
});

router.get('/error', function(req, res, next) {
  err = new Error('Fail');
  err.status = 500;
  next(err);
});

router.get('/login/callback', function(req, res, next) {
  if (req.query.code) {
    oauth2client.getToken(req.query.code, function(err, tokens) {
      if (err) {
        console.log(err);
      } else {
        req.session.tokens = tokens;
        oauth2client.setCredentials(tokens);
      }
    });
  }
  res.redirect('/google');
});

module.exports = router;
