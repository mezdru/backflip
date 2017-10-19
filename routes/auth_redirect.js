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
//@todo avoid this double redirect on login.
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

// Find the best organisationTag to redirect to.
router.get('*/login/callback', function(req, res, next) {
  req.redirectionTag = req.redirectionTag ||
    req.organisationTag ||
    req.session.user.getFirstOrgTag() ||
    null;
  var path = req.redirectionTag ? '' : 'cheers';
  req.flash('security', res.__("Signed in!"));
  return res.redirect(new UrlHelper(req.redirectionTag, path, null, req.session.locale).getUrl());
});

module.exports = router;
