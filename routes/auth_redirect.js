var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');
var Organisation = require('../models/organisation.js');


// Check if user needs Welcoming
//@todo avoid this double redirect on login.
router.get('/', function(req, res, next) {
  if (res.locals.user && res.locals.organisation && res.locals.user.needsWelcomingToOrganisation(res.locals.organisation._id)) {
      //@todo the welcomeToOrganisation is in onboard.js now, we could remove this
      if (req.query.welcomed) {
        res.locals.user.welcomeToOrganisation(res.locals.organisation._id, function(err, user) {if (err) console.error(err);});
      } else {
        //@todo that we need to keep (unless we rewrite the logic to avoid this unecessary second redirect)
        return res.redirect(new UrlHelper(res.locals.organisation.tag, 'onboard/welcome', null, req.session.locale).getUrl());
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
  return res.redirect(new UrlHelper(req.redirectionTag, path, null, req.session.locale || req.getLocale()).getUrl());
});

module.exports = router;
