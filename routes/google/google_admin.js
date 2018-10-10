var express = require('express');
var router = express.Router();
var google = require('googleapis');
var User = require('../../models/user.js');
var Record = require('../../models/record.js');
var GoogleUser = require('../../models/google/google_user.js');
var GoogleRecord = require('../../models/google/google_record.js');
var undefsafe = require('undefsafe');

router.get('/me', function (req, res, next) {
  google.plus('v1').people.get({userId: 'me', auth:req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
    {
      title: 'plus.people.get.me',
      details: 'Calling the plus API to get the user infos',
      content: ans
    });
  });
});

router.get('/oauth', function (req, res, next) {
  google.oauth2('v1').tokeninfo(req.session.user.google.tokens, function (err, ans) {
    if (err) return next(err);res.render('index',
    {
      title: 'oauth2.tokeninfo',
      details: 'Calling the oauth API to get the token infos',
      content: ans
    });
  });
});

//@todo paginate & handle more than 500 (500 is the max maxResults)
router.get('/user/list/:viewType?', function(req, res, next) {
  var viewType = req.params.viewType == 'admin' ? 'admin_view' : 'domain_public';
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500, viewType: viewType, auth:req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Users within your organisation',
        details: `Google Admin Directory API returns ${ans.users.length} users (cannot return more than 500).`,
        content: ans
      }
    );
  });
});

router.get('/user/attachRecords', function(req, res, next) {
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id}, function(err, users) {
    if (err) return next(err);
    missingRecordUsers = users.filter(user => !user.getRecordIdByOrgId(res.locals.organisation._id));
    if (missingRecordUsers.length === 0) {
      return res.render('index', {
        title: 'No Users missing Records',
        details: `Found 0 users.`
      });
    }
    var results = [];
    missingRecordUsers.forEach(function(user) {
      GoogleUser.attachOrgAndRecord(user, res.locals.organisation, function(err, user) {
        if (err) results.push(err);
        else results.push(user);
        if (results.length === missingRecordUsers.length) {
          res.render('index',
          {
            title: 'Attach Records',
            details: `Found ${missingRecordUsers.length} users without record and attempted to find a Record.`,
            content: results
          });
        }
      });
    });
  });
});

router.get('/user/get/:googleId', function (req, res, next) {
  google.admin('directory_v1').users.get( {userKey: req.params.googleId, viewType:'domain_public', auth:req.googleOAuth},function (err, ans) {
    if (err) return next(err);
    res.render('index',
    {
      title: 'Google User Details',
      details: 'Google Admin Directory API returns these info about the user',
      content: ans
    });
  });
});

router.get('/user/add/:googleEmail', function(req, res, next) {
  User.findOne({'google.email': req.params.googleEmail}, function(err, user) {
    if (err) return next(err);
    if (!user) {
      err = new Error('No user found');
      err.status = 400;
      return next(err);
    }
    user.addToOrganisation(res.locals.organisation._id, function(err, user) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'User added',
          details: `${user.google.email} has been added to ${res.locals.organisation.tag}`,
          content: user
        });
    });
  });
});

//@todo get the OAuth scope first
router.get('/domain/list', function(req, res, next) {
  google.admin('directory_v1').domains.list({customer: 'my_customer', auth:req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Google Domains within your organisation',
        details: `Google Admin Directory API returns ${ans.domains.length} domains`,
        content: ans
      });
    });
});

// Load the whole organisation records with DELETED, we'll need those for further use
// Duplicate in record_admin && record_admin
router.use(function(req, res, next) {
  if (res.locals.organisation.records) return next();
  Record.findWithDeleted({organisation: res.locals.organisation._id}, function(err, records) {
    if (err) return next(err);
    res.locals.organisation.records = records;
    return next();
  });
});

//@todo paginate & handle more than 500 (500 is the max maxResults)
//@todo do not recreate deleted records
router.get('/user/update/:viewType?', function(req, res, next) {
  var viewType = req.params.viewType == 'admin' ? 'admin_view' : 'domain_public';
  google.admin('directory_v1').users.list({customer: 'my_customer', maxResults: 500, viewType: viewType, auth:req.googleOAuth}, function (err, ans) {
    if (err) return next(err);
    var recordsAndGoogleUsers = GoogleRecord.matchRecordsAndGoogleUsers(res.locals.organisation.records, ans.users);
    GoogleRecord.deleteRecords(recordsAndGoogleUsers, res.locals.user._id, function(err, result) {
      if (err) return next(err);
    });
    GoogleRecord.createRecords(recordsAndGoogleUsers, res.locals.organisation._id, function(err, result) {
      if (err) return next(err);
    });
    res.render('admin/update_users',
      {
        googleUsers: ans.users,
        delete: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'delete'),
        create: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'create'),
        keep: GoogleRecord.getRecordsAndGoogleUser(recordsAndGoogleUsers, 'keep')
      });
    });
});

//Removes private Google Pictures
router.get('/user/cleanPictures', function(req, res, next) {
  var cleaned = [];
  var toClean = res.locals.organisation.records.filter(record => undefsafe(record, 'picture.url') && record.picture.url.includes('https://plus.google.com/_/focus/photos/private/'));
  if (toClean.length === 0) {
    return res.render('index',
      {
        title: 'Cleaning Private Google Pictures',
        details: `There is no Picture to Clean`
      });
  }
  toClean.forEach(function(record) {
    record.picture.url = null;
    record.save(function(err, record) {
      if (err) return next(err);
      cleaned.push(record);
      if (cleaned.length === toClean.length) {
        res.render('index',
          {
            title: 'Cleaning Private Google Pictures',
            details: `${cleaned.length} private google pictures have been cleaned`,
            content: cleaned
          });
      }
    });
  });
});

module.exports = router;
