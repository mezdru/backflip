var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');

// Check if there is an user
router.use(function(req, res, next) {
  if (!res.locals.user) {
    return res.redirect(UrlHelper.makeUrl(req.organisationTag, 'login', null, req.getLocale()));
  } else return next();
});

module.exports = router;
