var express = require('express');
var router = express.Router();
var undefsafe = require('undefsafe');

const { body,validationResult } = require('express-validator/check');
const { sanitizeBody } = require('express-validator/filter');

var User = require('../../models/user.js');
var Record = require('../../models/record.js');
var EmailUser = require('../../models/email/email_user.js');
var EmailHelper = require('../../helpers/email_helper.js');
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

router.get('/:userId/unwelcome', function(req, res, next) {
  User.findOne({_id: req.params.userId, 'orgsAndRecords.organisation': res.locals.organisation._id})
  .exec(function(err, user) {
    if (err) return next(err);
    if (!user) return next(new Error('User not found'));
    user.unwelcomeToOrganisation(res.locals.organisation._id, function(err, user) {
      if (err) return next(err);
      res.render('index',
        {
          title: 'User Unwelcomed',
          details: `User ${user.loginEmail} must reonboard to ${res.locals.organisation.name}.`,
          content: user
        }
      );
    });
  });
});

router.get('/:userId/ban', function(req, res, next) {
  User.findOne({_id: req.params.userId, 'orgsAndRecords.organisation': res.locals.organisation._id})
  .exec(function(err, user) {
    if (err) return next(err);
    if (!user) return next(new Error('User not found'));
    user.detachOrg(res.locals.organisation._id, function(err, user) {
      if (err) return next(err);
      res.render('index',
        {
          title: req.__('User banned'),
          details:  req.__('The user {{loginEmail}} has been banned from {{{organisation}}}.<br/>If you want to remove his/her record from this Wingzy, please go to <strong>profile > remove</strong>.', {loginEmail: user.loginEmail, organisation: res.locals.organisation.name}),
          content: res.locals.user.isSuperAdmin() ? user : null
        }
      );
    });
  });
});

router.get('/unwelcomeAll', function(req, res, next) {
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id})
  .exec(function(err, users) {
    if (err) return next(err);
    var saved = 0;
    users.forEach(user => {
      user.unwelcomeToOrganisation(res.locals.organisation._id, function(err, user) {
        if (err) return next(err);
        saved++;
        if (saved === users.length) {
          res.render('index',
            {
              title: 'Users Unwelcomed',
              details: `Unwelcomed ${users.length} users in ${res.locals.organisation.name}.`,
              content: users
            }
          );
        }
      });
    });
  });
});


router.get(['/list/reinvite/:userIdToInvite', '/list/:sort?'], function(req, res, next) {
  var sort = req.params.sort || '-created';
  User.find({'orgsAndRecords.organisation': res.locals.organisation._id})
  .select('_id created updated last_login last_action email.value google.id google.email google.hd orgsAndRecords invitations')
  .populate('orgsAndRecords.record')
  .sort(sort)
  .exec(function(err, users) {
    if (err) return next(err);
    let userToInvite;
    users.forEach(user => {
      user.recordTag = user.getRecordTagByOrgId(res.locals.organisation._id);
      user.shouldOnboard = user.getOrgAndRecord(res.locals.organisation._id).welcomed;
    });
    if(req.params.userIdToInvite) {
      userToInvite = users.find(user => user._id.equals(req.params.userIdToInvite));
      EmailUser.sendInviteEmail(
        userToInvite,
        res.locals.user,
        res.locals.organisation,
        null,
        res, function(err, result){
          if(err) console.log(err);
        });
    }
    res.render('admin/user_list',
      {
        title: req.__('We have sent an invitation to {{{email}}} !', {email: userToInvite.loginEmail}),
        details: req.__('Woaw, there are {{{count}}} users in {{{organisation}}} !', {count: users.length, organisation: res.locals.organisation.name}),
        users: users,
        bodyClass: 'user-list'
      }
    );
  });
});

router.all('/email/spread', function(req, res, next) {
  res.locals.spreadAction = UrlHelper.makeUrl(req.organisationTag, 'admin/user/email/spread/', null, req.getLocale());
  res.locals.backUrl = UrlHelper.makeUrl(req.organisationTag, 'admin/', null, req.getLocale());
  next();
});

router.all('/email/spread', function(req, res, next) {
  User.find({
    'orgsAndRecords.organisation': res.locals.organisation._id
    })
  .populate('orgsAndRecords.record')
  .exec(function(err, users) {
    if (err) return next(err);
    // it's ok when user hasn't any org yet.
    res.locals.recipientUsers = users.filter(user => typeof(user.last_login) !== 'undefined');
    res.locals.recipientsUsersRecords = res.locals.recipientUsers
      .map(user => user.getRecord(res.locals.organisation._id))
      .filter(record => record && record != {});
    return next();
  });
});



router.post('/email/spread',
  sanitizeBody('text').trim().escape().stripLow(true)
);

router.post('/email/spread',
  body('text').isLength({ max: 1280 }).withMessage((value, {req}) => {
    return req.__('{{field}} Cannot be longer than {{length}} characters', {field: 'Text', length: 1280});
  })
);

router.post('/email/spread', function(req, res, next) {
  var errors = validationResult(req);
  res.locals.errors = errors.array();
  if (errors.isEmpty()) {
    res.locals.recipientUsers.forEach(user => {
        EmailHelper.public.emailSpread(
          user.getName(res.locals.organisation._id).split(' ')[0],
          user.loginEmail,
          res.locals.user.getName(res.locals.organisation._id),
          res.locals.user.loginEmail,
          res.locals.organisation.name,
          UrlHelper.makeUrl(res.locals.organisation.tag, 'invite'),
          req.body.text.replace(/([^>\r\n]?)(\r\n|\n\r|\r|\n)/g, '$1' + '<br>' + '$2'),
          res
        );
  });
    return res.render('index',
      {
        title: req.__('Sent'),
        details: req.__('The email was sent to {{recipientsCount}} people', {recipientsCount: res.locals.recipientUsers.length}),
        content: res.locals.recipientUsers.map(user => user.loginEmail)
      }
    );
  }
});

//@todo only works for email users because the email logic is bound to the email auth at the moment
router.get('/email/spread', function(req, res, next) {
    return res.render('admin/user_email_spread',
      {
        text: req.__(
          "Dear Ambassador,\n\nYou are already {{recordsCount}} on the Wingzy of {{organisationName}}.\n\nNow, what about inviting more people of {{organisationName}} to spread their Wings? The more on Wingzy, the more relevant it becomes...",
          {
            organisationName: res.locals.organisation.name,
            recordsCount: res.locals.recipientsUsersRecords.length,
          }),
        recipients: res.locals.recipientUsers.map(user => user.loginEmail)
      }
    );
});

router.get('/email/resend', function(req, res, next){
  User.find({
    'orgsAndRecords.organisation': res.locals.organisation._id
    }).then((users)=>{
      res.locals.recipientUsers = users;
      return next();
    }).catch(error=>{
      return next(error);
    });
});

router.get('/email/resend', function(req, res, next){
  let counterSendEmail = 0;
  let emailsSended = [];
  res.locals.recipientUsers.forEach(user => {
    let userLastInvitation = user.findLastInvitation(res.locals.organisation._id);
    if(!user.last_login && userLastInvitation && daysBetween(userLastInvitation.created, new Date()) >= 0){
      EmailUser.sendInviteEmail(
        user,
        res.locals.user,
        res.locals.organisation,
        null,
        res, function(err, result){
          if(err) console.log(err);
        });
        counterSendEmail++;
        emailsSended.push(user.loginEmail);
    }
  });
  return res.render('index',
      {
        title: req.__('Sent'),
        details: req.__('The email was sent to {{recipientsCount}} people', {recipientsCount: counterSendEmail}),
        content: emailsSended
      }
    );
});

//@todo create utils helper
let daysBetween = function(date1, date2){
  var one_day=1000*60*60*24;
  var date1_ms = date1.getTime();
  var date2_ms = date2.getTime();
  var difference_ms = date2_ms - date1_ms;
  // Convert back to days and return
  return Math.round(difference_ms/one_day);
}


module.exports = router;
