/**
* @Author: Clément Dietschy <bedhed>
* @Date:   10-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 06:13
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var User = require('../models/user.js');
var Record = require('../models/record.js');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');

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
router.use('/:recordId',function(req, res, next) {
  req.params.recordId = req.params.recordId == 'me' ? res.locals.user.getRecordIdByOrgId(res.locals.organisation._id) : req.params.recordId;
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
    if (record.type == 'person' && !res.locals.user.isAdminToOrganisation(res.locals.organisation._id) && !res.locals.user.ownsRecord(record._id)) {
      err = new Error('Record not yours');
      err.status = 403;
      return next(err);
    }
    res.locals.record = record;
    return next();
  });
});

// On post we always expect an _id field matching the record for the current user/organisation
router.post('*', function(req, res, next) {
  if (req.body._id != res.locals.record._id) {
    err = new Error('Record Mismatch');
    err.status = 500;
    return next(err);
  }
  return next();
});

// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/:recordId', function(req, res, next) {
  res.locals.formAction = '/compose/' + req.params.recordId;
  if (req.app.get('env') === 'development') res.locals.formAction = '/compose/' + req.params.recordId + '?subdomains=' + req.query.subdomains;
  return next();
});

router.use('/:recordId', function(req, res, next) {
    res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
    return next();
});

router.get('/:recordId', function(req, res, next) {
  res.render('compose', {title: 'Compose'});
});

// We save the record after checking everything is alriqht.
router.post('/:recordId', function(req, res, next) {
  req.checkBody(Record.validationSchema);
  /* @todo ESCAPING & TRIMMING, at the moment we don't because it escapes simple quote...
  req.sanitizeBody('name').trim();
  req.sanitizeBody('name').escape();
  req.sanitizeBody('description').trim();
  req.sanitizeBody('description').escape();
  */
  var errors = req.validationErrors();
  var successes = [];

  /* this is for WIP hierarchy
  var tree = [
    ['@OPS'],
    ['@OPS', '@Thriving'],
    ['@OPS', '@Thriving', '@Lille'],
    ['@OPS', '@Thriving', '@Paris'],
    ['@OPS', '@Thriving', '@Brussels'],
    ['@OPS', '@Thriving', '@Lyon'],
    ['@OPS', '@Thriving', '@Toulouse'],
    ['@OPS', '@Thriving', '@Nantes'],
    ['@OPS', '@BizDev'],
    ['@OPS', '@NetDev'],
    ['@OPS', '@NetSupport'],
    ['@OPS', '@LM'],
    ['@OPS', '@OPSMama'],
    ['@HQ', '@OPSMama']
  ];*/

  //@todo ESCAPE PICTURE URL !
  res.locals.record = Object.assign(res.locals.record, {name: req.body.name, description: req.body.description, picture: req.body.picture});

  if (!errors) {
    res.locals.record.deleteLinks(req.body.links);
    if (req.body.newLinks) res.locals.record.createLinks(req.body.newLinks);
    res.locals.record.updateWithin(tree, function (err, record) {
      if (err) return next(err);
      res.locals.record.save (function (err) {
        if (err) return next(err);
        successes.push({msg: "Your story has been saved."});
        console.log(`COMPOSE ${res.locals.user.name} <${res.locals.user._id}> updated ${res.locals.record.tag} <${res.locals.record._id}> of ${res.locals.organisation.tag} <${res.locals.organisation._id}`);
        res.render('compose', {title: 'Compose', successes: successes});
      });
    });
  } else {
      res.render('compose', {title: 'Compose', errors: errors});
  }
});

module.exports = router;
