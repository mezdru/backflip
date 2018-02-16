var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');
var parseDomain = require('parse-domain');

var User = require('../models/user.js');
var Record = require('../models/record.js');
var AlgoliaOrganisation = require('../models/algolia/algolia_organisation.js');
var UrlHelper = require('../helpers/url_helper.js');
var EmailUser = require('../models/email/email_user.js');
var FullContact = require('../models/fullcontact/fullcontact.js');


// First we check there is an organisation.
// And if the user belongs there
router.use(function(req, res, next) {
  if (!res.locals.organisation) {
    err = new Error('Subdomain required');
    err.status = 400;
    return next(err);
  }
  res.locals.errors = [];
  return next();
});

// Get the record
router.use(function(req, res, next) {
  var myRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
  if (!myRecordId) return next();

  Record.findById(myRecordId).populate('within').exec(function(err, record) {
    if (err) return next(err);
    if (!record) {
      //@todo we could throw an error, but it's better to create a new record for the user
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

router.use(function(req, res, next) {
  res.render('index',
    {
      title: 'Welcome on board',
      details: 'At this moment, this is what you look like',
      content: res.locals.record
    }
  );
  next();
});

//@todo do not do fullContact fetch everytime !
router.use(function(req, res, next) {
  var fullcontact = new FullContact(res.locals.record);
  fullcontact.enrich(function(err, record) {
    if (err) return console.error(err);
    res.locals.record = record;
  });
});


// On post we always expect an _id field matching the record for the current user/organisation
router.post('/:context/:recordId?', function(req, res, next) {
  if(req.params.context === 'add') return next();
  if (req.body._id != res.locals.record._id) {
    err = new Error('Record Mismatch');
    err.status = 500;
    return next(err);
  }
  return next();
});

// If we come from the add view, we instantiate a new record
// We save the record here first, then it's resaved later as an update
// It's because makeWithin creates the record to populate the within array
// @todo find a way to save the record only once.
router.post('/add', function(req, res, next) {
  res.locals.record = new Record({
    organisation: res.locals.organisation._id,
    type: /*req.body.type || */ 'person',
    tag: Record.cleanTag(req.body.tag || req.body.name, req.body.type)
  });
  return next();
});

// If we come from the welcome view, we assemble the 3 desc fields to make description
router.post('/welcome/:recordId', function(req, res, next) {
  req.body.description = (req.body.descDo ? req.body.descDo : "") +
    (req.body.descHelp ?  "\n" + req.body.descHelp : "") +
    (req.body.descLove ? "\n" + req.body.descLove : "") +
    (req.body.descOther ? "\n" + req.body.descOther : "");
  return next();
});

// There could be empty NewLinks, we don't want those
router.post('*', function(req, res, next) {
  req.body.newLinks = req.body.newLinks.filter(newLink => newLink.value);
  if (req.body.newLinks.length === 0) req.body.newLinks = undefined;
  return next();
});


// @todo this is an uploadcare hack, I did not find the way to change the crop setting dynamically... so I put 2 buttons, and switch the one displayed.
router.post('*', function(req, res, next) {
  if (req.body.type === 'hashtag' || req.body.type === 'team' ) {
    req.body.picture = req.body.picture4hashtag;
  }
  return next();
});

// Load the whole organisation records, we'll need those for further use
// Duplicate in google_admin && fullcontact_admin && record_admin
// @todo this is such a bad idea. But makeWithin and makeIncludes require that at the moment
router.post('*', function(req, res, next) {
  if (res.locals.organisation.records) return next();
  res.locals.organisation.populateRecords(function(err, organisation) {
    if (err) return next(err);
    else return next();
  });
});

// We save the record after checking everything is alriqht.
// @this logic handles editing, new recorrds, invitation, cooking merguez and saving the world. Perhaps a bit much?
router.post('/:context/:recordId?', function(req, res, next) {
  req.checkBody(Record.getValidationSchema(res));
  /* @todo ESCAPING & TRIMMING, at the moment we don't because it escapes simple quote...
  req.sanitizeBody('name').trim();
  req.sanitizeBody('name').escape();
  req.sanitizeBody('description').trim();
  req.sanitizeBody('description').escape();
  */
  req.body.picture.url = req.body.picture.url || res.locals.record.picture.url;
  var validationErrors = req.validationErrors();
  if (validationErrors && validationErrors.length > 0) res.locals.errors = res.locals.errors.concat(validationErrors);

  //@todo ESCAPE PICTURE URL !
  res.locals.record = Object.assign(res.locals.record, {name: req.body.name, description: req.body.description, picture: req.body.picture});

  if (res.locals.errors.length === 0) {
    res.locals.record.deleteLinks(req.body.links);
    if (req.body.newLinks) res.locals.record.createLinks(req.body.newLinks);
    res.locals.record.makeWithin(res.locals.organisation, function (err, record) {
      if (err) return next(err);
      res.locals.record.save (function (err) {
        if (err) {
          if (err.code === 11000) {
            res.locals.errors.push({msg:res.__('This tag is already taken')});
            return next();
          }
          return next(err);
        }

        if(req.params.context === 'add') {
          console.log(`ADDED ${res.locals.user.google.email || res.locals.user.email.value} <${res.locals.user._id}> created ${res.locals.record.tag} <${res.locals.record._id}> of ${res.locals.organisation.tag} <${res.locals.organisation._id}>`);
          req.flash('success', res.__("Added!"));
        } else {
          console.log(`EDIT ${res.locals.user.google.email || res.locals.user.email.value} <${res.locals.user._id}> updated ${res.locals.record.tag} <${res.locals.record._id}> of ${res.locals.organisation.tag} <${res.locals.organisation._id}>`);
          req.flash('success', res.__("Saved!"));
        }

        if (res.locals.record.type === "person" && req.body.invite === "yes") {
          let email = res.locals.record.getEmail();
          if (!email) {
            res.locals.errors.push({msg:res.__('Please provide an email to invite this person.')});
            return next();
          }
          EmailUser.addByEmail(email, res.locals.organisation, res.locals.record, function(err, user) {
            if (err) return next(err);
            if (!user) {
              err = new Error('Failed to create or find user to invite');
              err.status = 500;
              return next(err);
            }
            EmailUser.sendInviteEmail(user, res.locals.user, res.locals.organisation, res, function(err, user) {
              if (err) return next(err);
              console.log(`INVITE ${res.locals.user.google.email || res.locals.user.email.value} <${res.locals.user._id}> invited ${user.email.value} <${user._id}> in ${res.locals.organisation.tag} <${res.locals.organisation._id}>`);
              return res.redirect(new UrlHelper(req.organisationTag, null, null, req.getLocale()).getUrl());
            });
          });
        } else {
          var query = req.params.context === 'welcome' ? '?welcomed=true' : null;
          return res.redirect(new UrlHelper(req.organisationTag, null, query, req.getLocale()).getUrl());
        }

      });
    });
  } else return next();
});


// Here we provide the action url to the view.
// Needs some logic because of subdomain handling in development
// @todo find a way to not do this check at each call
router.use('/:context/:recordId?', function(req, res, next) {
  var path =  'edit/' + (req.params.context ? req.params.context + '/' : '' ) + (req.params.recordId || '');
  res.locals.formAction = new UrlHelper(req.organisationTag, path, null, req.getLocale()).getUrl();
  return next();
});

router.use('/:context/:recordId?', function(req, res, next) {
    res.locals.algoliaPublicKey = AlgoliaOrganisation.makePublicKey(res.locals.organisation._id);

    if (undefsafe(res.locals, 'record.type')) {
      res.locals[res.locals.record.type] = true;
    }

    if (undefsafe(res.locals, 'record.picture.url')) {
      var domain = parseDomain(res.locals.record.picture.url);
      if (undefsafe(domain, 'domain') && domain.domain === 'ucarecdn') res.locals.uploadCarePictureUrl = res.locals.record.picture.url;
    }

    if (req.params.context) {
      res.locals[req.params.context] = true;
      res.locals.context = req.params.context;
    }

    res.locals.newLinks = req.body.newLinks;
    return next();
});

router.use('/:context/:recordId?', function(req, res, next) {
  if (req.params.context === 'welcome') {
    //@todo handle multiple lines in the source and spread thema accross the 3 fields
    var descLines = res.locals.record.description.split("\n");
    res.locals.record.descDo = descLines[0];
    if (descLines.length >= 2) res.locals.record.descHelp = descLines[1];
    if (descLines.length >= 3) res.locals.record.descLove = descLines[2];
    if (descLines.length > 3) res.locals.record.descOther = descLines.slice(3).join("\n");
    res.render('edit_welcome', {layout: 'home/layout_home', bodyClass: 'home'});
  } else if (req.params.context === 'add') {
    res.render('edit', {title: 'Add new record', add: true, record: {type: 'person'}});
  } else {
    res.render('edit', {title: 'Edit'});
  }
});

module.exports = router;
