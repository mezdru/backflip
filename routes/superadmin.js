/**
* @Author: Clément Dietschy <bedhed>
* @Date:   12-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 05-05-2017 04:01
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var User = require('../models/user.js');
var Record = require('../models/record.js');


router.get('/depersonate', function(req, res, next) {
  req.session.user = new User(req.session.impersonator);
  req.session.impersonator = false;
  res.locals.user = req.session.user;
  res.locals.impersonator = null;
  return res.render('index',
    {
      title: 'Depersonate',
      message: 'You are no longer impersonating anybody'
    });
});

router.use( function(req, res, next) {
  if (res.locals.user.isSuperAdmin()) {
    return next();
  }
  else {
    err = new Error('Forbidden');
    err.status = 403;
    return next(err);
  }
});

router.get('/impersonate/:googleEmail', function(req, res, next) {
  User.findOne({'google.email': req.params.googleEmail}, function(err, user) {
    if (err) return next(err);
    if (!user) {
      err = new Error('No user found');
      err.status = 400;
      return next(err);
    }
    req.session.impersonator = new User(req.session.user);
    req.session.user = user;
    res.locals.impersonator = req.session.impersonator;
    res.locals.user = req.session.user;
    return res.render('index',
      {
        title: 'Impersonate',
        details: 'You are now impersonating ' + res.locals.user.google.email
      });
  });
});

router.get('/record/clear_deleted', function(req, res, next) {
  Record.deleteMany({deleted: true}, function(err, result) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Soft Deleted Records have been cleared',
        details: `${result.length} records have been permanently cleared.`,
        content: result
      }
    );
  });
});

module.exports = router;
