var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var User = require('../models/user.js');
var Record = require('../models/record.js');
var EmailUser = require('../models/email/email_user.js');
var UrlHelper = require('../helpers/url_helper.js');

router.use('/', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'invite', null, req.getLocale()).getUrl();
  return next();
});

router.get('/', function(req, res, next) {
  res.render('invite');
});

router.post('/',
  sanitizeBody('email').trim().escape().stripLow(true)
);

router.post('/',
  body('email').isEmail().withMessage((value, {req}) => {
    return req.__('Please provide a valid Email Address');
  })
);

router.post('/', function(req, res, next) {
  var errors = validationResult(req);
  res.locals.errors = errors.array() || [];
  if (errors.isEmpty()) {
    User.findOneByEmail(req.body.email, function(err, user) {
      if (err) return next(err);
      if (!user) {
        user = EmailUser.newFromEmail(req.body.email);
      }
      console.log('Invite1');
      user.attachOrgAndRecord(res.locals.organisation, null, function(err, user) {
        if (err) return next(err);
        console.log('Invite2');
        EmailUser.sendInviteEmail(user, res.locals.user, res.locals.organisation, res, function(err, user) {
          console.log('Invite3');
          if (err) return next(err);
          return res.render('index', {title: "User Invited", details: `The person with email ${user.loginEmail} can now sign in to ${res.locals.organisation.name}`});
        });
      });
    });
  } else {
    res.render('invite', { email: req.body.email });
  }

});

module.exports = router;
