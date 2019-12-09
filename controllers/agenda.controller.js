let EmailUser = require('../models/email/email_user');
let EmailHelper = require('../helpers/email_helper');
let FrontflipUrlHelper = require('../helpers/frontflipUrl.helper');
let UrlHelper = require('../helpers/url_helper');

exports.sendEmailConfirmation = async (user, orgTag, i18n) => {
  await EmailUser.sendEmailConfirmation(user, i18n, orgTag);
  console.log('__________ sendEmailConfirmation for ' + user._id);
}

exports.sendEmailCompleteYourProfile = async (user, organisation, i18n) => {
  EmailUser.generateToken(user, function (err, userUpdated) {
    if (err) {
      return;
    }

    i18n.setLocale(userUpdated.locale);

    EmailHelper.emailCompleteYourProfile(
      userUpdated.loginEmail,
      organisation,
      (new FrontflipUrlHelper(organisation.tag, '', userUpdated.locale)).getUrl(),
      (new UrlHelper(null, 'api/emails/unsubscribe/' + userUpdated.email.token + '/' + userUpdated.email.hash, null, null)).getUrl(),
      (new FrontflipUrlHelper(organisation.tag, '', userUpdated.locale)).getUrl(),
      i18n
    );
  });
  console.log('__________ sendEmailCompleteYourProfile for '+ user._id);
}

exports.sendEmailPerfectYourProfile = async (user, organisation, record, i18n) => {
  let incompleteFields = record.getIncompleteFields();
  if (incompleteFields.length === 0) { return; }

  EmailUser.generateToken(user, function (err, userUpdated) {
    if (err) {
      return;
    }
    EmailHelper.emailIncompleteProfile(
      record.getLinkByType('email') || user.loginEmail,
      organisation,
      record.name,
      incompleteFields,
      Math.max(100 - (incompleteFields.length * 9), 50),
      (new FrontflipUrlHelper(organisation.tag, '/onboard/intro/edit/' + record.tag, userUpdated.locale)).getUrl(),
      (new FrontflipUrlHelper(organisation.tag, '', userUpdated.locale)).getUrl(),
      (new UrlHelper(null, 'api/emails/unsubscribe/' + userUpdated.email.token + '/' + userUpdated.email.hash, null, null)).getUrl(),
      userUpdated.locale,
      i18n
    );
  });

  console.log('__________ sendEmailPerfectYourProfile for '+ user._id)

}

exports.sendEmailInviteYourCoworkers = async (user, organisation, record, i18n) => {
  EmailUser.sendInvitationCtaEmail(user, organisation, record, i18n);
  console.log('__________ sendEmailInviteYourCoworkers for ' + user._id)
}

exports.batchOrganisationsNewsletter = async (organisation, i18n) => {
  
  // get all users in org with record populated

  // for each user, send email to record email OR user email at his locale and with his name

  // email : how many new users in org last month ? / new wings ?

}