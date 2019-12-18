const mailjet = require("node-mailjet").connect(
  process.env.MJ_APIKEY_PUBLIC,
  process.env.MJ_APIKEY_PRIVATE
);
var undefsafe = require("undefsafe");
var UrlHelper = require("../helpers/url_helper");

const defaultEmitter = "bonjour@wingzy.com";
const defaultEmitterName = "Wingzy";
const defaultLink = "https://wingzy.com";
const defaultBannerUrl = "https://wingzy.com/images/home/fly_away.jpg";
const defaultProfileUrl =
  "https://wingzy.com/images/placeholder_person_100.png";
const defaultLogoUrl = "https://wingzy.com/wingzy.png";

let getTagline = (organisation, res) => {
  return res.__(
    "Find the right person at the right time within %s at %s",
    organisation && organisation.name ? organisation.name : "your company",
    new UrlHelper(organisation.tag, null, null, null).getUrl()
  );
};

let getBannerUrl = organisation => {
  return organisation && organisation.cover
    ? organisation.cover.url || defaultBannerUrl
    : defaultBannerUrl;
};

let getLogoUrl = organisation => {
  return organisation && organisation.logo
    ? organisation.logo.url || defaultLogoUrl
    : defaultLogoUrl;
};

let getFirstNamesList = (records) => {
  let string = "";
  records.forEach( (record, index) => {
    string += record.name.split(' ')[0];
    if(index < records.length-1) string += ", ";
  });

  return string;
}

/**
 * @description Send an email thanks to Mailjet
 * @param {Array || String} recipients if Array, send a group email
 * @param {String} subject
 * @param {Object} vars
 * @param {String} templateId
 * @param {Object} options
 */
let send = (recipients, subject, vars, templateId, options = {}) => {
  let request = {
    FromEmail: options.FromEmail || defaultEmitter,
    FromName: options.FromName || defaultEmitterName,
    Subject: subject,
    "MJ-TemplateID": templateId,
    "MJ-TemplateLanguage": true,
    Vars: vars
  };

  if (Array.isArray(recipients)) {
    let to = "";
    recipients.forEach(recipient => {
      to += (to === "" ? "" : ", ") + `<${recipient}>`;
    });
    request["To"] = to;
  } else {
    request["Recipients"] = [{ Email: recipients }];
  }

  return mailjet.post("send").request(request);
};

exports.emailConfirmationInscription = (
  recipient,
  firstName,
  organisation,
  url,
  res
) => {
  return send(
    recipient,
    res.__("Spread your Wings {{firstName}}!", { firstName: firstName }),
    {
      title: res.__("Welcome to the Wingzy of {{orgName}}", {
        orgName: organisation.name
      }),
      text: res.__(
        "{{firstName}},<br/>Thank for sharing your Wings with the people of {{orgName}}. <br/>Now, everytime you need help go to Wingzy to find it (and much more)!",
        { orgName: organisation.name, firstName: firstName }
      ),
      ctaText: res.__("Search {{orgName}}", { orgName: organisation.name }),
      squareIcon: "https://ucarecdn.com/5a0ec475-a18d-498e-809c-9c9f2911a658/",
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      ctaUrl: url || defaultLink,
      tagline: getTagline(organisation, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "854412"
  );
};

exports.emailReactivateUser = (
  recipient,
  organisation,
  firstName,
  url,
  urlUnsub,
  tips,
  i18n
) => {
  return send(
    recipient,
    firstName
      ? i18n.__("{{firstName}}, we miss you!", { firstName: firstName })
      : i18n.__("We miss you."),
    {
      title: firstName
        ? i18n.__("{{firstName}}, we miss you!", { firstName: firstName })
        : i18n.__("We miss you."),
      text: i18n.__(
        "We have not seen you on Wingzy in a while. What a shame : it is a great app to find and help each other at {{organisationName}}",
        {
          organisationName:
            organisation && organisation.name
              ? organisation.name
              : "your company"
        }
      ),
      ctaText: i18n.__("Search {{organisationName}}", {
        organisationName:
          organisation && organisation.name ? organisation.name : "your company"
      }),
      squareIcon: "https://ucarecdn.com/6b54b57e-5725-46a5-8d6d-f4222833062f/",
      ctaUrl: url || defaultLink,
      tips: tips ? i18n.__(tips) : "",
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, i18n),
      outro: i18n.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a><br/><a href='{{unsubLink}}'>Click here to unsubscribe.</a>",
        { unsubLink: urlUnsub }
      )
    },
    "854412"
  );
};

exports.emailSecurityIntegration = (
  recipient,
  integrationName,
  integrationUserEmail,
  url,
  res
) => {
  return send(
    recipient,
    res.__("Your {{integrationName}} account is linked to Wingzy", {
      integrationName: integrationName
    }),
    {
      title: res.__("{{integrationName}} has been linked to your account!", {
        integrationName: integrationName
      }),
      text: res.__(
        "Your {{integrationName}} account ({{integrationUserEmail}}) has been linked to your Wingzy account ({{recipientEmail}}).",
        {
          integrationName: integrationName,
          integrationUserEmail: integrationUserEmail,
          recipientEmail: recipient
        }
      ),
      ctaText: res.__("Go to Wingzy"),
      squareIcon: "https://ucarecdn.com/8684900c-d4a6-4464-9121-0c6d9668108c/",
      ctaUrl: url || defaultLink,
      outro: res.__(
        "For any questions, <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "853386"
  );
};

exports.emailConfirmationInvitation = (
  recipient,
  organisation,
  firstName,
  invitationUrl,
  orgUrl,
  res
) => {
  return send(
    recipient,
    res.__("Thanks for the help!"),
    {
      title: firstName
        ? res.__("{{firstName}}, thanks for the help!", {
            firstName: firstName || ""
          })
        : res.__("Thanks for the help!"),
      text: res.__(
        "The more we are on Wingzy, the more we help each other. <br/> Share this secured link to invite even more people from {{orgName}} to join",
        {
          orgName:
            organisation && organisation.name
              ? organisation.name
              : "your company"
        }
      ),
      ctaText: invitationUrl || "Code",
      squareIcon: "https://images.emojiterra.com/twitter/v12/512px/1f60d.png",
      ctaUrl: invitationUrl || defaultLink,
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "868473"
  );
};

exports.emailPasswordRecovery = (recipient, url, res) => {
  return send(
    recipient,
    res.__("Create a new password"),
    {
      intro: res.__(
        "Hello,<br/>Click on the red button below to create your new password to secure your Wingzy account.<br/>If you don't want to change your password, all is fine, just do nothing.<br/>Thanks :)"
      ),
      url: url || defaultLink,
      button: res.__("Create password"),
      outro: res.__(
        "This red button can be used to securely access Wingzy for 30 days."
      )
    },
    "197497"
  );
};

exports.emailConfirmation = (recipient, url, organisationName, res) => {
  return send(
    recipient,
    res.__("Confirm your email address"),
    {
      title: res.__("Confirm your email address"),
      text: res.__(
        "Hello,<br/>Thank you for signing up on Wingzy, the talent directory of {{organisationName}}!<br/>Just click on this red button below to access Wingzy securely.<br/>Thanks :)",
        { organisationName: organisationName || "your company" }
      ),
      ctaText: res.__("Confirm email"),
      squareIcon: "https://ucarecdn.com/5a0ec475-a18d-498e-809c-9c9f2911a658/",
      orgBannerUrl: defaultBannerUrl,
      orgLogoUrl: defaultLogoUrl,
      ctaUrl: url || defaultLink,
      tagline: getTagline({ name: organisationName }, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "854412"
  );
};

exports.emailInvitationAccepted = (
  recipientName,
  recipient,
  senderName,
  organisation,
  url,
  res
) => {
  return send(
    recipient,
    res.__("Discover the Wings of %s !", senderName),
    {
      title: res.__("Hello %s", recipientName),
      text: res.__(
        "You have invited %s to join %s on Wingzy.<br/> %s has accepted your invitation !<br/> Thank you for spreading your Wings.",
        senderName,
        organisation && organisation.name ? organisation.name : "your company",
        senderName
      ),
      ctaText: res.__("See %s profile", senderName),
      squareIcon:
        "https://emojis.wiki/emoji-pics/twitter/hugging-face-twitter.png",
      ctaUrl: url || defaultLink,
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "854412"
  );
};

exports.emailSpread = (
  recipient,
  senderName,
  senderEmail,
  organisationName,
  url,
  text,
  res
) => {
  return send(
    recipient,
    res.__("Spread your Wingzy", organisationName),
    {
      text: text,
      button: res.__("Spread your Wingzy"),
      url: url || defaultLink,
      orgLogoUrl: "https://wingzy.io/wingzy.png",
      outro: res.__(
        "This red button can be used to securely access Wingzy for 30 days."
      )
    },
    "519044",
    {
      FromEmail: senderEmail,
      FromName: senderName
    }
  );
};

exports.emailReinvite = (
  recipient,
  senderName,
  senderEmail,
  organisationName,
  url,
  res
) => {
  return send(
    recipient,
    res.__("Join %s on Wingzy", organisationName),
    {
      intro: res.__(
        "Hello!<br>I am on the Wingzy for <strong>%s</strong>, an intuitive app to find each other according to what we love and know.",
        organisationName
      ),
      inviterName:
        (senderName || defaultEmitterName) + " (" + organisationName + ")",
      button: res.__("Spread your wings"),
      url: url || defaultLink,
      outro: res.__(
        "This red button can be used to securely access Wingzy for 30 days."
      )
    },
    "200696",
    {
      FromName: senderName,
      FromEmail: senderEmail
    }
  );
};

exports.emailInvite = (
  recipient,
  senderName,
  senderEmail,
  organisationName,
  customMessage,
  url,
  res
) => {
  return send(
    recipient,
    res.__("Join %s on Wingzy", organisationName),
    {
      intro: customMessage
        ? customMessage
        : res.__(
            "Hello!<br>I am on the Wingzy for <strong>%s</strong>, an intuitive app to find each other according to what we love and know.",
            organisationName
          ),
      inviterName:
        (senderName || defaultEmitterName) + " (" + organisationName + ")",
      button: res.__("Spread your wings"),
      url: url || defaultLink,
      outro: res.__(
        "This red button can be used to securely access Wingzy for 30 days."
      )
    },
    "200696",
    {
      FromEmail: senderEmail,
      FromName: senderName
    }
  );
};

exports.emailLogin = (recipient, name, url, res) => {
  return send(
    recipient,
    res.__("Sign in to Wingzy"),
    {
      intro: res.__(
        "Hello %s! We are happy to welcome you back on Wingzy.",
        name
      ),
      url: url || defaultLink,
      button: res.__("Connect and share"),
      outro: res.__(
        "This red button can be used to securely access Wingzy for 30 days."
      )
    },
    "197497"
  );
};

exports.emailHelpRequest = (
  recipients,
  message,
  organisation,
  recordUrl,
  senderRecord,
  search,
  res
) => {
  return send(
    recipients,
    res.__("I have a question about {{search}}", { search: search }),
    {
      title: res.__("{{senderName}} has a question about {{search}}", {
        senderName: senderRecord.name,
        search: search
      }),
      why: res.__(
        "You got this question because you have {{search}} on your profile in {{orgName}}",
        { orgName: organisation.name, search: search }
      ),
      senderProfileText: res.__("See my Wingzy"),
      senderProfileLink: recordUrl,
      senderIntro: senderRecord.intro,
      senderName: senderRecord.name,
      text: message
    },
    "1020640",
    {
      FromName: senderRecord.name,
      FromEmail: "ask@wingzy.com"
    }
  );
};

exports.emailIncompleteProfile = (
  recipient,
  organisation,
  recipientName,
  incompleteFields,
  completionPercentage,
  url,
  orgUrl,
  unsubUrl,
  locale,
  res
) => {
  res.setLocale(locale);
  let missingFields = incompleteFields.map(key =>
    res.__("missingField:" + key, { orgName: organisation.name })
  );
  return send(
    recipient,
    res.__("{{recipientName}} {{orgName}} needs your help!", {
      recipientName: recipientName ? recipientName + "," : "",
      orgName: organisation.name
    }),
    {
      title: res.__(
        "{{recipientName}} your {{orgName}} profile is almost perfect",
        {
          recipientName: recipientName ? recipientName + "," : "",
          percentage: completionPercentage,
          orgName: organisation.name
        }
      ),
      text: res.__("Could you add the following information?"),
      missingFields: missingFields,
      percentage: completionPercentage,
      ctaText: res.__("Edit my profile"),
      ctaUrl: url || defaultLink,
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: i18n.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a><br/><a href='{{unsubLink}}'>Click here to unsubscribe.</a>",
        { unsubLink: unsubUrl }
      )
    },
    "1047461"
  );
};

exports.emailCompleteYourProfile = (
  recipient,
  organisation,
  ctaUrl,
  unsubUrl,
  url,
  res
) => {
  return send(
    recipient,
    res.__("Complete your profile in {{orgName}} directory", {
      orgName: organisation.name
    }),
    {
      title: res.__("Complete your profile in {{orgName}} directory", {
        orgName: organisation.name
      }),
      text: res.__(
        "Thank your for joining the smart directory of {{orgName}}. To make it smarter, can you complete your profile? It will help a lot!",
        { orgName: organisation.name }
      ),
      ctaText: res.__("Complete my profile"),
      cta2Text: res.__("I need help"),
      squareIcon:
        "https://emojis.wiki/emoji-pics/twitter/pleading-face-twitter.png",
      ctaUrl: ctaUrl || defaultLink,
      cta2Url: "mailto:contact@wingzy.com",
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: i18n.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a><br/><a href='{{unsubLink}}'>Click here to unsubscribe.</a>",
        { unsubLink: unsubUrl }
      )
    },
    "1101582"
  );
};

exports.emailSkillsProposition = (
  recipient,
  recipientRecord,
  skills,
  organisation,
  senderUrl,
  senderRecord,
  locale,
  res,
  urlSkills
) => {
  res.setLocale(locale);
  return send(
    recipient,
    res.__("{{senderName}} suggests you skills", {
      senderName: senderRecord.name
    }),
    {
      title: res.__("{{senderName}} suggests you skills", {
        senderName: senderRecord.name
      }),
      ctaText: res.__("Add to my profile"),
      skills: skills,
      ctaUrl: urlSkills,
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "1118934"
  );
};

exports.emailSkillsPropositionAccepted = (
  recipient,
  spSenderRecord,
  organisation,
  spRecipientUrl,
  spRecipientRecord,
  locale,
  res
) => {
  res.setLocale(locale);
  return send(
    recipient,
    res.__("{{spRecipientName}} has accepted your suggestion of skills", {
      spRecipientName: spRecipientRecord.name
    }),
    {
      title: res.__(
        "{{spRecipientName}} has accepted your suggestion of skills",
        {
          spRecipientName: spRecipientRecord.name
        }
      ),
      text: res.__(
        "Thanks to you, {{spRecipientName}} has added skills to his profile. Your coworkers will now find him more easily!",
        { spRecipientName: spRecipientRecord.name }
      ),
      ctaText: "See his profile",
      squareIcon:
        "https://emojis.wiki/emoji-pics/twitter/hugging-face-twitter.png",
      ctaUrl: spRecipientUrl,
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "854412"
  );
};

exports.sendEmailOrgNews = (
  recipientEmail,
  recipientName,
  organisation,
  previewRecords,
  newUsersCount,
  ctaUrl,
  res
) => {
  let subject = recipientName
    ? res.__("{{recipientName}}, there are news in {{orgName}}!", {
        recipientName: recipientName,
        orgName: organisation.name
      })
    : res.__("There are news in {{orgName}}!", {
        orgName: organisation.name
      });
  return send(
    recipientEmail,
    subject,
    {
      title: subject,
      text: ctaUrl,
      profilePicture1: previewRecords[0] && previewRecords[0].getResizedPictureUrl(100, 100) || defaultProfileUrl,
      profilePicture2: previewRecords[1] && previewRecords[1].getResizedPictureUrl(100, 100) || defaultProfileUrl,
      profilePicture3: previewRecords[2] && previewRecords[2].getResizedPictureUrl(100, 100) || defaultProfileUrl,
      ctaText: newUsersCount + " new users !",
      ctaUrl: ctaUrl,
      orgBannerUrl: getBannerUrl(organisation),
      orgLogoUrl: getLogoUrl(organisation),
      tagline: getTagline(organisation, res),
      outro: res.__(
        "Got any question? feedback? advise? Contact us! <a href='mailto:contact@wingzy.com'>contact us.</a>"
      )
    },
    "1141268"
  );
};
