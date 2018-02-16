var express = require('express');
var router = express.Router();

router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('No organisation');
    err.status = 403;
    return next(err);
  } else if (!res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
    err = new Error('Must be Admin');
    err.status = 403;
    return next(err);
  } else return next();
});

router.get('/', function(req, res, next) {
  res.render('admin/admin');
});

module.exports = router;
