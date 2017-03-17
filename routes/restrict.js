/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 17-03-2017 06:33
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

// Setup User depending on Auth
router.use(function(req, res, next) {
  if (!req.session.user) {
    err = new Error('Not Allowed');
    err.status = 401;
    return next(err);
  }
  return next();
});

// Setup Organisation depending on Auth
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('No Organisation');
    err.status = 418;
    return next(err);
  }
  return next();
});

module.exports = router;
