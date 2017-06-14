/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 14-06-2017 12:24
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

router.get('/', function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  res.locals.orgTree = res.locals.organisation.tree;
  res.locals.isAdmin = res.locals.user.isAdminToOrganisation(res.locals.organisation._id);
  res.locals.myRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
  res.locals.isMyOrg = true;
  res.render('directory', {search: true});
});

router.get('/welcome', function(req, res, next) {
  res.render('error', {status: 204});
});

module.exports = router;
