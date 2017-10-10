/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 06:04
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var User = require('../models/user.js');
var Organisation = require('../models/organisation.js');
var undefsafe = require('undefsafe');
var UrlHelper = require('../helpers/url_helper.js');

// Simple easy logout
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    return res.redirect(new UrlHelper(req.organisationTag, null, null, req.getLocale()).getUrl());
  });
});

// Generic login page
//@todo deduplicate the /login logic found in auth.js and email_auth.js
router.use('/login', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'email/login/', null, req.getLocale()).getUrl();
  return next();
});

router.get('/login', function(req, res, next) {
  res.render('home/signin', {layout: 'home/layout_home', bodyClass: 'home', signinText: 'login'});
});

// Setup User depending on Auth
router.use(function(req, res, next) {
  if (req.session.user) {
    // @todo move to user model
    User.findByIdAndUpdate(req.session.user._id, {last_action: Date.now()})
    .populate('orgsAndRecords.record')
    .populate('orgsAndRecords.organisation', 'name picture tag')
    .exec(function(err, user) {
      if (err) return next(err);
      req.session.user = user;
      res.locals.user = req.session.user;
      return next();
    });
  } else {
    res.locals.user = false;
    return next();
  }
});

// Setup impersonator if there is one
router.use(function(req, res, next) {
  if (req.session.impersonator) {
    res.locals.impersonator = req.session.impersonator;
  }
  return next();
});

// Activate tracking when interested
router.use(function(req, res, next) {
  if (req.app.get('env') === 'production' && !undefsafe(res.locals, 'user.superadmin')) {
    res.locals.track = true;
  }
  return next();
});

// Setup Organisation depending on Subdomains
router.use(function(req, res, next) {
  if (req.organisationTag) {
    Organisation.findOne({'tag': req.organisationTag}, function(err, organisation) {
      if (err) return next (err);
      if (!organisation) {
        err = new Error('Organisation not found');
        err.status = 404;
        return next(err);
      }
      res.locals.organisation = organisation;
      return next();
    });
  } else return next();

});

module.exports = router;
