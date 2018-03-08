var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var EmailUser = require('../../models/email/email_user.js');

var UrlHelper = require('../../helpers/url_helper.js');


router.use('/invite', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'admin/email/invite/', null, req.getLocale()).getUrl();
  return next();
});

router.get('/invite', function(req, res, next) {
  res.render('admin/email_invite');
});

router.post('/invite',
  sanitizeBody('email').trim().escape().stripLow(true)
);

router.post('/invite',
  body('email').isEmail().withMessage((value, {req}) => {
    return req.__('Please provide a valid Email Address');
  })
);

router.post('/invite', function(req, res, next) {
  var errors = validationResult(req);
  res.locals.errors = errors.array() || [];
  if (errors.isEmpty()) {
    EmailUser.addByEmail(req.body.email, res.locals.organisation, null, function(err, user) {
      if (err) return next(err);
      if (!user) {
        err = new Error('Failed to create or find user to invite');
        err.status = 500;
        return callback(err);
      }
      return res.render('index', {title: "User Added", details: "The person you invited can now sign in."});

      /*EmailUser.sendInviteEmail(user, res.locals.user, res.locals.organisation, res, function(err, user) {
        if (err) return next(err);
        return res.render('index', {title: "Invitation Sent", details: "The person you invited received an invitation email."});
      });*/
    });
  } else {
    res.render('admin/email_invite', { email: req.body.email });
  }

});

module.exports = router;
