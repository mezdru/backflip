/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 04-04-2017 10:24
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');
var Organisation = require('../models/organisation.js');

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
    res.locals.user = req.session.user;
  } else {
    res.locals.user = false;
    req.session.redirect_after_login = 'https://' + req.headers.host + req.originalUrl;
  }
  return next();
});

// Setup Organisation depending on Subdomains
router.use(function(req, res, next) {
  var subdomains = req.subdomains;
  // Emulate subdmains in development
  // @todo find a way to avoid doing this development logic in production
  if (req.app.get('env') === 'development') {
    if (req.query.subdomains) {
      subdomains = req.query.subdomains.split('.').reverse();
    }
  }
  if (subdomains.length === 0) {
    res.locals.organisation = false;
    return next();
  } else if (subdomains.length > 1) {
    err = new Error('Too many subdomains');
    err.status = 400;
    return next(err);
  } else if (subdomains[0] === 'www') {
    return res.redirect(301, 'https://lenom.io');
  } else {
    Organisation.findOne({'tag': subdomains[0]}, function(err, organisation) {
      if (err) return next (err);
      if (!organisation) {
        err = new Error('Organisation not found');
        err.status = 404;
        return next(err);
      }
      res.locals.organisation = organisation;
      return next();
    });
  }
});


/* Setup Organisation depending on Auth
router.use(function(req, res, next) {
  if (undefsafe(req.session, '.user._organisation')) {
    res.locals.organisation = true;
  } else {
    res.locals.organisation = false;
  }
  return next();
});*/

module.exports = router;
