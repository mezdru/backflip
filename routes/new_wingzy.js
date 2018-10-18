var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');
var parseDomain = require('parse-domain');
var uploadcare = require('uploadcare')(process.env.UPLOADCARE_PUBLIC_KEY, process.env.UPLOADCARE_PRIVATE_KEY);

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var Organisation = require('../models/organisation.js');
var UrlHelper = require('../helpers/url_helper.js');
var LinkHelper = require('../helpers/link_helper.js');

router.use(function(req, res, next) {
  if (!res.locals.user) {
    return res.redirect(UrlHelper.makeUrl(req.organisationTag, 'login', null, req.getLocale()));
  } else return next();
});

router.use(function(req, res, next) {
  res.locals.formAction = UrlHelper.makeUrl(null, 'new', null, req.getLocale());
  res.locals.backUrl = UrlHelper.makeUrl(null, 'cheers', null, req.getLocale());
  return next();
});

router.post('/',
  sanitizeBody('tag').trim().escape().stripLow(true),
  sanitizeBody('name').trim().escape().stripLow(true),
  sanitizeBody('logo').trim().escape().stripLow(true)
);

router.post('/',
  body('tag').matches(/^[a-zA-Z0-9\-]{2,}$/).withMessage((value, {req}) => {
    return req.__('Please provide a valid tag.');
  }),
  body('name').isLength({ min: 3 }).withMessage((value, {req}) => {
    return req.__('Please provide a valid name.');
  }),
  body('logo.url').isURL().optional({checkFalsy:true}).withMessage((value, {req}) => {
    return req.__('Please provide a valid {{field}} URL.', {field: 'Logo'});
  })
);

/**
 * @description Save new organisation
 */
router.post('/', function(req, res, next) {
  var errors = validationResult(req);
  res.locals.errors = errors.array();
  res.locals.newOrganisation = new Organisation({
    tag: req.body.tag,
    name: req.body.name,
    creator: res.locals.user._id
  });
  res.locals.newOrganisation.logo.url = req.body.logo.url;
  if (req.body.activateDomainLogin && req.body.domainForLogin) {
    res.locals.newOrganisation.addEmailDomain(req.body.domainForLogin);
    if (req.body.googleForLogin) res.locals.newOrganisation.addGoogleHD(req.body.domainForLogin);
  }
  if (errors.isEmpty()) {
    res.locals.newOrganisation.save(function(err, organisation) {
      if(err) {
        if (err.code === 11000) {
          res.locals.errors.push({msg: req.__('Aha! There is already a Wingzy at %s, maybe you should ask for an invitation?', req.body.tag + '.' + process.env.HOST)});
          return next();
        }
        return next(err);
      }
      if (res.locals.user.isSuperAdmin()) {
        res.redirect(UrlHelper.makeUrl(organisation.tag, 'admin/organisation', null, req.getLocale()));
      } else {
        res.locals.user.makeAdminToOrganisation(organisation, function(err, user) {
          if(err) return next(err);
          // redirect to the congratulations page
          res.redirect(UrlHelper.makeUrl(organisation.tag, 'onboard/congratulations', '?first=true', req.getLocale()));
        });
      }
    });
  } else next();
});

router.all('/', function(req, res, next) {
  if (undefsafe(res.locals, 'user.google.hd')) {
    res.locals.newOrganisation = new Organisation({
      name: res.locals.user.google.hd.split('.')[0].charAt(0).toUpperCase() + res.locals.user.google.hd.split('.')[0].slice(1),
      tag: res.locals.user.google.hd.split('.')[0]
    });
    res.locals.domainForLogin = res.locals.user.google.hd;
    res.locals.googleForLogin = true;
  }
  next();
});

const allEmailProviders = require('email-providers/all.json');
router.all('/', function(req, res, next) {
  if (undefsafe(res.locals, 'user.email.value')) {
    var domain = res.locals.user.email.value.split('@')[1];
    if (!allEmailProviders.includes(domain)) {
      res.locals.newOrganisation = new Organisation({
        name: domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1),
        tag: domain.split('.')[0]
      });
      res.locals.domainForLogin = domain;
    }
  }
  next();
});

router.all('/', function(req, res, next){
  res.locals.uploadcarePublicKey = process.env.UPLOADCARE_PUBLIC_KEY;
  next();
});

router.all('/', function(req, res, next){
  res.render('new_wingzy', {
      bodyClass: 'new-wingzy'
  });
});

router.all('/presentation', function(req, res, next) {
  res.locals.createNewWingzyUrl = UrlHelper.makeUrl(null, 'new', null, req.getLocale());
  res.render('new_wingzy_presentation', {
    bodyClass: 'presentation-new'
  });
});

module.exports = router;
