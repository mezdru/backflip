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
  sanitizeBody('picture').trim().escape().stripLow(true)
);

//@todo tag validation is far from good
router.post('/',
  body('tag').isAscii().withMessage((value, {req}) => {
    return req.__('Please provide a valid tag.');
  }),
  body('name').isLength({ min: 3 }).withMessage((value, {req}) => {
    return req.__('Please provide a valid name.');
  }),
  body('logo.url').isURL().withMessage((value, {req}) => {
    return req.__('Please provide a valid Logo URL.');
  }),
  body('picture.url').isURL().withMessage((value, {req}) => {
    return req.__('Please provide a valid Picture URL.');
  })
);

router.post('/', function(req, res, next) {
  var errors = validationResult(req);
  res.locals.errors = errors.array();
  res.locals.organisation.tag = req.body.tag.toLowerCase();
  res.locals.organisation.name = req.body.name;
  res.locals.organisation.logo.url = req.body.logo.url;
  res.locals.organisation.picture.url = req.body.picture.url;
  if (errors.isEmpty()) {
    res.locals.organisation.save(function(err, organisation) {
      if(err) return next(err);
      res.redirect(UrlHelper.makeUrl(organisation.tag, null, null, req.getLocale()));
    });
  } else next();
});

router.all('/', function(req, res, next) {
  res.render('admin/organisation', { bodyClass: 'admin'});
});

module.exports = router;
