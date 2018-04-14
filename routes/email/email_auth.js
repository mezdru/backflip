var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var User = require('../../models/user.js');
var EmailUser = require('../../models/email/email_user.js');

var Organisation = require('../../models/organisation.js');

var UrlHelper = require('../../helpers/url_helper.js');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

router.post('/login',
  sanitizeBody('email').trim().escape().stripLow(true)
);

router.post('/login',
  body('email').isEmail().withMessage((value, {req}) => {
    return req.__('Please provide a valid Email Address');
  }),
  body('jeSuisHumain')
    .custom(value => value === 'Oui!')
    .withMessage((value, {req}) => req.__('Please enable Javascript and retry'))
);


router.post('/login', function(req, res, next) {
  req.session.locale = req.getLocale();
  var errors = validationResult(req);
  res.locals.errors = errors.array() || [];
  if (errors.isEmpty()) {
    User.findOneByEmail(req.body.email, function(err, user) {
      if (err) return next(err);
      var organisation = res.locals.organisation;
      if (!user) {
        user = EmailUser.newFromEmail(req.body.email);
      } else if (!user.canEmailSignin()) {
        EmailUser.addStrategy(req.body.email, user);
      } else if (EmailUser.tooSoon(user)) {
        res.locals.errors.push({msg: res.__('Email already sent, check your inbox!')});
      }

      if (organisation && !user.belongsToOrganisation(organisation._id)) {
       organisation = null;
      }

      if (res.locals.errors.length > 0) return res.render('signin', {bodyClass: 'signin', googleSignin:true, emailSignin:true, email: req.body.email});

      EmailUser.sendLoginEmail(user, organisation, res, function(err, user) {
        if (err) return next(err);
        return res.render('signin_success', {bodyClass: 'home signin', email: req.body.email, home: true});
      });
    });
  } else {
    return res.render('signin', {bodyClass: 'signin', googleSignin:true, emailSignin:true, email: req.body.email});
  }
});

// Login redirection
router.get('/login/callback', function(req, res, next) {
  EmailUser.login(req.query.hash, req.query.token, function(err, user) {
    if (err) return next(err);
    // update session with user credentials
    req.session.user = user;
    return next();
  });
});

module.exports = router;
