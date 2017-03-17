/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 17-03-2017
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

// Simple easy logout
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    return res.redirect('/bye');
  });
});

// Auth check
router.use(function(req, res, next) {
  if (!req.session.user) {
    req.session.redirect_after_login = req.originalUrl;
    var err = new Error('Not Authenticated');
    err.status = 401;
    return next(err);
  }
  res.locals.user = true;
  return next();
});

// Organisation check
router.use(function(req, res, next) {
  if (!req.session.user._organisation) {
    var err = new Error('No Organisation');
    err.status = 418;
    return next(err);
  }
  return next();
});

module.exports = router;
