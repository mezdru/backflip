var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 403;
    return next(err);
  }

  if (res.locals.user.isAdminToOrganisation(res.locals.organisation._id) ||
  res.locals.user.isSuperAdmin()) {
    res.locals.isSuperAdmin = res.locals.user.isSuperAdmin();
    return next();
  }

  err = new Error('Must be Admin');
  err.status = 403;
  return next(err);
});

module.exports = router;
