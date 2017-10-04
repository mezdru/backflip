/**
* @Author: Clément Dietschy <bedhed>
* @Date:   10-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 17-05-2017 04:17
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var User = require('../models/user.js');
var Record = require('../models/record.js');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var UrlHelper = require('../helpers/url_helper.js');

// First we check there is an organisation.
// There is no record without organisation
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 400;
    return next(err);
  }
  return next();
});

// Get the record & check rights
router.use('/:context?/:recordId',function(req, res, next) {
  if (req.params.context === 'create') return next();

  //@todo handle the case we ask for me but there's no record
  req.params.recordId = req.params.recordId === 'me' ? res.locals.user.getRecordIdByOrgId(res.locals.organisation._id) : req.params.recordId;

  Record.findById(req.params.recordId, function(err, record) {
    if (err) return next(err);
    if (!record) {
      err = new Error('No record found');
      err.status = 400;
      return next(err);
    }
    if (!record.organisation.equals(res.locals.organisation._id)) {
      err = new Error('Record not in this organisation');
      err.status = 403;
      return next(err);
    }
    if (record.type == 'person' && res.locals.user.ownsRecord(record._id)) {
      res.locals.itsMe = true;
    } else if (record.type == 'person' && !res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
      err = new Error('Record not yours');
      err.status = 403;
      return next(err);
    }
    res.locals.record = record;
    return next();
  });
});

// On post we always expect an _id field matching the record for the current user/organisation
router.post('/:context?/:recordId', function(req, res, next) {
  if(req.params.context === 'create') return next();
  if (req.body._id != res.locals.record._id) {
    err = new Error('Record Mismatch');
    err.status = 500;
    return next(err);
  }
  return next();
});

// If we come from the create view, we instantiate a new record
router.post('/create', function(req, res, next) {
  res.locals.record = new Record({
    organisation: res.locals.organisation._id,
    type: req.body.type || 'person',
    tag: Record.makeTag(req.body.tag, req.body.name, req.body.type)
  });
  return next();
});

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/:context?/:recordId', function(req, res, next) {
  var path =  'edit/' + (req.params.context ? req.params.context + '/' : '' ) + (req.params.recordId || '');
  res.locals.formAction = new UrlHelper(req.organisationTag, path, null, req.getLocale()).getUrl();
  return next();
});

router.use('/:context?/:recordId', function(req, res, next) {
    res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);

    if (undefsafe(res.locals, 'record.type')) res.locals[res.locals.record.type] = true;
    return next();
});

// If we come from the welcome view, we assemble the 3 desc fields to make description
router.post('/welcome/:recordId', function(req, res, next) {
  req.body.description = (req.body.descDo ? req.body.descDo + "\n" : "") +
    (req.body.descHelp ? req.body.descHelp + "\n" : "") +
    (req.body.descLove ? req.body.descLove + "\n" : "");
  return next();
});

// We save the record after checking everything is alriqht.
router.post('/:context?/:recordId', function(req, res, next) {
  req.checkBody(Record.validationSchema);
  /* @todo ESCAPING & TRIMMING, at the moment we don't because it escapes simple quote...
  req.sanitizeBody('name').trim();
  req.sanitizeBody('name').escape();
  req.sanitizeBody('description').trim();
  req.sanitizeBody('description').escape();
  */
  req.body.picture.url = req.body.picture.url || res.locals.record.picture.url;
  res.locals.errors = req.validationErrors();

  //@todo ESCAPE PICTURE URL !
  res.locals.record = Object.assign(res.locals.record, {name: req.body.name, description: req.body.description, picture: req.body.picture});

  if (!res.locals.errors) {
    res.locals.record.deleteLinks(req.body.links);
    if (req.body.newLinks) res.locals.record.createLinks(req.body.newLinks);
    res.locals.record.updateWithin(res.locals.organisation, function (err, record) {
      if (err) return next(err);
      res.locals.record.save (function (err) {
        if (err) {
          if (err.code === 11000) {
            res.locals.errors = [{msg:res.__('This tag is already taken')}];
            return next();
          }
          return next(err);
        }
        console.log(`EDIT ${res.locals.user.google.email || res.locals.user.email.value} <${res.locals.user._id}> updated ${res.locals.record.tag} <${res.locals.record._id}> of ${res.locals.organisation.tag} <${res.locals.organisation._id}>`);
        req.flash('success', 'Saved');
        var query = req.params.context === 'welcome' ? '?welcomed=true' : null;
        return res.redirect(new UrlHelper(req.organisationTag, null, query, req.getLocale()).getUrl());
      });
    });
  } else return next();
});

router.use('/:context?/:recordId', function(req, res, next) {
  if (req.params.context === 'welcome') {
    //@todo handle multiple lines in the source and spread thema accross the 3 fields
    res.locals.record.descDo = res.locals.record.description.split("\n")[0];
    res.render('edit_welcome', {layout: 'home/layout_home', bodyClass: 'home'});
  } else if (req.params.context === 'create') {
    res.render('edit', {title: 'Create', create: true});
  } else {
    res.render('edit', {title: 'Edit'});
  }
});

module.exports = router;
