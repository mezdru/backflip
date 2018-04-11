var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');

var Organisation = require('../models/organisation.js');
var User = require('../models/user.js');
var Record = require('../models/record.js');
var Application = require('../models/application.js');

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

router.get('/impersonate/:userEmail', function(req, res, next) {
  User.findOneByEmail(req.params.userEmail, function(err, user) {
    if (err) return next(err);
    if (!user) {
      err = new Error('No user found');
      err.status = 400;
      return next(err);
    }
    user.populate('orgsAndRecords.record', 'name picture tag');
    user.populate('orgsAndRecords.organisation', 'name picture tag');
    req.session.impersonator = new User(req.session.user);
    req.session.user = user;
    res.locals.impersonator = req.session.impersonator;
    res.locals.user = req.session.user;

    return res.redirect(new UrlHelper(user.getFirstOrgTag()).getUrl());
  });
});

//@todo filter on query, not after o.O
router.get('/user/list/:filter?', function(req, res, next) {
  User.find()
  .select('created updated last_login last_action email.value google.email google.hd orgsAndRecords')
  .sort('-created')
  .populate('orgsAndRecords.organisation', 'tag')
  .exec(function(err, users) {
    if (err) return next(err);
    users = users.filter(user => {
      switch (req.params.filter) {
        case 'login':
          return user.last_login;
        case 'loginOrphans':
          return user.last_login && user.orgsAndRecords.length === 0;
        case 'activeMonth':
          return user.last_action > Date.now() - 30*24*3600*1000;
        case 'activeWeek':
          return user.last_action > Date.now() - 7*24*3600*1000;
        case 'activeDay':
          return user.last_action > Date.now() - 1*24*3600*1000;
        case 'activeDay':
          return user.last_action > Date.now() - 1*24*3600*1000;
        default:
          return true;
      }
    });
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

router.get('/organisation/create/:orgTag', function(req, res, next) {
  var organisation = new Organisation({
    name: req.params.orgTag,
    tag: req.params.orgTag.replace(/\W/g,'').toLowerCase()
  });
  organisation.save(function(err, organisation) {
    if (err) return next(err);
    var url = new UrlHelper(organisation.tag).getUrl();
    res.render('index',
      {
        title: 'New organisation created',
        details: `<a href="${url}">${organisation.host}</a> has been created.`,
        content: organisation
      });
  });
});

router.get('/organisation/:orgTag/makeadmin/:userEmail', function(req, res, next) {
  User.findOneByEmail(req.params.userEmail, function(err, user) {
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
            details: `${user.loginEmail} is now admin of ${organisation.tag}.`,
            content: user
          });
      });
    });
  });
});

router.get('/organisation/:orgTag/addGoogleHD/:hd', function(req, res, next) {
  Organisation.findOne({tag: req.params.orgTag}, function(err, organisation) {
    if (err) return next(err);
    if (!organisation) {
      err = new Error('No organisation found');
      err.status = 400;
      return next(err);
    }
    organisation.addGoogleHD(req.params.hd, function(err, organisation) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Added Google HD to Organisation',
          details: `${organisation.tag} can now login using ${req.params.hd}.`,
          content: organisation
        });
    });
  });
});

router.get('/organisation/:orgTag/addEmailDomain/:domain', function(req, res, next) {
  Organisation.findOne({tag: req.params.orgTag}, function(err, organisation) {
    if (err) return next(err);
    if (!organisation) {
      err = new Error('No organisation found');
      err.status = 400;
      return next(err);
    }
    organisation.addEmailDomain(req.params.domain, function(err, organisation) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Added Email Domain to Organisation',
          details: `${organisation.tag} can now login using ${req.params.domain}.`,
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

router.get('/application/list', function(req, res, next) {
  Application.find().sort('-created').exec(function(err, applications) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Application list',
        details: `${applications.length} applications`,
        content: applications
      });
  });
});

module.exports = router;
