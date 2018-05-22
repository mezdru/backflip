var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var Record = require('../models/record.js');
var UrlHelper = require('../helpers/url_helper.js');

// First we check there is an organisation.
// If there is an org, we now the user belongs there from restrict.js
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }
  return next();
});

// Get the record
router.get('/:tag?', function(req, res, next) {
  if (!req.params.tag && res.locals.user) {
    var tag = res.locals.user.getRecordTagByOrgId(res.locals.organisation._id);
    var query = req.query.json ? '?json=true' : null;
    if (tag) return res.redirect(UrlHelper.makeUrl(req.organisationTag, 'profile/'+tag, query, req.getLocale()));
  }
  return next();
});

// Get the record
router.get('/:tag', function(req, res, next) {
  Record.findByTag(req.params.tag, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      var error = new Error('Profile not found');
      error.status = 404;
      return next(error);
    }
    res.locals.record = record;
    next();
  });
});

router.get('/id/:id', function(req, res, next) {
  Record.findById(req.params.id, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      let error = new Error('Profile not found');
      error.status = 404;
      return next(error);
    }
    res.locals.record = record;
    next();
  });
});

router.use(function(req, res, next) {
  if (!res.locals.record) {
    let error = new Error('Profile not found');
    error.status = 404;
    return next(error);
  }
  return next();
});

router.get('*', function(req, res, next) {
  if (!res.locals.user) return next();
  if (res.locals.user.ownsRecord(res.locals.record._id) ||
    res.locals.user.isAdminToOrganisation(res.locals.record.organisation) ||
    res.locals.user.isSuperAdmin()
  ) {
    res.locals.canEdit = true;
  }
  next();
});

router.get('*', function(req, res, next) {
  if (!res.locals.user) return next();
  if (res.locals.user.isAdminToOrganisation(res.locals.record.organisation) ||
    res.locals.user.isSuperAdmin()) {
    res.locals.canDelete = true;
  }
  next();
});

router.get('*', function(req, res, next) {
  res.locals.coverUrl = undefsafe(res.locals.record, 'cover.url');
  if (res.locals.canEdit) {
    res.locals.editCoverUrl =  UrlHelper.makeUrl(req.organisationTag, 'cover/id/'+res.locals.record._id, null, req.getLocale());
    res.locals.editAboutUrl =  UrlHelper.makeUrl(req.organisationTag, 'about/id/'+res.locals.record._id, null, req.getLocale());
    if (res.locals.record.type === 'hashtag') {
      res.locals.editEmojiUrl =  UrlHelper.makeUrl(req.organisationTag, 'emoji/id/'+res.locals.record._id, null, req.getLocale());
    }
  }
  next();
});

router.get('*', function(req, res, next) {
  if (res.locals.user.isSuperAdmin && !res.locals.record.isInTheAllOrganisation() && res.locals.record.type === 'hashtag') {
    res.locals.promoteUrl =  UrlHelper.makeUrl(req.organisationTag, 'superadmin/record/promote/'+res.locals.record._id, null, req.getLocale());
  }
  next();
});

router.get('*', function(req, res, next) {
  if (req.query.json) {
    return res.json(res.locals.record);
  } else {
    res.render('profile', {
      title: res.locals.record.name,
      bodyClass: 'profile'
    });
  }
});

module.exports = router;
