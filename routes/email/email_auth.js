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

// Login redirection from Google login
router.get('/login/callback', function(req, res, next) {
  EmailUser.login(req.query.hash, req.query.token, function(err, user) {
    if (err) return next(err);
    // update session with user credentials
    req.session.user = user;
    // @todo the following logic until is duplicated in google_auth and email_auth
    user.touchLogin(function(err) {
      if (err) return console.error(err);
    });

    if (req.session.redirect_after_login_tag && req.session.redirect_after_login_tag != 'demo') {
      return res.redirect(new UrlHelper(req.session.redirect_after_login_tag, null, null, req.session.locale).getUrl());
    }
    // we don't have session info about redirect, so we guess...
    var firstOrgId = user.getFirstOrgId();
    if (firstOrgId) {
      Organisation.findById(firstOrgId, 'tag', function(err, organisation) {
        if(err) return next(err);
        return res.redirect(new UrlHelper(organisation.tag, null, null, req.session.locale).getUrl());
      });
    } else {
      return res.redirect(new UrlHelper(null, 'cheers', null, req.session.locale).getUrl());
    }
  });
});

module.exports = router;
