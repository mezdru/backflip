const mailjet = require ('node-mailjet').connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const defaultReciepient = 'hear-me@wingzy.io';
const defaultReciepientName = 'Hear me';
const defaultEmitter = 'aurore@wingzy.io';
const defaultEmitterName = 'Wingzy';
const defaultLink = 'https://wingzy.io';

/**
 *
 * This call sends a message to the given recipient with vars and custom vars.
 *
 */

var EmailHelper = {
  superadmin: {
    newOrg: function(name, email, organisation, link) {
      const request = mailjet
        .post("send", {'version': 'v3.1'})
        .request({
      		"Messages":[
      			{
      				"From": {
      					"Email": defaultEmitter,
      					"Name": defaultEmitterName
      				},
      				"To": [
      					{
      						"Email": defaultReciepient,
      						"Name": defaultReciepientName
      					}
      				],
      				"TemplateID": 164321,
      				"TemplateLanguage": true,
      				"Subject": "New organisation",
      				"Variables": {
                "email": email || "No email",
                "name": name || "No name",
                "organisation": organisation || "No organisation",
                "link": link || defaultLink
              }
      			}
      		]
      	});

        request
        	.then((result) => {
        		console.log(result.body);
        	})
        	.catch((err) => {
        		console.log(err);
        	});
    }
  },
  public: {
    emailLogin: function(email, name, url, res) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": defaultEmitter,
          "FromName": defaultEmitterName,
          "Subject": res.__("Sign in to Lenom"),
          "MJ-TemplateID": "197497",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": email }
          ],
          "Vars": {
            "intro": res.__("Hello %s! We are happy to welcome you back to Lenom.", name),
            "url": url || defaultLink,
            "button": res.__("Connect and share"),
            "outro": res.__("This green button can be used to securely access Lenom for 30 days.")
          }
        });
      request
        .then()
        .catch(err => {
          console.log(err);
        });
    },
    emailInvite: function(email, name, inviterName, organisationName, url, res) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": defaultEmitter,
          "FromName": inviterName || defaultEmitterName,
          "Subject": res.__("Join %s on Lenom", organisationName),
          "MJ-TemplateID": "200696",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": email }
          ],
          "Vars": {
            "intro": res.__("Hello %s, we are building a tool to find, discover and reach each other within %s. We would love for you to share who you are here!", name, organisationName),
            "inviterName": inviterName || defaultEmitterName,
            "button": res.__("Connect and share"),
            "url": url || defaultLink,
            "outro": res.__("This green button can be used to securely access Lenom for 30 days.")
          }
        });
      request
        .then()
        .catch(err => {
          console.log(err);
        });
    },
    emailMonthly: function(email, name, inviterName, organisationName, userCount, url, extract, res) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": defaultEmitter,
          "FromName": inviterName || defaultEmitterName,
          "Subject": res.__("%s this month", organisationName),
          "MJ-TemplateID": "241873",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": email }
          ],
          "Vars": {
            "intro": res.__("Hello %s, we are now %s people from %s on Lenom. Come have a look at who we are and share a bit more about yourself!", name, userCount, organisationName),
            "inviterName": inviterName || defaultEmitterName,
            "extract": extract || '',
            "button": res.__("Connect and share"),
            "url": url || defaultLink,
            "outro": res.__("This green button can be used to securely access Lenom for 30 days.")
          }
        });
      request
        .then()
        .catch(err => {
          console.log(err);
        });
      }
  }
};

module.exports = EmailHelper;
