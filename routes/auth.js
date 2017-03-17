/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 17-03-2017 06:32
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

// Simple easy logout
router.get('/logout', function(req, res, next) {
  req.session.destroy(function(err) {
    if (err) return next(err);
    return res.redirect('/');
  });
});

// Setup User depending on Auth
router.use(function(req, res, next) {
  if (req.session.user) {
    res.locals.user = true;
  } else {
    res.locals.user = false;
    req.session.redirect_after_login = req.originalUrl;
  }
  return next();
});

// Setup Organisation depending on Auth
router.use(function(req, res, next) {
  if (undefsafe(req.session, '.user._organisation')) {
    res.locals.organisation = true;
  } else {
    res.locals.organisation = false;
  }
  return next();
});

module.exports = router;
