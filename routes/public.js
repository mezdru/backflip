/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 07-04-2017 11:00
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');

/* GET homepage depending on context */
router.get('/', function(req, res, next) {
  if (res.locals.organisation) {
    if (res.locals.organisation.public === true) {
      res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
      res.locals.isAdmin = false;
      res.locals.myRecordId = false;
      res.render('directory');
    } else if (!res.locals.user) {
      return res.render('organisation_homepage');
    } else {
      return next();
    }
  } else {
    return res.render('homepage');
  }
});


module.exports = router;
