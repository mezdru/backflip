const mailjet = require ('node-mailjet').connect(process.env.MJ_APIKEY_PUBLIC, process.env.MJ_APIKEY_PRIVATE);


/**
 * @description Send an email thanks to Mailjet
 * @param {Array || String} recipients 
 * @param {String} subject 
 * @param {Object} vars 
 * @param {Number} templateId 
 */
let send = (recipients, subject, vars, templateId) => {
  return mailjet
  .post('send')
  .request({
    'FromEmail': defaultEmitter,
    'FromName': defaultEmitterName,
    'Subject': subject,
    'MJ-TemplateID': templateId,
    'MJ-TemplateLanguage': true,
    'Recipients': (recipients.length > 0 ? recipients : [{'Email': recipients}]),
    'Vars': vars
  });
}