var EmailUser = require('../models/email/email_user');
var User = require('../models/user');
var EmailHelper = require('../helpers/email_helper');
var UrlHelper = require('../helpers/url_helper');
var SlackHelper = require('../helpers/slack_helper');
var HelpRequest = require('../models/helpRequest');
var SkillsProposition = require('../models/skillsProposition');

exports.unsubscribeCallback = async (req, res, next) => {
  try {

    let userToUnsub = await User.findOne({ 'email.hash': req.params.hash, 'email.token': req.params.token });
    if (!userToUnsub) return res.render('emails/unsubscribe', { success: false, errorMessage: res.__("User not found. Please <a href='mailto:contact@wingzy.com'>contact us</a>") });
    userToUnsub.isUnsubscribe = true;
    await userToUnsub.save();
    if (process.env.NODE_ENV === 'production') SlackHelper.notify('#alerts', 'An User (' + userToUnsub._id + ') unsubscribe from auto-tranctionnal emails (' + userToUnsub.loginEmail + ')');
    return res.render('emails/unsubscribe', { success: true, userEmail: userToUnsub.loginEmail });

  } catch (e) {
    console.error(e);
    return res.render(
      'emails/unsubscribe',
      {
        success: false,
        errorMessage: res.__("An unexpected error occured. Please <a href='mailto:contact@wingzy.com'>contact us</a>")
      }
    );
  }
}

exports.sendSecurityNotification = async (req, res, next) => {
  let accessToken = (req.headers.authorization.split('Bearer ').length > 1 ? req.headers.authorization.split('Bearer ')[1] : null);

  EmailUser.sendNewIntegrationEmail(req.user, req.params.integrationName, accessToken, res)
    .then(() => {
      req.backflip = { status: 200, message: 'Email sent with success.' };
      return next();
    }).catch(err => next(err));
}

exports.sendAskConfirmation = async (req, res, next) => {
  await EmailUser.sendEmailConfirmation(req.user, res, req.params.orgTag).catch(err => next(err));

  let Agenda = require('../models/agenda_scheduler');
  Agenda.scheduleJobWithTiming('sendEmailConfirmation', {userId: req.user._id, orgTag: req.params.orgTag});

  req.backflip = { status: 200, message: 'Email sent with success.' };
  return next();
}

exports.askConfirmationCallback = async (req, res, next) => {
  EmailUser.login(req.params.hash, req.params.token, function (err, user) {
    if (err) return next(err);
    if (user.email.validated) return res.redirect(new UrlHelper(req.organisationTag, 'login/callback', null, req.getLocale()).getUrl());
    res.locals.user = user;
    req.session.user = user;
    user.email.validated = true;
    User.updateOne({ '_id': user._id }, { $set: { email: user.email } })
      .then(() => {
        return res.redirect(
          (process.env.NODE_ENV == 'development' ? 'http://' : 'https://') +
          process.env.HOST_FRONTFLIP
        );
      }).catch((err) => {
        return next(err);
      });
  });
}

exports.sendPassportRecovery = async (req, res, next) => {
  if (!req.body.userEmail) {
    req.backflip = { status: 422, message: 'Missing parameter: userEmail' };
    return next();
  }

  User.findOne({ 'email.normalized': User.normalizeEmail(req.body.userEmail) })
    .then((user) => {
      if (!user) {
        req.backflip = { status: 404, message: 'User not found with this email : ' + req.body.userEmail };
        return next();
      }

      EmailUser.sendPasswordRecoveryEmail(user, req.getLocale(), res)
        .then(() => {
          req.backflip = { status: 200, message: 'Email sent with success.' };
          return next();
        }).catch((err) => { return next(err); });

    }).catch((err) => { return next(err); });
}

exports.sendInvitationCodeConfirmation = async (req, res, next) => {
  User.findOne({ '_id': req.user._id })
    .populate('orgsAndRecords.record', '_id name tag')
    .populate('orgsAndRecords.organisation', '_id name tag logo cover')
    .then(user => {

      let orgAndRecordArray = user.orgsAndRecords.filter(orgAndRecord => orgAndRecord.organisation._id.equals(req.params.orgId));
      let userName = orgAndRecordArray[0].record.name.split(' ')[0];
      let organisation = orgAndRecordArray[0].organisation;
      res.setLocale(req.user.locale);
      EmailHelper.emailConfirmationInvitation(
        req.user.loginEmail, organisation, userName, req.body.invitationUrl,
        (new UrlHelper(organisation.tag, null, null, req.user.locale).getUrl()),
        res)
        .then(() => {
          req.backflip = { status: 200, message: 'Email sent with success.' };
          return next();
        }).catch((err) => {
          console.log('error: ' + err);
          return next(err);
        });
    });
}

exports.sendHelpRequest = async (req, res, next) => {
  let helpRequest = await HelpRequest.findById(req.params.hrId);

  if (!helpRequest) {
    req.backflip = { status: 404, message: 'Help Request not found.' };
    return next();
  }

  let recipients = [helpRequest.sender.getFirstEmail() || req.user.loginEmail];
  helpRequest.recipients.forEach(recipient => {
    let currentEmail = recipient.getFirstEmail();
    if (currentEmail) recipients.push(currentEmail);
  });

  res.setLocale(req.user.locale);

  let mailjetRes = await EmailHelper.emailHelpRequest(
    recipients,
    helpRequest.message,
    helpRequest.organisation,
    (new UrlHelper(helpRequest.organisation.tag, 'profile/' + helpRequest.sender.tag, null, req.user.locale).getUrl()),
    helpRequest.sender,
    helpRequest.tagsToString(req.user.locale),
    res);

  helpRequest.status = 'sent';

  let trackingCodes = [];
  mailjetRes.body.Sent.forEach(mailjetMessage => {
    trackingCodes.push(mailjetMessage.MessageID);
  });


  helpRequest.trackingCodes = trackingCodes;
  helpRequest.save();

  req.backflip = { status: 200, message: "Help Request sent with success." };
  return next();
}

exports.sendSkillsProposition = async (req, res, next) => {
  let sp = await SkillsProposition.findById(req.params.spId).catch(e => null);
  let recipientUser = await User.findOne({'orgsAndRecords.record': sp.recipient._id}).catch(e => null);

  if (!sp) {
    req.backflip = { status: 404, message: 'Skills proposition not found.' };
    return next();
  }

  let mailjetRes = await EmailHelper.emailSkillsProposition(
    sp.recipient.getFirstEmail() || recipientUser.loginEmail,
    sp.recipient,
    sp.hashtags,
    sp.organisation,
    (new UrlHelper(sp.organisation.tag, 'profile/' + sp.sender.tag, null, recipientUser ? recipientUser.locale : req.user.locale).getUrl()),
    sp.sender,
    recipientUser ? recipientUser.locale : req.user.locale,
    res).catch(e => null);

    sp.mailjetTrackingCode = mailjetRes ? mailjetRes.body.Sent[0].MessageID : null;
    sp.save();

    req.backflip = { status: 200, message: "Skills proposition sent with success." };
    return next();
};
