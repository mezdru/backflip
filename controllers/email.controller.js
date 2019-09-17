var EmailUser = require('../models/email/email_user');
var User = require('../models/user');
var EmailHelper = require('../helpers/email_helper');
var UrlHelper = require('../helpers/url_helper');
var SlackHelper = require('../helpers/slack_helper');
var HelpRequest = require('../models/helpRequest');

exports.unsubscribeCallback = async (req, res, next) => {
  try {

    let userToUnsub = await User.findOne({ 'email.hash': req.params.hash, 'email.token': req.params.token });
    if (!userToUnsub) return res.render('emails/unsubscribe', { success: false, errorMessage: res.__("User not found. Please <a href='mailto:contact@wingzy.com'>contact us</a>") });
    userToUnsub.isUnsubscribe = true;
    await userToUnsub.save();
    if (process.env.NODE_ENV === 'production') SlackHelper.notify('#alerts', 'An User (' + userToUnsub._id + ') unsubscribe from auto-tranctionnal emails (' + userToUnsub.loginEmail + ')');
    return res.render('emails/unsubscribe', { success: true, userEmail: userUpdated.loginEmail });

  } catch(e) {
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
  EmailUser.sendEmailConfirmation(req.user, res, req.params.orgTag)
    .then(() => {
      req.backflip = { status: 200, message: 'Email sent with success.' };
      return next();
    }).catch((err) => { return next(err); });
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
        // In order to perform transition backflip -> frontflip, we redirect to backflip here.
        // return res.redirect( 'https://' + process.env.HOST_FRONTFLIP + '/redirect');
        return res.redirect(new UrlHelper(req.organisationTag, 'login/callback', null, req.getLocale()).getUrl());
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
  HelpRequest.findOne({_id: req.params.hrId})
  .populate('recipients', '_id name tag links')
  .populate('sender', '_id tag name picture links')
  .populate('organisation', '_id name tag logo cover')
  .then(helpRequest => {
    if(!helpRequest) {
      req.backflip = {status: 404, message: 'Help Request not found.'};
      return next();
    }

    let recipients = [helpRequest.sender.getFirstEmail()];
    helpRequest.recipients.forEach(recipient => {
      let currentEmail = recipient.getFirstEmail();
      if(currentEmail) recipients.push(currentEmail);
    });

    res.setLocale(req.user.locale);
    EmailHelper.emailHelpRequest(recipients, helpRequest.organisation, (new UrlHelper(helpRequest.organisation.tag, null, null, req.user.locale).getUrl()), res)
    .then(mailjetRes => {

      helpRequest.status = "sent";

      let trackingCodes = [];
      mailjetRes.body.Sent.forEach(mailjetMessage => {
        trackingCodes.push(mailjetMessage.MessageID);
      });

      helpRequest.trackingCodes = trackingCodes;
      helpRequest.save();

      req.backflip = {status: 200, message: "Help Request sent with success."};
      return next();
    }).catch(e => {
      console.log(e);
      return next(e);
    });

  })
}