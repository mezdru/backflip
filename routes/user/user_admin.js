var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var User = require('../../models/user.js');
var Record = require('../../models/record.js');
var EmailUser = require('../../models/email/email_user.js');
var UrlHelper = require('../../helpers/url_helper.js');


router.get('/:userId/attach/:recordId', function(req, res, next) {
  User.findOne({_id: req.params.userId, 'orgsAndRecords.organisation': res.locals.organisation._id})
  .populate('orgsAndRecords.record')
  .populate('orgsAndRecords.organisation', 'name picture tag')
  .exec(function(err, user) {
    if (err) return next(err);
    if (!user) return next(new Error('User not found'));
    Record.findOne({_id: req.params.recordId, organisation: res.locals.organisation._id, type: 'person'}, function(err, record) {
      if (err) return next(err);
      if (!record) return next(new Error('Record not found'));
      user.attachOrgAndRecord(res.locals.organisation, record, function(err, user) {
        if (err) return next(err);
        res.render('index',
          {
            title: 'Attached Record to User',
            details: `Attached record ${record.tag} to user ${user.loginEmail} in org ${res.locals.organisation.name}.`,
            content: user
          }
        );
      });
    });
  });
});

router.get('/list', function(req, res, next) {
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id})
  .select('created updated last_login last_action email.value google.id google.email google.hd orgsAndRecords')
  .sort('-created')
  .exec(function(err, users) {
    if (err) return next(err);
    res.render('index',
      {
        title: 'Users List',
        details: `Found ${users.length} users in ${res.locals.organisation.name}.`,
        content: users
      }
    );
  });
});

router.use('/invite', function(req, res, next) {
  res.locals.formAction = new UrlHelper(req.organisationTag, 'admin/user/invite/', null, req.getLocale()).getUrl();
  return next();
});

router.get('/invite', function(req, res, next) {
  res.render('invite');
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
    User.findOneByEmail(req.body.email, function(err, user) {
      if (err) return next(err);
      if (!user) {
        user = EmailUser.newFromEmail(req.body.email);
      }
      user.attachOrgAndRecord(res.locals.organisation, null, function(err, user) {
        if (err) return next(err);
        return res.render('index', {title: "User Invited", details: `The person with email ${user.loginEmail} can now sign in to ${res.locals.organisation.name}`});
      });

      /*EmailUser.sendInviteEmail(user, res.locals.user, res.locals.organisation, res, function(err, user) {
        if (err) return next(err);
        return res.render('index', {title: "Invitation Sent", details: "The person you invited received an invitation email."});
      });*/
    });
  } else {
    res.render('admin/email_invite', { email: req.body.email });
  }

});

//@todo only works for email users because the email logic is bound to the email auth at the moment
router.get('/monthly/:action?', function(req, res, next) {
  User.find({
    'orgsAndRecords.organisation': res.locals.organisation._id,
    //@todo this next line should not be, this logic should work for all login strategies, plus it responds a false count
    'email.value': {$exists: true}
    })
  .sort({date: -1})
  .populate('orgsAndRecords.record')
  .exec(function(err, users) {
    if (err) return next(err);
    var extractLength = 0;
    var senderRecordId = res.locals.user.getRecordIdByOrgId(res.locals.organisation._id);
    var records = users
      .map(user => user.orgsAndRecords.find(orgAndRecord => res.locals.organisation._id.equals(orgAndRecord.organisation)).record)
      .filter(record => record &&
        !record._id.equals(senderRecordId) &&
        record.description.length > 36 &&
        extractLength++ < 3 );
    res.render('emails/monthly_extract', {layout: false, records: records}, function(err, html) {
      if (req.params.action !== 'send') users = [res.locals.user];
      users.
      forEach(user => EmailUser.sendMonthlyEmail(
        user,
        res.locals.user,
        res.locals.organisation,
        users.length,
        html,
        res,
        function(err, user) {
          if (err) return next(err);
          return console.log(`MONTHLY ${res.locals.user.loginEmail} <${res.locals.user._id}> sent the monthly email to ${user.loginEmail} <${user._id}> from ${res.locals.organisation.tag} <${res.locals.organisation._id}>`);
        }
      ));
      return res.render('index',
        {
          title: 'Monthly',
          details: `Sending ${users.length} emails in ${res.locals.organisation.name}.`,
          content: users.map(user => user.loginEmail)
        }
      );
    });
  });
});

module.exports = router;
