var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation.js');

// Setup Organisation depending on Subdomains
router.use(function(req, res, next) {
  if (req.organisationTag) {
    Organisation.findOne({'tag': req.organisationTag}, function(err, organisation) {
      if (err) return next (err);
      if (!organisation) {
        //@todo throwing this error shortcircuits the auth and therefore renders a logged out error page all the time
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
