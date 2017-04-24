/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 10:47
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

// Check if there is an user
router.use(function(req, res, next) {
  if (!res.locals.user) {
    err = new Error('Not Authenticated');
    err.status = 401;
    return next(err);
  } else return next();
});

// Check if there is an organisation for the user
router.use(function(req, res, next) {
  if (!res.locals.user.hasOrganisation()) {
    err = new Error('No Organisation for user');
    err.status = 418;
    return next(err);
  } else return next();
});

// Check if the user can access the organisation
router.use(function(req, res, next) {
  if (res.locals.organisation &&
    !res.locals.user.belongsToOrganisation(res.locals.organisation._id) ||
    !res.locals.user.superadmin) {
    err = new Error('Forbidden Organisation');
    err.status = 403;
    return next(err);
  } else return next();
});

module.exports = router;
