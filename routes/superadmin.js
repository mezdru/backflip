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
  if (res.locals.user && res.locals.user.isSuperAdmin()) {
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

router.get('/user/:userEmail/setName/:name', function(req, res, next) {
  User.findOneByEmail(req.params.userEmail, function(err, user) {
    if (err) return next(err);
    if (!user) {
      err = new Error('No user found');
      err.status = 400;
      return next(err);
    }

    user.name = req.params.name;
    user.save(function(err, user) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Username Set',
          details: `User ${user._id} has now name ${user.name}`,
          content: user
        }
      );
    });
  });
});

router.get('/user/:userEmail/setSenderEmail/:senderEmail', function(req, res, next) {
  User.findOneByEmail(req.params.userEmail, function(err, user) {
    if (err) return next(err);
    if (!user) {
      err = new Error('No user found');
      err.status = 400;
      return next(err);
    }

    user.senderEmail = req.params.senderEmail;
    user.save(function(err, user) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'Sender Email Set',
          details: `User ${user._id} has now sender email ${user.senderEmail}`,
          content: user
        }
      );
    });
  });
});

//@todo filter on query, not after o.O
router.get('/user/list/:filter?/:sort?', function(req, res, next) {
  var sort = req.params.sort || '-created';
  User.find()
  .select('created updated last_login last_action email.value google.email google.hd orgsAndRecords invitations')
  .sort(sort)
  .populate('orgsAndRecords.organisation', 'tag')
  .populate('invitations.organisation', 'tag')
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
        default: case 'all':
          return true;
      }
    });
    res.render('index',
      {
        title: 'Users list',
        details: `${users.length} users`,
        content: users
      }
    );
  });
});

//@todo filter on query, not after o.O
router.get('/user/fixDoubleOrg', function(req, res, next) {
  User.find()
  .exec(function(err, users) {
    if (err) return next(err);
    usersWithManyOrgs = users.filter(user => user.orgsAndRecords.length > 1);
    var userUpdated = 0;
    var newUsers = [];
    usersWithManyOrgs.forEach(user => {
      var newOrgsAndRecords = [];
      user.orgsAndRecords.forEach(orgAndRecord => {
        index = newOrgsAndRecords.findIndex(newOrgAndRecord => orgAndRecord.organisation.equals(newOrgAndRecord.organisation));
        if (index >= 0) {
          if(orgAndRecord.record) {
            newOrgsAndRecords[index] = orgAndRecord;
            userUpdated ++;
          }
        } else newOrgsAndRecords.push(orgAndRecord);
      });
      user.orgsAndRecords = newOrgsAndRecords;
      newUsers.push(user);
    });
    var savedCount = 0;
    newUsers.forEach(user => {
      user.save((err, user) => {
        if (err) return next(err);
        savedCount++;
        if (savedCount === newUsers.length) {
          res.render('index',
            {
              title: 'fixDoubleOrg',
              details: `${userUpdated} fixed  of ${savedCount} saved users updated`,
              content: newUsers
            });
          }
        });
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
    tag: req.params.orgTag.replace(/\W/g,'').toLowerCase(),
    creator: res.locals.user._id
  });
  organisation.save(function(err, organisation) {
    if (err) return next(err);
    res.redirect(UrlHelper.makeUrl(organisation.tag, 'admin/organisation/', null, req.getLocale()));
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
      user.makeAdminToOrganisation(organisation, function(err, user) {
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

router.get('/record/promote/:id', function(req, res, next) {
  if (!res.locals.organisation) {
    let error = new Error('organisation required');
    error.status = 400;
    return next(error);
  }
  Record.findById(req.params.id, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      let error = new Error('Record not found');
      error.status = 404;
      return next(error);
    }
    record.promoteToAll(function(err, record) {
      res.render('index',
        {
          title: 'Record made public',
          details: `${record.name} is now available to All`,
          content: record
        });
    });
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

//@todo this should be a DB command
router.get('/updateLocationsForLabRH', function(req, res, next) {
  if (res.locals.organisation.tag !== 'vivalabrh') {
    let error = new Error('Only works for vivalabrh');
    error.status = 400;
    return next(error);
  }
  res.locals.organisation.populateRecords(function(err, organisation) {
    var length = res.locals.organisation.records.length;
    var linksUpdated = 0;
    var recordsUpdated = 0;
    res.locals.organisation.records.forEach(record => {
      var recordUpdated = 0;
      record.links.forEach(link => {
        if (link.type === 'location') {
          link.url = 'https://aralifi.fr/lelabrh/salonvivatech.html';
          linksUpdated ++;
          recordUpdated = 1;
        }
      });
      recordsUpdated += recordUpdated;
      if (recordUpdated) {
        record.save(function(err, record) {
          length --;
          if (length === 0) {
            res.render('index',
              {
                title: 'Updated Records Links Locations Urls',
                details: `Updated ${linksUpdated} links in ${recordsUpdated} records from a total of ${res.locals.organisation.records.length} records`,
                content: res.locals.organisation.records
              }
            );
          }
        });
      } else length --;
    });
  });
});

module.exports = router;
