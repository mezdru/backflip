/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 12:26
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();

var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');

/* GET homepage depending on context */
router.get('/', function(req, res, next) {
  if (res.locals.organisation) {
    if (res.locals.organisation.public === true) {
      //@todo deduplicate these next 10 lines with private.js / public.js
      res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
      res.locals.orgTree = res.locals.organisation.tree;
      res.locals.isDevelopment = req.app.get('env') == 'development';
      // careful, switching to false breaks intro_auto
      res.locals.intro = true;
      res.locals.beta = true;
      if (res.locals.organisation.tag === 'demo') res.locals.intro_auto = true;
      if (res.locals.user) {
        res.locals.isMyOrg = res.locals.user.belongsToOrganisation(res.locals.organisation._id);
        res.locals.myRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
        res.locals.isAdmin = res.locals.user.isAdminToOrganisation(res.locals.organisation._id);
      } else {
        res.locals.isAdmin = false;
        res.locals.myRecordId = false;
        res.locals.isMyOrg = false;
      }
      res.render('directory', {search: true});
    } else if (!res.locals.user) {
      return res.render('organisation_homepage');
    } else {
      return next();
    }
  } else {
    return res.render('homepage');
  }
});

router.get('/homepage', function(req, res, next) {
  res.render('home/homepage2', {layout: 'home/layout_home'});
});


module.exports = router;
