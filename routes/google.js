var express = require('express');
var router = express.Router();

var google = require('googleapis');
var secrets = require('./secrets.json');

var oauth2client = new google.auth.OAuth2(
  secrets.web.client_id,
  secrets.web.client_secret,
  secrets.web.redirect_uris.default
);

var plus = google.plus({
  version: 'v1',
  auth: oauth2client
});

var directory = google.admin('directory_v1');

var scopes = [
  'https://www.googleapis.com/auth/plus.me',
  'https://www.googleapis.com/auth/admin.directory.user'
];

/* GET Google entry point */
router.get('/', function(req, res, next) {
  var tokens = req.session.tokens;
  oauth2client.setCredentials(tokens);
  var title = 'Not logged in';
  var me = 'No personal information';
  var them = 'No coworker information';
  if (tokens) {
    title = 'Logged In';
    me = 'No personal information yet';
    getme(req.session);
    getThem(req.session);
  } else {
    title = 'Not logged in';
  }
  console.log('session.me = ' +  req.session.me);
  res.render('google', { title: title, avatar_url: req.session.me.image.url, me: JSON.stringify(req.session.me, null, 4), them: them });
});

function getme(session) {
  plus.people.get({
    userId: 'me'
  }, function (err, response) {
    if (err) {
      console.error(err);
      return;
    }
    session.me = response;
    session.save();
    });
}

function getThem(session) {
  directory.users.list({
    auth: oauth2client,
    maxResults: 10,
  }, function(err, response) {
    if (err) {
      console.error(err);
      return;
    }
    session.them = response;
    session.save();
  });
}

router.get('/login', function(req, res, next) {
  url = oauth2client.generateAuthUrl({
    access_type: 'offline',
    scope: scopes
  });
  res.redirect(url);
});

router.get('/login/callback', function(req, res, next) {
  if (req.query.code) {
    oauth2client.getToken(req.query.code, function(err, tokens) {
      if (err) {
        next(err);
      } else {
        tokens.expriry_date = true;
        req.session.tokens = tokens;
        oauth2client.setCredentials(tokens);
        res.redirect('/google');
      }
    });
  }
});

module.exports = router;
