/**
* @Author: Clément Dietschy <bedhed>
* @Date:   16-08-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 16-08-2017 10:21
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var EmailUser = require('../../models/email/email_user.js');

var Organisation = require('../../models/organisation.js');

var UrlHelper = require('../../helpers/url_helper.js');

//@todo deduplicate the /login logic found in auth.js and email_auth.js
router.use('/login', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'email/login/', null, req.getLocale()).getUrl();
  return next();
});

router.get('/login', function(req, res, next) {
  res.render('email_login');
});

router.post('/login', function(req, res, next) {
  if (res.locals.organisation) req.session.redirect_after_login_tag = res.locals.organisation.tag;
  req.session.locale = req.getLocale();
  req.sanitizeBody('email').escape();
  var validationSchema = { email: { isEmail: { errorMessage: 'Wrong email'}}};
  var errors = req.validationErrors();
  if (!errors) {
    EmailUser.getByEmail(req.body.email, function(err, user) {
      if (err) return next(err);
      if (!user) {
        errors = [{msg:res.__('Email not found')}];
        return res.render('email_login', {email: req.body.email, errors: errors});
      }
      EmailUser.sendLoginEmail(user, res, function(err, user) {
        if (err) return next(err);
        return res.render('index', {title: "Email Sent", details: "Check your email to login"});
      });
    });
  } else {
    res.render('email_login', { email: req.body.email, errors: errors });
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
