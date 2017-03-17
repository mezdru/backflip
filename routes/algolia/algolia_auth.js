/**
* @Author: Clément Dietschy <bedhed>
* @Date:   16-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 17-03-2017
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var AlgoliaOrganisation = require('../../models/algolia/algolia_organisation.js');

// Populate res with Algolia Public Key
router.use(function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(req.session.user._organisation._id);
  return next();
});

module.exports = router;
