/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 26-06-2017 02:33
* @Copyright: Clément Dietschy 2017
*/

var Record = require('../record.js');
var LinkHelper = require('../../helpers/link_helper.js');

// This is more an helper than a model.
// @todo move somewhere else.
// @todo redesign this mess

var EmailRecord = {};

// @todo what if a record already exist for the same user ?
EmailRecord.createRecord = function(email, organisationId, callback) {
  var record = new Record({
      name: this.createName(email),
      tag: this.createTag(email),
      type: 'person',
      organisation: organisationId,
      ranking: 1000,
      email: {
        value: email
      },
      links: this.createLinks(email),
  });
  return record.save(callback);
};

//@todo get rid of the prefix @, #, ... in the code & db.
//@todo We've got a unique Tag issue here !
EmailRecord.createTag = function(email) {
  return '@'+email.split('@')[0];
};

EmailRecord.createName = function(email) {
  return email.split('@')[0];
};

EmailRecord.createLinks = function(email) {
  var links = [];
  links.push(LinkHelper.makeLink(email, 'email'));
  return links;
};

module.exports = EmailRecord;
