var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var EmailUser = require('../../models/email/email_user.js');

var UrlHelper = require('../../helpers/url_helper.js');


router.use('/invite', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'admin/email/invite/', null, req.getLocale()).getUrl();
  return next();
});

router.get('/invite', function(req, res, next) {
  res.render('admin/email_invite');
});

router.post('/invite', function(req, res, next) {
  req.sanitizeBody('email').escape();
  var validationSchema = { email: { isEmail: { errorMessage: 'Wrong email'}}};
  var errors = req.validationErrors();
  if (!errors) {
    EmailUser.addByEmail(req.body.email, res.locals.organisation, null, function(err, user) {
      if (err) return next(err);
      if (!user) {
        err = new Error('Failed to create or find user to invite');
        err.status = 500;
        return callback(err);
      }
      EmailUser.sendInviteEmail(user, res.locals.user, res.locals.organisation, res, function(err, user) {
        if (err) return next(err);
        return res.render('index', {title: "Invitation Sent", details: "The person you invited received an invitation email."});
      });
    });
  } else {
    res.render('admin/email_invite', { email: req.body.email, errors: errors });
  }

});

module.exports = router;
