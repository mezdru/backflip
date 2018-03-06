var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');
var parseDomain = require('parse-domain');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var Record = require('../models/record.js');
var Organisation = require('../models/organisation.js');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var UrlHelper = require('../helpers/url_helper.js');
var FullContact = require('../models/fullcontact/fullcontact.js');
var LinkHelper = require('../helpers/link_helper.js');


router.use(function(req, res, next) {
  var query = null;
  if (req.query.recordId) {
    query = `?recordId=${req.query.recordId}`;
  }
  res.locals.onboard = {
    welcomeAction: new UrlHelper(req.organisationTag, 'onboard/welcome', query, req.getLocale()).getUrl(),
    introAction: new UrlHelper(req.organisationTag, 'onboard/intro', query, req.getLocale()).getUrl(),
    hashtagsAction: new UrlHelper(req.organisationTag, 'onboard/hashtags', query, req.getLocale()).getUrl(),
    linksAction: new UrlHelper(req.organisationTag, 'onboard/links', query, req.getLocale()).getUrl()
  };
  return next();
});

// First we check there is an organisation.
// If there is an org, we now the user belongs there from restrict.js
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 400;
    return next(err);
  }
  return next();
});

//@todo record the datetime of clic on "I am ready" on the welcome page to validate tos
router.get('/welcome', function(req, res, next) {
  res.render('onboard_welcome', {
    bodyClass: 'onboard onboard-welcome'
  });
});

// Get the record by query
router.use(function(req, res, next) {
  if (!req.query.recordId) return next();
  Record.findById(req.query.recordId, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      let err = new Error('Record not found');
      err.status = 404;
      return next(err);
    }
    if (res.locals.user.ownsRecord(record._id) ||
    res.locals.user.isAdminToOrganisation(res.locals.organisation._id)) {
      res.locals.record = record;
      return next();
    } else {
      let err = new Error('Forbidden Record');
      err.status = 403;
      return next(err);
    }
  });
});

// Get the record by user
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  var myRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
  if (!myRecordId) return next();

  Record.findById(myRecordId, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    if (!record) {
      // we could throw an error, but it's better to create a new record for the user
      return next();
    }
    res.locals.record = record;
    return next();
  });
});

// No Record ? If the user is logged in with Google, we have a chance to find the record by Google Id
var GoogleRecord = require('../models/google/google_record.js');
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  if (!undefsafe(res.locals.user, 'google.id')) return next();

  GoogleRecord.getByGoogleId(res.locals.user.google.id, res.locals.organisation._id, function(err, record) {
    if (err) return next(err);
    res.locals.record = record;
    res.locals.user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
      if (err) return next(err);
      return next();
    });
  });

});

// No Record ? If the user is looged in with Google, we can create one with Google Plus
// @todo do the same to enrich existing record with google plus profile
var googlePlus = require('../models/google/google_plus.js');
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  if (!req.googleOAuth) return next();
  var plus = new googlePlus(req.googleOAuth);

  plus.getRecord(res.locals.organisation._id, function(err, record) {
    record.save(function(err, record) {
      if (err) return next(err);
      res.locals.record = record;
      res.locals.user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
        if (err) return next(err);
        return next();
      });
    });
  });
});

// No Record ? Last Chance, we always have a login email to create a record from :)
router.use(function(req, res, next) {
  if (res.locals.record) return next();

  let record = Record.makeFromEmail(res.locals.user.loginEmail, res.locals.organisation._id);
  record.save(function(err, record) {
    if (err) return next(err);
    res.locals.record = record;
    res.locals.user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
      if (err) return next(err);
      return next();
    });
  });
});

// Finally if we get here, something went wrong
router.use(function(req, res, next) {
  if (res.locals.record) return next();
  var err = new Error('No record found');
  err.status = 400;
  return next(err);
});

// We try our luck with fullcontact to help user fill her profile.
// That can be done after rendering the page ;)
router.post('/welcome', function(req, res, next) {
  var fullcontact = new FullContact(res.locals.record);
  fullcontact.enrich(function(err, record) {
    if (err && err.status !== 418) return console.error(err);
    if (err && err.status === 418) console.log(err.message);
    else console.log(`FullContact lookup for record ${res.locals.record._id}`);
    next();
  });
});

router.post('/welcome', function(req, res, next) {
  res.redirect(res.locals.onboard.introAction);
});

// On post we always expect an _id field matching the record for the current user/organisation
router.post(function(req, res, next) {
  if (req.body._id != res.locals.record._id) {
    err = new Error('Record Mismatch');
    err.status = 500;
    return next(err);
  }
  return next();
});

router.use(function(req, res, next) {
  res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);
  next();
});

//@todo I'm pretty sure we could fetch the wings from Algolia and it would work like a charm.
router.all('/intro', Organisation.getTheWings);

router.all('/intro', function(req, res, next) {
  res.locals.record.hashtags.forEach(function(hashtag) {
      var wing = res.locals.wings.find(wing => wing._id.equals(hashtag._id));
      if (wing) wing.checked = true;
  });
  next();
});

router.all('/hashtags', function(req, res, next) {
  Record.find({organisation: res.locals.organisation._id, type: 'hashtag'})
  .limit(10)
  .exec(function(err, records) {
    if (err) return next(err);
    res.locals.hashtagSuggestions = records;
    next();
  });
});

// To blink the wings (css class 'added') when arriving on hashtags
router.all('/hashtags', Organisation.getTheWings);
router.all('/hashtags', function(req, res, next) {
  res.locals.record.hashtags.forEach(function(hashtag) {
    if (res.locals.wings.some(wing => wing._id.equals(hashtag._id)))
      hashtag.added = true;
  });
  next();
});

// Load the whole organisation records, we'll need those for further use
// Duplicate in google_admin && fullcontact_admin && record_admin
// @todo this is such a bad idea. But makeWithin and makeIncludes require that at the moment
router.post('/intro', function(req, res, next) {
  if (res.locals.organisation.records) return next();
  res.locals.organisation.populateRecords(function(err, organisation) {
    if (err) return next(err);
    else return next();
  });
});

router.post('/intro',
  sanitizeBody('name').trim().escape().stripLow(true),
  sanitizeBody('intro').trim().escape().stripLow(true)
);

router.post('/intro',
  body('name').isLength({ min: 1, max: 64 }).withMessage((value, {req}) => {
    return req.__('Please write a name (no larger than 64 characters).');
  }),
  body('intro').isLength({ max: 256 }).withMessage((value, {req}) => {
    return req.__('Please write an intro no larger than 256 characters.');
  }),
  body('picture.url').optional({checkFalsy: true}).isURL({ protocols: ['https'] }).withMessage((value, {req}) => {
    return req.__('Please provide a valid https:// URL.');
  }),
  //@todo should be in sanitizer
  body('wings').custom((value, { req }) => {
    if (!Array.isArray(value)) {
      if (!value) value = [];
      else value = [value];
    }
    req.body.wings = value;
    return true;
})
);

router.post('/intro', function(req, res, next) {
  res.locals.record.name = req.body.name;
  res.locals.record.intro = req.body.intro;
  res.locals.record.picture.url = req.body.picture.url;
  req.body.wings.forEach((wingId) => {res.locals.wings.find(record => record._id.equals(wingId)).checked = true;});
  var errors = validationResult(req);
  res.locals.errors = errors.array();
  if (errors.isEmpty()) {
    res.locals.record.makeWithin(res.locals.organisation, function(err, records) {
      if (err) return next(err);
      res.locals.record.addHashtags(req.body.wings, res.locals.organisation._id, function(err, records) {
        if (err) return next(err);
        res.locals.record.save(function(err, record) {
          if(err) return next(err);
          res.redirect(res.locals.onboard.hashtagsAction);
        });
      });
    });
  } else {
    next();
  }
});

//@todo should be in sanitizer
router.post('/hashtags',
  body('hashtags').custom((value, { req }) => {
    if (!Array.isArray(value)) {
      if (!value) value = [];
      else value = [value];
    }
    req.body.hashtags = value;
    return true;
  }),
  body('hashtags').custom((value, { req }) => {
    var endIndex = value.findIndex(hashtag => hashtag === "end_of_hashtag_cloud");
    req.body.hashtags.splice(endIndex);
    return true;
  })
);

router.post('/hashtags', function(req, res, next) {
  res.locals.record.makeHashtags(req.body.hashtags, res.locals.organisation._id, function(err, records) {
    if (err) return next(err);
    res.locals.record.save(function(err, record) {
      if (err) return next(err);
      res.redirect(res.locals.onboard.linksAction);
    });
  });
});

//@todo should be in sanitizer
router.post('/links',
  body('links').custom((links, { req }) => {
    if (!links) {
      links = {values: [], types: []};
    }
    if (!Array.isArray(links.values)) {
      if (!links.values) links.values = [];
      else links.values = [links.values];
    }
    if (!Array.isArray(links.types)) {
      if (!links.types) links.types = [];
      else links.types = [links.types];
    }
    req.body.links = links;
    return true;
  })
);

router.post('/links', function(req, res, next) {
  var links = [];
  req.body.links.values.forEach(function(value, index) {
    links.push(LinkHelper.makeLink(value, req.body.links.types[index]));
  });
  res.locals.record.makeLinks(links);
  res.locals.record.save(function(err, record) {
    if (err) return next(err);
    res.locals.user.welcomeToOrganisation(res.locals.organisation._id, function(err, user) {
      if (err) console.error(err);
      return res.redirect(new UrlHelper(res.locals.organisation.tag).getUrl());
    });
  });
});

router.all('/intro', function(req, res, next) {
  res.locals.uploadcareUrl = res.locals.record.getUploadcareUrl() || '';
  res.locals.onboard.step = "intro";
  res.locals.onboard.intro = true;
  res.render('onboard_intro', {
    bodyClass: 'onboard onboard-intro'
  });
});

router.all('/hashtags', function(req, res, next) {
  res.locals.onboard.step = "hashtags";
  res.locals.onboard.hashtags = true;
  res.locals.record.hashtags.forEach(hashtag => hashtag.editable = true);
  res.locals.hashtagSuggestions.forEach(hashtag => hashtag.editable = true);
  res.render('onboard_hashtags', {
    bodyClass: 'onboard onboard-hashtags'
  });
});

router.all('/links', function(req, res, next) {
  res.locals.onboard.step = "links";
  res.locals.onboard.links = true;
  res.locals.record.links.forEach(link => link.editable = true);
  res.render('onboard_links', {
    bodyClass: 'onboard onboard-links'
  });
});

module.exports = router;
