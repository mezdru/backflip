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
var UrlHelper = require('../helpers/url_helper.js');
var Organisation = require('../models/organisation.js');


// Check if user needs Welcoming
router.get('/', function(req, res, next) {
  if (res.locals.user && res.locals.organisation && res.locals.user.needsWelcomingToOrganisation(res.locals.organisation._id)) {
      if (req.query.welcomed) {
        res.locals.user.welcomeToOrganisation(res.locals.organisation._id, function(err, user) {if (err) console.error(err);});
      } else {
        return res.redirect(new UrlHelper(res.locals.organisation.tag, 'edit/welcome/me', null, req.session.locale).getUrl());
      }
  }
  return next();
});

// Catch all login callbacks and touch the user
router.get('*/login/callback', function(req, res, next) {
  if (!req.session.user) {
    err = new Error('Authentification failed');
    err.status = 500;
    return next(err);
  }
  req.session.user.touchLogin(function(err) {
    if (err) return console.error(err);
  });
  return next();
});

// Find the best organisationTag to redirect to.
router.get('*/login/callback', function(req, res, next) {
  // If I got no tag in session, or if the tag is demo
  // redirect_after_login_tag is set by the login route
  if (!req.session.redirect_after_login_tag || req.session.redirect_after_login_tag == 'demo') {
    var firstOrgId = req.session.user.getFirstOrgId();
    if (firstOrgId) {
      Organisation.findById(firstOrgId, 'tag', function(err, organisation) {
        if(err) return next(err);
        req.session.redirect_after_login_tag = organisation.tag;
        return next();
      });
    } else {
      req.session.redirect_after_login_tag = null;
      return next();
    }
  } else {
    return next();
  }
});

// Do the redirect after login callback
router.get('*/login/callback', function(req, res, next) {
  // If I don't have an organisation, I'm redirected to cheers
  var path = req.session.redirect_after_login_tag ? '' : 'cheers';
  return res.redirect(new UrlHelper(req.session.redirect_after_login_tag, path, null, req.session.locale).getUrl());
});

module.exports = router;
