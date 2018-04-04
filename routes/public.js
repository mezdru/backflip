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
      res.locals.beta = true;
      if (res.locals.organisation.tag === 'demo') res.locals.intro = {auto: true};
      if (res.locals.user) {
        res.locals.isMyOrg = res.locals.user.belongsToOrganisation(res.locals.organisation._id);
        res.locals.myRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
        res.locals.isAdmin = res.locals.user.isAdminToOrganisation(res.locals.organisation._id);
        res.locals.isCreator = true;
      } else {
        res.locals.isAdmin = false;
        res.locals.myRecordId = false;
        res.locals.isMyOrg = false;
      }
      //@todo handle searchQuery
      res.render('search', {bodyClass: 'search', search: true, searchInput: true, searchQuery: req.params.query});
    } else if (!res.locals.user) {
      res.render('signin', {googleSignin: undefsafe(res.locals.organisation, 'google.hd'), emailSignin:undefsafe(res.locals.organisation, 'email.domains'), bodyClass: 'signin'});
    } else {
      return next();
    }
  } else {
    res.render('home/home', {bodyClass: 'home', googleSignin: true, emailSignin: true, home: true});
  }
});

router.get('/product', function(req, res, next) {
  res.render('home/product', {layout: 'home/layout_home', bodyClass: 'home product'});
});

router.get('/why', function(req, res, next) {
  res.render('home/why', {layout: 'home/layout_home', bodyClass: 'home why'});
});

router.get('/pricing', function(req, res, next) {
  res.render('home/pricing', {layout: 'home/layout_home', bodyClass: 'home pricing'});
});

router.get('/privacy', function(req, res, next) {
  res.render('home/privacy', {layout: 'home/layout_home', bodyClass: 'home privacy'});
});

router.get('/terms', function(req, res, next) {
  res.render('home/privacy', {layout: 'home/layout_home', bodyClass: 'home privacy'});
});

router.get('/security', function(req, res, next) {
  res.render('home/privacy', {layout: 'home/layout_home', bodyClass: 'home privacy'});
});

router.get('/cheers', function(req, res, next) {
  res.render('home/cheers', {layout: 'home/layout_home', bodyClass: 'home cheers', email: undefsafe(res.locals, 'user.google.email') || ''});
});

router.post('/cheers', function(req, res, next) {
  req.sanitizeBody('email').escape();
  req.checkBody(Application.getValidationSchema(res));
  var errors = req.validationErrors();
  if (req.body.jeSuisHumain !== 'Oui!') errors = [{msg:'Please enable JS, reload, and try again after 3s.'}];
  if (!errors) {
    application = new Application({
      email: req.body.email,
      ip: req.headers['x-forwarded-for'] || req.connection.remoteAddress
    });
    application.save( function (err, application) {
      res.render('home/cheers', {layout: 'home/layout_home', bodyClass: 'home cheers', email: application.email});
    });
  } else {
    res.render('home/retry', {layout: 'home/layout_home', bodyClass: 'home retry', errors: errors, email: req.body.email});
  }
});

router.get('/retry', function(req, res, next) {
  res.render('home/retry', {layout: 'home/layout_home', bodyClass: 'home retry'});
});


module.exports = router;
