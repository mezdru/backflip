/**
* @Author: Clément Dietschy <bedhed>
* @Date:   16-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 17-03-2017 06:40
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');

/* GET home page. */
router.get('/', function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey('an0th3r0rg@n1s4ti0n');
  res.render('directory');
});

module.exports = router;
