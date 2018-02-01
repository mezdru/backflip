var Record = require('../record.js');
var LinkHelper = require('../../helpers/link_helper.js');

// This is more an helper than a model.
// @todo move somewhere else.
// @todo redesign this mess

var EmailRecord = {};

// @todo what if a record already exist for the same user ?
EmailRecord.createRecord = function(email, organisation, callback) {
  var record = new Record({
      name: this.createName(email),
      tag: this.createTag(email),
      type: 'person',
      organisation: organisation,
      ranking: 1000,
      email: {
        value: email
      },
      links: this.createLinks(email),
  });
  if (callback) return record.save(callback);
  else return record;
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
