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

router.post('/login', function(req, res, next) {
  req.session.locale = req.getLocale();
  req.sanitizeBody('email').escape();
  var validationSchema = { email: { isEmail: { errorMessage: res.__('Wrong email')}}};
  var errors = req.validationErrors();
  if (!errors) {
    EmailUser.getByEmail(req.body.email, function(err, user) {
      if (err) return next(err);
      errors = [];
      if (!user) errors.push({msg:res.__('Email not found')});
      else if (res.locals.organisation && !user.belongsToOrganisation(res.locals.organisation._id)) errors.push({msg:res.__('This email does not belong to this organisation')});
      else if (EmailUser.tooSoon(user)) errors.push({msg: res.__('Email already sent, check your inbox!')});

      if (errors.length > 0) return res.render('home/signin', {layout: 'home/layout_home', bodyClass: 'home', email: req.body.email, errors: errors});

      EmailUser.sendLoginEmail(user, res.locals.organisation, res, function(err, user) {
        if (err) return next(err);
        return res.render('home/signin_success', {layout: 'home/layout_home', bodyClass: 'home', email: req.body.email});
      });
    });
  } else {
    return res.render('home/signin', {layout: 'home/layout_home', bodyClass: 'home', email: req.body.email, errors: errors});
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
