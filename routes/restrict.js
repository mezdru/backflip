var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');

// Check if there is an user
router.use(function(req, res, next) {
  if (!res.locals.user) {
    err = new Error('Not Authenticated');
    err.status = 401;
    return next(err);
  } else return next();
});

// Check if there is an organisation for the user
router.use(function(req, res, next) {
  if (!res.locals.user.hasOrganisation()) {
    return res.redirect(new UrlHelper(null, 'cheers', null, req.session.locale).getUrl());
  } else return next();
});

// Check if the user can access the organisation
router.use(function(req, res, next) {
  if (res.locals.organisation &&
    !res.locals.user.belongsToOrganisation(res.locals.organisation._id)) {
    err = new Error('Forbidden Organisation');
    err.status = 403;
    return next(err);
  } else return next();
});


router.use(function(req, res, next) {
  res.locals.isAdmin = res.locals.user.isAdminToOrganisation(res.locals.organisation._id);
  return next();
});


// We don't want non admin users to access a directory that is not ready (needsWelcoming)
router.use(function(req, res, next) {
  if (res.locals.organisation && res.locals.organisation.needsWelcoming() && !res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) return res.render('error', {status: 204});
  else return next();
});

module.exports = router;
