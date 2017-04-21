/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 03:56
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var User = require('../models/user.js');
var Record = require('../models/record.js');
var GoogleRecord = require('../models/google/google_record.js');

// Maybe all this logic should be under /google/ as it's only google related at the moment...

// Auth check, we want an admin for the current org
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('No organisation');
    err.status = 403;
    return next(err);
  } else if (!res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
    err = new Error('Must be Admin');
    err.status = 403;
    return next(err);
  } else return next();
});

// Load the whole organisation records, we'll need those for further use
// @todo avoid this by asyncrhonously request exactly what we need later
router.use(function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.locals.organisation.records = records;
    return next();
  });
});

// Create Google OAuth2 Client for everyone
// Populate with tokens if available
// @todo deduplicate this code (also in google_auth.js)
router.use(function(req, res, next) {
  req.googleOAuth = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
  // this only works if the user has a google account...
  req.googleOAuth.setCredentials(req.session.user.google.tokens);
  google.options({
      auth: req.googleOAuth
  });
  return next();
});

router.get('/algolia/clear', function(req, res, next) {
  AlgoliaOrganisation.clear(res.locals.organisation._id, function(err) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Algolia Index has bean cleanred'
      }
    );
  });
});

router.get('/google/users/list', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Users within your organisation',
        details: `Google Admin Directory API returns ${ans.users.length} users`,
        content: ans
      }
    );
  });
});

router.get('/google/users/get/:googleId', function (req, res, next) {
  google.admin('directory_v1').users.get( {userKey: req.params.googleId},function (err, ans) {
    if (err) return next(err);
    res.render('index',
    {
      title: 'Google User Details',
      details: 'Google Admin Directory API returns these info about the user',
      content: ans
    });
  });
});


//@todo paginate & handle more than 500 (500 is the max maxResults)
router.get('/google/users/update', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    var recordsAndGoogleUsers = GoogleRecord.matchRecordsAndGoogleUsers(res.locals.organisation.records, ans.users);
    GoogleRecord.deleteRecords(recordsAndGoogleUsers, function(err, result) {
      if (err) return next(err);
    });
    GoogleRecord.createRecords(recordsAndGoogleUsers, res.locals.organisation._id, function(err, result) {
      if (err) return next(err);
    });
    res.render('update_users',
      {
        googleUsers: ans.users,
        delete: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'delete'),
        create: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'create'),
        keep: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'keep')
      });
    });
});

router.get('/google/users/test', function(req, res, next) {
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500}, function (err, ans) {
    if (err) return next(err);
    var recordsAndGoogleUsers = GoogleRecord.matchRecordsAndGoogleUsers(res.locals.organisation.records, ans.users);
    recordsAndGoogleUsers.forEach(function(recordAndGoogleUser) {
      if (randInt(0,20) === 0 && recordAndGoogleUser.record) {
        recordAndGoogleUser.action = 'delete';
      }
    });
    /*Record.findOneDeleted({_id: '58f890a0e4959d1c1829e5c6'}, function(err, record) {
      if (err) return next(err);
      console.log(record);
      record.restore(function(err, record) {
        if (err) return next(err);
        console.log(record);
      })
    });*/
    GoogleRecord.deleteRecords(recordsAndGoogleUsers, function(err, result) {
      if (err) return next(err);
    });
    GoogleRecord.createRecords(recordsAndGoogleUsers, res.locals.organisation._id, function(err, result) {
      if (err) return next(err);
    });
    res.render('update_users',
      {
        googleUsers: ans.users,
        delete: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'delete'),
        create: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'create'),
        keep: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'keep')
      });
    });
});

router.get('/users/get/:userId', function(req, res, next) {
  Record.findById(req.params.userId).populate('within', 'name tag type').exec(function(err, record) {
    record.makeWithinRecordsArray(function(err, record) {
      record.save(function(err, record) {
        res.render('index',
          {
            title: 'Found one Record',
            details: `Here is ${record.name}`,
            content: record
          });
        });
    });
  });
});

// Remove when google/users/test is removed
function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

router.get('/google/domains', function(req, res, next) {
  google.admin('directory_v1').domains.list({customer: 'my_customer'}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Domains within your organisation',
        details: `Google Admin Directory API returns ${ans.domains.length} domains`,
        content: ans
      });
    });
});

module.exports = router;
