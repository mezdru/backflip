var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');
var Organisation = require('../models/organisation.js');



//Catch the error thrown when setup organisation : the subdomain is wrong
//(we still wen't through auth but need to display the error now)
router.use(function(req, res, next) {
  if (req.organisationError) return next(req.organisationError);
  return next();
});


// Check if user needs Welcoming
//@todo avoid this double redirect on login.
router.get('/search', function(req, res, next) {
  if (res.locals.user && res.locals.organisation && res.locals.user.needsWelcomingToOrganisation(res.locals.organisation._id)) {
    return res.redirect(new UrlHelper(res.locals.organisation.tag, 'onboard/welcome', null, req.session.locale).getUrl());
  }
  return next();
});

// Find the best organisationTag to redirect to.
router.get('*/login/callback', function(req, res, next) {
  req.redirectionTag = req.redirectionTag ||
    req.organisationTag ||
    req.session.user.getFirstOrgTag() ||
    null;
  var path = req.redirectionTag ? 'search' : 'cheers';
  return res.redirect(new UrlHelper(req.redirectionTag, path, null, req.session.locale || req.getLocale()).getUrl());
});

module.exports = router;
