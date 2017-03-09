var express = require('express');
var router = express.Router();

var google = require('googleapis');
var plus = google.plus('v1');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Hello World', message: JSON.stringify(req.session)});
});

router.get('/app', function(req, res, next) {
  plus.people.get({userId: 'me', auth: req.oauth2client}, function (err, ans) {
    if (err) return next(err);
    return res.render('index', { title: 'The app', message: JSON.stringify(ans)});
  });
});

router.get('/welcome', function(req, res, next) {
  res.render('index', { title: 'Welcome', message: JSON.stringify(req.session)});
});

router.get('/bye', function(req, res, next) {
  res.render('index', { title: 'Bye', message: "nothing"});
});

module.exports = router;
