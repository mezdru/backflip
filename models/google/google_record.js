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
    links: {
      $elemMatch: {
        type: 'googleId',
        value: googleId,
      }
    }
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
      recordsToDelete.push(recordAndGoogleUser.record._id);
    }
  });
  return Record.delete({_id:{$in: recordsToDelete}}, callback);
};

GoogleRecord.createRecords = function(recordsAndGoogleUsers, organisationID, callback) {
  recordsToSave = [];
  recordsAndGoogleUsers.forEach(function (recordAndGoogleUser) {
    if (recordAndGoogleUser.action === 'create') {
      recordAndGoogleUser.record = GoogleRecord.createRecord(recordAndGoogleUser.googleUser, organisationID);
      recordsToSave.push(recordAndGoogleUser.record);
    }
  });
  if (recordsToSave.length === 0) {
    return callback(null, []);
  } else {
    return this.saveMany(recordsToSave, callback);
  }
};

GoogleRecord.createRecord = function(googleUser, organisationID) {
  return new Record({
      name: googleUser.name.fullName,
      tag: this.makeTag(googleUser),
      type: 'person',
      organisation: organisationID,
      picture: {
        uri: googleUser.thumbnailPhotoUrl
      },
      links: GoogleRecord.makeLinks(googleUser),
  });
};

GoogleRecord.makeTag = function(googleUser) {
  return googleUser.primaryEmail.split('@')[0];
};


// This is some very important logic: understanding the structure & content of a GoogleUser
// And converting this into our own Record.
// This could be several little workers taking care of 1 type of field each.
GoogleRecord.makeLinks = function(googleUser) {
  var links = [];
  links.push({
    type: 'googleId',
    identifier: true,
    value: googleUser.id,
    target: 'system'
  });
  googleUser.emails.forEach(function(emailObject) {
    links.push({
      type: 'email',
      identifier: true,
      value: emailObject.address,
      target: 'organisation'
    });
  });
/*@todo check whether aliases & nonEditableAliases are useful or not
  if (googleUser.aliases)
    googleUser.aliases.forEach(function(alias) {
      links.push({
        type: 'email',
        identifier: true,
        value: alias,
        target: 'private'
      });
    });
  if (googleUser.nonEditableAliases)
    googleUser.nonEditableAliases.forEach(function(alias) {
      links.push({
        type: 'email',
        identifier: true,
        value: alias,
        target: 'system'
      });
    });*/
    if (googleUser.addresses)
      googleUser.addresses.forEach(function(addressObject) {
        links.push({
          type: 'address',
          identifier: false,
          value: addressObject.formatted,
          target: (addressObject.type == 'work') ? 'organisation' : 'private'
        });
      });
      if (googleUser.phones)
        googleUser.phones.forEach(function(phoneObject) {
          links.push({
            type: 'phone',
            identifier: false,
            value: phoneObject.value,
            target: (phoneObject.type == 'work') ? 'organisation' : 'private'
          });
        });
  return links;
};

GoogleRecord.saveMany = function(records, callback) {
  Record.insertMany(records, callback);
};

module.exports = GoogleRecord;
