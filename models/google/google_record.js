/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 08-04-2017 09:41
* @Copyright: Clément Dietschy 2017
*/

var Record = require('../record.js');

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

// Takes an array of Google users, try to find them by google ID in our DB, and returns [{record, goolgeUser}]
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
      (recordAndGoogleUser.googleUser === false ||
      recordAndGoogleUser.googleUser.suspended === true)) {
        recordAndGoogleUser.action = 'delete';
    // create
    } else if  (!recordAndGoogleUser.record &&
      recordAndGoogleUser.googleUser &&
      recordAndGoogleUser.googleUser.suspended === false) {
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

GoogleRecord.deleteRecords = function(recordsAndGoogleUsers, callback) {
  recordsToDelete = [];
  recordsAndGoogleUsers.forEach(function(recordAndGoogleUser) {
    if (recordAndGoogleUser.action === 'delete') {
      recordsToDelete.push(recordAndGoogleUser.record);
    }
  });
  return this.deleteMany(recordsToDelete, callback);
};

GoogleRecord.deleteMany = function(records, callback) {
  records.forEach(function(record) {
    record.delete(callback);
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
    links.push({
      type: 'email',
      identifier: true,
      value: emailObject.address,
      target: 'organisation'
    });
  });
  if (googleUser.addresses) {
    googleUser.addresses.forEach(function(addressObject) {
      links.push({
        type: 'address',
        value: addressObject.formatted,
        target: (addressObject.type == 'work') ? 'organisation' : 'private'
      });
    });
  }
  if (googleUser.phones) {
    googleUser.phones.forEach(function(phoneObject) {
      links.push({
        type: 'phone',
        value: phoneObject.value,
        target: (phoneObject.type == 'work') ? 'organisation' : 'private'
      });
    });
  }
  return links;
};

GoogleRecord.saveMany = function(records, callback) {
  records.forEach(function (record) {
    record.save(callback);
  });
  //@todo use batch save (does not work with mongoose-algolia yet)
  //Record.insertMany(records, callback);
};

module.exports = GoogleRecord;
