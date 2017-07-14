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

var GoogleRecord = {};

GoogleRecord.getByGoogleId = function(googleId, organisationId, callback) {
  return Record.findOne({
    organisation: organisationId,
    'google.id': googleId
  }, callback);
};

// Takes all records within organisation and an array of Google users, try to find them by google ID in our DB, and returns [{record, goolgeUser}]
GoogleRecord.matchRecordsAndGoogleUsers = function(records, googleUsers) {
  var recordsAndGoogleUsers = [];
  records.forEach(function(record) {
    if (record.isPerson()) {
      let recordAndGoogleUser = {
        record: record
      };
      recordAndGoogleUser.googleUser = GoogleRecord.spliceGoogleUsers(record, googleUsers);
      recordsAndGoogleUsers.push(recordAndGoogleUser);
    }
  });
  // Now that we found all the Google Users we had on Record, add the ones we don't have (inactive or new).
  googleUsers.forEach(function(googleUser) {
    let recordAndGoogleUser = {
      record: false,
      googleUser: googleUser
    };
    recordsAndGoogleUsers.push(recordAndGoogleUser);
  });
  return this.tagActions(recordsAndGoogleUsers);
};

// Return the Google User corresponding to the record and remove the Google User from the input array
GoogleRecord.spliceGoogleUsers = function(record, googleUsers) {
  let googleId = record.getGoogleId();
  if (!googleId) return undefined;
  let googleUser = googleUsers.find(function(googleUser, index, googleUsers) {
    if (googleUser.id === googleId) {
      googleUsers.splice(index, 1);
      return true;
    }
  });
  return googleUser || false;
};


//@todo handle the update action
GoogleRecord.tagActions = function(recordsAndGoogleUsers) {
  recordsAndGoogleUsers.forEach(function (recordAndGoogleUser) {
    // Delete
    if (recordAndGoogleUser.record &&
      (recordAndGoogleUser.googleUser &&
      recordAndGoogleUser.googleUser.suspended === true)) {
        recordAndGoogleUser.action = 'delete';
    // create
    } else if  (!recordAndGoogleUser.record &&
      recordAndGoogleUser.googleUser &&
      !recordAndGoogleUser.googleUser.suspended) {
        recordAndGoogleUser.action = 'create';
    // keep
    } else if (recordAndGoogleUser.record &&
      recordAndGoogleUser.googleUser) {
        recordAndGoogleUser.action = 'keep';
    }
  });
  return recordsAndGoogleUsers;
};

GoogleRecord.getRecordsAndGoogleUser = function(recordsAndGoogleUsers, action) {
  if (!action) return recordsAndGoogleUsers;
  return recordsAndGoogleUsers.filter(function(recordAndGoogleUser) {
    return recordAndGoogleUser.action === action;
  });
};

GoogleRecord.deleteRecords = function(recordsAndGoogleUsers, userId, callback) {
  recordsToDelete = [];
  recordsAndGoogleUsers.forEach(function(recordAndGoogleUser) {
    if (recordAndGoogleUser.action === 'delete') {
      recordsToDelete.push(recordAndGoogleUser.record);
    }
  });
  return this.deleteMany(recordsToDelete, userId, callback);
};

GoogleRecord.deleteMany = function(records, userId, callback) {
  records.forEach(function(record) {
    record.delete(userId, callback);
  });
};

GoogleRecord.createRecords = function(recordsAndGoogleUsers, organisationID, callback) {
  recordsToSave = [];
  recordsAndGoogleUsers.forEach(function (recordAndGoogleUser) {
    if (recordAndGoogleUser.action === 'create') {
      recordAndGoogleUser.record = GoogleRecord.createRecord(recordAndGoogleUser.googleUser, organisationID);
      recordsToSave.push(recordAndGoogleUser.record);
    }
  });
  return this.saveMany(recordsToSave, callback);
};

GoogleRecord.createRecord = function(googleUser, organisationID) {
  return new Record({
      name: googleUser.name.fullName,
      tag: this.createTag(googleUser),
      type: 'person',
      organisation: organisationID,
      picture: {
        url: googleUser.thumbnailPhotoUrl
      },
      ranking: 1000,
      google: {
        id: googleUser.id,
        etag: googleUser.etag,
        primaryEmail: googleUser.primaryEmail,
        isAdmin: googleUser.isAdmin,
        lastLoginTime: googleUser.lastLoginTime,
        creationTime: googleUser.creationTime,
        suspended: googleUser.suspended,
        customerId: googleUser.customerId,
        orgUnitPath: googleUser.orgUnitPath,
      },
      links: GoogleRecord.createLinks(googleUser),
  });
};

//@todo get rid of the prefix @, #, ... in the code & db.
//@todo We've got a unique Tag issue here !
GoogleRecord.createTag = function(googleUser) {
  return '@'+googleUser.primaryEmail.split('@')[0];
};


// This is some very important logic: understanding the structure & content of a GoogleUser
// And converting this into our own Record.
// This could be several little workers taking care of 1 type of field each.
// @todo check whether aliases & nonEditableAliases are useful or not
GoogleRecord.createLinks = function(googleUser) {
  var links = [];
  googleUser.emails.forEach(function(emailObject) {
    links.push(LinkHelper.makeLink(emailObject.address, 'email'));
  });
  if (googleUser.addresses) {
    googleUser.addresses.forEach(function(addressObject) {
      links.push(LinkHelper.makeLink(addressObject.formatted, 'address'));
    });
  }
  if (googleUser.phones) {
    googleUser.phones.forEach(function(phoneObject) {
      links.push(LinkHelper.makeLink(phoneObject.value, 'phone'));
    });
  }
  return links;
};

// We've got a unique Tag issue here !
GoogleRecord.saveMany = function(records, callback) {
  records.forEach(function (record) {
    record.save(function(err, record) {
      if (err && err.code === 11000) console.error(err);
      else return callback(err,record);
    });
  });
  //@todo use batch save (does not work with mongoose-algolia yet)
  //Record.insertMany(records, callback);
};

module.exports = GoogleRecord;
