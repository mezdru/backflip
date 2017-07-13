/**
* @Author: Clément Dietschy <bedhed>
* @Date:   12-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 12:30
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');

var Organisation = require('../models/organisation.js');
var User = require('../models/user.js');
var Record = require('../models/record.js');

var UrlHelper = require('../helpers/url_helper.js');

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

    var firstOrgId = user.getFirstOrgId();
    if (firstOrgId) {
      Organisation.findById(firstOrgId, 'tag', function(err, organisation) {
        if(err) return next(err);
        res.redirect(new UrlHelper(organisation.tag).getUrl());
      });
    } else {
      return res.render('index',
        {
          title: 'Impersonate',
          details: 'You are now impersonating ' + res.locals.user.google.email
        });
    }
  });
});

router.get('/user/list', function(req, res, next) {
  User.find().select('email created google.email google.hd').sort('-created').exec(function(err, users) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Users list',
        details: `${users.length} users`,
        content: users
      });
  });
});

router.get('/organisation/list', function(req, res, next) {
  Organisation.find().select('tag created google.hd').sort('-created').exec(function(err, organisations) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Organisations list',
        details: `${organisations.length} organisations`,
        content: organisations
      });
  });
});

router.get('/organisation/:orgTag/makeadmin/:googleEmail', function(req, res, next) {
  User.findOne({'google.email': req.params.googleEmail}, function(err, user) {
    if (err) return next(err);
    if (!user) {
      err = new Error('No user found');
      err.status = 400;
      return next(err);
    }
    Organisation.findOne({tag: req.params.orgTag}, function(err, organisation) {
      if (err) return next(err);
      if (!organisation) {
        err = new Error('No organisation found');
        err.status = 400;
        return next(err);
      }
      user.makeAdminToOrganisation(organisation._id, function(err, user) {
        if (err) return next(err);
        res.render('index',
          {
            title: 'Admin added',
            details: `${user.google.email} is now admin of ${organisation.tag}.`,
            content: user
          });
      });
    });
  });
});

router.get('/organisation/:orgTag/welcome', function(req, res, next) {
  Organisation.findOne({tag: req.params.orgTag}, function(err, organisation) {
    if (err) return next(err);
    if (!organisation) {
      err = new Error('No organisation found');
      err.status = 400;
      return next(err);
    }
    organisation.welcome(function(err, organisation) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Welcome Organisation',
          details: `${organisation.tag} is now welcomed.`,
          content: organisation
        });
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
