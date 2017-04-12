/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 03:56
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var google = require('googleapis');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var User = require('../models/user.js');
var Record = require('../models/record.js');

router.use( function(req, res, next) {
  if (res.locals.user.lenom_admin === true) return next();
  else {
    err = new Error('Forbidden');
    err.status = 403;
    return next(err);
  }
});

module.exports = router;
