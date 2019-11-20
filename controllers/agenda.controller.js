let EmailUser = require('../models/email/email_user');

exports.sendEmailConfirmation = async (user, orgTag, i18n) => {
  await EmailUser.sendEmailConfirmation(user, i18n, orgTag);
}

exports.sendEmailCompleteYourProfile = async () => {

}

exports.sendEmailPerfectYourProfile = async () => {

}

exports.sendEmailInviteYourCoworkers = async () => {

}