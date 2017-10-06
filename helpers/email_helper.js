/**
* @Author: Clément Dietschy <bedhed>
* @Date:   06-06-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 27-06-2017 10:52
* @Copyright: Clément Dietschy 2017
*/

const mailjet = require ('node-mailjet').connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);
const defaultReciepient = 'hear-me@lenom.io';
const defaultEmitter = 'lenombot@lenom.io';
const defaultEmitterName = 'Lenom';
var i18n = require('i18n');

var EmailHelper = {
  superadmin: {
    newOrg: function(name, email, organisation, link) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": defaultEmitter,
          "FromName": defaultEmitterName,
          "Subject": "New organisation",
          "MJ-TemplateID": "164321",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": defaultReciepient }
          ],
          "Vars": {
            "name": name || "No name",
            "email": email || "No email",
            "organisation": organisation || "No organisation",
            "link": link || "lenom.io"
          }
        });
      request
        .then()
        .catch(err => {
          console.log(err);
        });
    }
  },
  public: {
    emailLogin: function(name, email, url) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": defaultEmitter,
          "FromName": defaultEmitterName,
          "Subject": "Login to Lenom",
          "MJ-TemplateID": "197497",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": email }
          ],
          "Vars": {
            "name": name || "",
            "url": url || "https://lenom.io"
          }
        });
      request
        .then()
        .catch(err => {
          console.log(err);
        });
    },
    emailInvite: function(email, name, inviterName, organisationName, url) {
      const request = mailjet
        .post("send")
        .request({
          "FromEmail": defaultEmitter,
          "FromName": inviterName || defaultEmitterName,
          "Subject": i18n.__("Join %s on Lenom", organisationName),
          "MJ-TemplateID": "200696",
          "MJ-TemplateLanguage": true,
          "Recipients": [
            { "Email": email }
          ],
          "Vars": {
            "intro": i18n.__("Hello %s, we are building a tool to find, discover and reach each other within %s. We would love for you to share who you are here!", name, organisationName),
            "inviterName": inviterName || defaultEmitterName,
            "button": i18n.__("Connect and share"),
            "url": url || "https://lenom.io",
            "outro": i18n.__("This email can be used to securely access Lenom for 30 days.")
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
