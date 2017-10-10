/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 06:04
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation.js');

// Setup Organisation depending on Subdomains
router.use(function(req, res, next) {
  if (req.organisationTag) {
    Organisation.findOne({'tag': req.organisationTag}, function(err, organisation) {
      if (err) return next (err);
      if (!organisation) {
        err = new Error('Organisation not found');
        err.status = 404;
        return next(err);
      }
      res.locals.organisation = organisation;
      return next();
    });
  } else return next();
});

module.exports = router;
