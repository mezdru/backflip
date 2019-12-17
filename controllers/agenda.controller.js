let EmailUser = require('../models/email/email_user');
let EmailHelper = require('../helpers/email_helper');
let FrontflipUrlHelper = require('../helpers/frontflipUrl.helper');
let UrlHelper = require('../helpers/url_helper');
let Record = require('../models/record');

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

exports.recountHashtagsIncludes = async () => {
  // all hashtags

  let hashtags = await Record.find({type:'hashtag'});

  await asyncForEach(hashtags, async (hashtag) => {
    let includesHashtags = await Record.find({type: 'hashtag', hashtags: hashtag._id});
    let includesPersons = await Record.find({type: 'person', hashtags: hashtag._id});
    hashtag.includes_count = {hashtag: includesHashtags.length, person: includesPersons.length};
    hashtag.save();
    await sleep(50);
  });
}

let asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

let sleep = (ms) => {
  return new Promise(resolve => setTimeout(resolve, ms));
}