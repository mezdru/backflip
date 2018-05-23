var express = require('express');
var router = express.Router();
var UrlHelper = require('../helpers/url_helper.js');
var UrlHelper = require('../helpers/url_helper.js');
var undefsafe = require('undefsafe');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

router.get('/makePublic', function(req, res, next) {
  res.locals.organisation.makePublic(function(err, organisation) {
    res.render('index', {
      title: 'Organisation made Public',
      content: organisation
    });
  });
});

router.use(function(req, res, next) {
  res.locals.formAction = UrlHelper.makeUrl(req.organisationTag, 'admin/organisation/', null, req.getLocale());
  res.locals.backUrl = UrlHelper.makeUrl(req.organisationTag, null, null, req.getLocale());
  return next();
});

// On post we always expect an _id field matching the record for the current user/organisation
router.post('*', function(req, res, next) {
  if (!res.locals.organisation._id.equals(req.body._id)) {
    err = new Error('Organisation Mismatch');
    err.status = 403;
    return next(err);
  }
  return next();
});

router.post('/',
  sanitizeBody('tag').trim().escape().stripLow(true),
  sanitizeBody('name').trim().escape().stripLow(true),
  sanitizeBody('logo').trim().escape().stripLow(true),
  sanitizeBody('picture').trim().escape().stripLow(true),
  sanitizeBody('css').trim().escape().stripLow(true)
);

router.post('/',
  body('tag').matches(/^[a-z0-9\-]*$/).withMessage((value, {req}) => {
    return req.__('Please provide a valid tag.');
  }),
  body('name').isLength({ min: 3 }).withMessage((value, {req}) => {
    return req.__('Please provide a valid name.');
  }),
  body('css').isLength({ max: 1280 }).withMessage((value, {req}) => {
    return req.__('{{field}} Cannot be longer than {{length}} characters', {field: 'CSS', length: 1280});
  }),
  body('logo.url').isURL().optional({checkFalsy:true}).withMessage((value, {req}) => {
    return req.__('Please provide a valid Logo URL.');
  }),
  body('picture.url').isURL().optional({checkFalsy:true}).withMessage((value, {req}) => {
    return req.__('Please provide a valid Picture URL.');
  })
);

router.post('/', function(req, res, next) {
  var errors = validationResult(req);
  res.locals.errors = errors.array();
  if (res.locals.user.isSuperAdmin()) res.locals.organisation.tag = req.body.tag;
  res.locals.organisation.name = req.body.name;
  res.locals.organisation.logo.url = req.body.logo.url;
  res.locals.organisation.picture.url = req.body.picture.url;
  res.locals.organisation.canInvite = req.body.canInvite;
  res.locals.organisation.style.css = req.body.css;
  if (errors.isEmpty()) {
    res.locals.organisation.save(function(err, organisation) {
      if(err) return next(err);
      res.redirect(UrlHelper.makeUrl(organisation.tag, null, null, req.getLocale()));
    });
  } else next();
});

router.all('/', function(req, res, next) {
  res.locals.uploadcarePublicKey = process.env.UPLOADCARE_PUBLIC_KEY;
  res.render('admin/organisation', { bodyClass: 'admin'});
});

module.exports = router;
