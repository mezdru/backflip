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
        req.organisationError = err;
      } else {
        res.locals.organisation = organisation;
      }
      return next();
    });
  } else return next();
});

module.exports = router;
