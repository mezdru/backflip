/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 05:21
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');
var undefsafe = require('undefsafe');

var userSchema = mongoose.Schema({
  name: String,
  // Careful not to use 1 email as identifier... better use arrays.
  //@todo remove this email field
  email: String,
  picture: {
    uri: String,
    path: String
  },
  orgsAndRecords: [
    {
      _id: false,
      // Can be populated or not, use getId to get Id.
      organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
      // Can be populated or not, use getId to get Id.
      record: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null},
      admin: Boolean
    }
  ],
  locale: {type: String, default: 'en' },
  google: {
    id: {type: String, index: true, unique: true},
    //@todo rename to primaryEmail
    email: String,
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String,
      access_token: String
    },
  },
  last_login: { type: Date },
  last_action: {type: Date},
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  superadmin: Boolean
});

userSchema.methods.touchLogin = function (callback) {
  this.last_login = Date.now();
  this.save(callback);
};

userSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

userSchema.methods.welcome = function(callback) {
  this.welcomed = true;
  this.save(callback);
};

userSchema.methods.hasOrganisation = function() {
  return this.orgsAndRecords.length > 0;
};

userSchema.methods.belongsToOrganisation = function(organisationId) {
  return this.orgsAndRecords.some(orgAndRecord => organisationId.equals(getId(orgAndRecord.organisation)));
};

userSchema.methods.isAdminToOrganisation = function(organisationId) {
  return this.orgsAndRecords.some(orgAndRecord => organisationId.equals(getId(orgAndRecord.organisation)) && orgAndRecord.admin === true);
};

userSchema.methods.getOrgAndRecord = function(organisationId) {
  return this.orgsAndRecords.find(orgAndRecord => organisationId.equals(getId(orgAndRecord.organisation)));
};

userSchema.methods.getFirstOrgId = function() {
  return undefsafe(this, 'orgsAndRecords.0.organisation');
};

userSchema.methods.makeAdminToOrganisation = function(organisationId, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  if (orgAndRecord) {
    orgAndRecord.admin = true;
  } else {
    this.orgsAndRecords.push({organisation: organisationId, admin: true});
  }
  if (callback) this.save(callback);
  else return this;
};

userSchema.methods.getRecordIdByOrgId = function(organisationId) {
  var orgAndRecord = this.orgsAndRecords.find(orgAndRecord => organisationId.equals(getId(orgAndRecord.organisation)));
  if (!orgAndRecord || !orgAndRecord.record) return null;
  else return getId(orgAndRecord.record);
};

userSchema.methods.ownsRecord = function(recordId) {
  return this.orgsAndRecords.some(orgAndRecord => recordId.equals(getId(orgAndRecord.record)));
};

userSchema.methods.attachOrgAndRecord = function(organisationId, recordId, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  if (orgAndRecord) {
    orgAndRecord.record = recordId;
  } else {
    this.orgsAndRecords.push({organisation: organisationId, record: recordId});
  }
  if (callback) this.save(callback);
  else return this;
};

userSchema.methods.isSuperAdmin = function() {
  return this.superadmin === true;
};

//@todo replace this placeholder with something handling multiple records
//@todo does not work when populated
userSchema.methods.getFirstOrganisation = function() {
  return undefsafe(this, 'orgsAndRecords.0.organisation');
};

/*
* We have submodels within User (oransiation, record...)
* Sometime these are populated (fetched by mongoose), sometime not.
* We want to retrieve the ObjectId no matter.
* @todo move this somewhere tidy like /helpers
*/
function getId(subObject) {
  return subObject._id || subObject;
}

var User = mongoose.model('User', userSchema);

module.exports = User;
