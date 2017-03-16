/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 16-03-2017
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var plus = google.plus('v1');
var User = require('../models/user.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Hello World', message: JSON.stringify(req.session)});
});

router.get('/google/app', function(req, res, next) {
  plus.people.get({userId: 'me', auth: req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    return res.render('index', { title: 'The app', message: JSON.stringify(ans, null, 4)});
  });
});

router.get('/welcome', function(req, res, next) {
  res.render('index', { title: 'Welcome', message: JSON.stringify(req.session)});
});

router.get('/bye', function(req, res, next) {
  res.render('index', { title: 'Bye', message: JSON.stringify(req.session)});
});

module.exports = router;
