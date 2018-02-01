var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var User = require('../../models/user.js');
var EmailUser = require('../../models/email/email_user.js');

router.get('/list', function(req, res, next) {
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id})
  .select('created updated last_login last_action email.value google.email google.hd')
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
