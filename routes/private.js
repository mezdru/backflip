/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 08-04-2017 10:28
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var plus = google.plus('v1');
var User = require('../models/user.js');
var Record = require('../models/record.js');

router.get('/google/app', function(req, res, next) {
  plus.people.get({userId: 'me', auth: req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    return res.render('index', { title: 'The app', message: JSON.stringify(ans, null, 4)});
  });
});

router.get('/me/edit', function(req, res, next) {
  Record.findById(res.locals.user.getRecordIdFromOrgId(res.locals.organisation._id), function(err, record) {
    if (err) return next(err);
    res.render('index', {title: 'record', message: JSON.stringify(record, null, 4)});
  });
});

router.get('/welcome', function(req, res, next) {
  res.render('welcome');
});

router.get('/', function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  res.render('directory');
});

module.exports = router;
