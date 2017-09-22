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

var undefsafe = require('undefsafe');

var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var Application = require('../models/application.js');
var UrlHelper = require('../helpers/url_helper.js');

router.use(function(req, res, next) {
  res.locals.formAction = new UrlHelper(null, 'cheers', null, req.getLocale()).getUrl();
  return next();
});

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
    res.render('home/homepage', {layout: 'home/layout_home', bodyClass: 'home'});
  }
});

router.get('/oldpage', function(req, res, next) {
return res.render('homepage');
});

router.get('/product', function(req, res, next) {
  res.render('home/product', {layout: 'home/layout_home', bodyClass: 'home'});
});

router.get('/pricing', function(req, res, next) {
  res.render('home/pricing', {layout: 'home/layout_home', bodyClass: 'home'});
});

router.get('/terms', function(req, res, next) {
  err = new Error('Not ready yet');
  err.status = 404;
  return next(err);
});

router.get('/privacy', function(req, res, next) {
    err = new Error('Not ready yet');
    err.status = 404;
    return next(err);
});

router.get('/cheers', function(req, res, next) {
  res.render('home/cheers', {layout: 'home/layout_home', bodyClass: 'home', email: undefsafe(res.locals, 'user.google.email') || ''});
});

router.post('/cheers', function(req, res, next) {
  req.sanitizeBody('email').escape();
  req.checkBody(Application.validationSchema);
  var errors = req.validationErrors();
  if (req.body.jeSuisHumain !== 'Oui!') errors = [{msg:'Please enable JS, reload, and try again after 3s.'}];
  if (!errors) {
    application = new Application({
      email: req.body.email,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    application.save( function (err, application) {
      res.render('home/cheers', {layout: 'home/layout_home', bodyClass: 'home', email: application.email});
    });
  } else {
    res.render('home/retry', {layout: 'home/layout_home', bodyClass: 'home', errors: errors, email: req.body.email});
  }
});

router.get('/retry', function(req, res, next) {
  res.render('home/retry', {layout: 'home/layout_home', bodyClass: 'home'});
});


module.exports = router;
