/**
* @Author: Clément Dietschy <bedhed>
* @Date:   30-10-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 30-10-2017 09:06
* @Copyright: Clément Dietschy 2017
*/

var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

var User = require('../../models/user.js');
var EmailUser = require('../../models/email/email_user.js');

router.get('/list', function(req, res, next) {
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id})
  .populate('orgsAndRecords.record')
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

router.get('/monthly/:action?', function(req, res, next) {
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id})
  .populate('orgsAndRecords.record')
  .exec(function(err, users) {
    if (err) return next(err);
    var extractLength = 0;
    var records = users
      .map(user => user.orgsAndRecords.find(orgAndRecord => res.locals.organisation._id.equals(orgAndRecord.organisation)).record)
      .filter(record => record && record.description.length > 36 && extractLength++ < 4 );
    res.render('emails/monthly_extract', {layout: false, records: records}, function(err, html) {
      if (req.params.action !== 'send') users = [res.locals.user];
      res.render('index',
        {
          title: 'Monthly',
          details: `Sending ${users.length} emails in ${res.locals.organisation.name}.`,
          content: users.map(user => user.loginEmail)
        }
      );
      users.
      forEach(user => EmailUser.sendMonthlyEmail(
        user,
        res.locals.user,
        res.locals.organisation,
        users.length,
        html,
        res,
        function(err, user) {
          return console.log(`MONTHLY ${res.locals.user.loginEmail} <${res.locals.user._id}> sent the monthly user to ${user.loginEmail} <${user._id}> from ${res.locals.organisation.tag} <${res.locals.organisation._id}>`);
        }
      ));
    });
  });
});

module.exports = router;
