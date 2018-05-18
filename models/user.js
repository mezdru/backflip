var mongoose = require('mongoose');
var undefsafe = require('undefsafe');
var Organisation = require('./organisation.js');

var userSchema = mongoose.Schema({
  orgsAndRecords: [
    {
      _id: false,
      // Can be populated or not, use getId to get Id.
      organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
      // Can be populated or not, use getId to get Id.
      record: {type: mongoose.Schema.Types.ObjectId, ref: 'Record', default: null},
      admin: Boolean,
      welcomed: { type: Boolean, default: false }
    }
  ],
  locale: {type: String, default: 'en' },
  google: {
    id: {type: String, index: true, unique: true, sparse: true},
    //@todo rename to primaryEmail
    email: {type: String, index: true, unique: true, sparse: true},
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String,
      access_token: String
    },
  },
  email: {
    value: {type: String, index: true, unique: true, sparse: true},
    hash: {type: String, index: true, unique: true, sparse: true},
    token: String,
    generated: Date
  },
  last_login: { type: Date },
  last_action: {type: Date},
  invitations: [
    {
      _id: false,
      organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
      user: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
      created: { type: Date, default: Date.now }
    }
  ],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  superadmin: Boolean
});

userSchema.statics.findOneByEmail = function (email, callback) {
  this.findOne({$or: [{'google.email':email}, {'email.value':email}] }, callback);
};

userSchema.virtual('loginEmail').get(function() {
  return this.google.email || this.email.value;
});

userSchema.methods.addInvitation = function(organisation, user, callback) {
  var invitation = {
    organisation: organisation,
    user: user,
    created: Date.now(),
  };
  this.invitations.push(invitation);
  if(callback) return this.save(callback);
};

userSchema.methods.canEmailSignin = function() {
  return this.email.value;
};

userSchema.methods.canGoogleSignin = function() {
  return this.google.email;
};

userSchema.methods.getName = function (organisationId) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  return undefsafe(orgAndRecord, 'record.name') || '';
};

userSchema.methods.getRecord = function(organisationId) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  return undefsafe(orgAndRecord, 'record') || {};
};

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

userSchema.methods.needsWelcomingToOrganisation = function(organisationId) {
  //if (this.isSuperAdmin()) return false;
  return this.orgsAndRecords.some(orgAndRecord => organisationId.equals(getId(orgAndRecord.organisation)) && !orgAndRecord.welcomed);
};

userSchema.methods.welcomeToOrganisation = function(organisationId, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  if (orgAndRecord) {
    orgAndRecord.welcomed = true;
    if (callback) this.save(callback);
    else return this;
  } else {
    err = new Error('Organisation not found');
    err.status = 404;
    if (callback) callback(err);
    else return err;
  }
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

userSchema.methods.getFirstOrgTag = function() {
  return undefsafe(this, 'orgsAndRecords.0.organisation.tag');
};

userSchema.methods.addToOrganisation = function(organisationId, callback) {
  if (this.getOrgAndRecord(organisationId)) {
    err = new Error('Already in organisation');
    err.status = 400;
    return callback(err);
  }
  this.orgsAndRecords.push({organisation: organisationId});
  if (callback) return this.save(callback);
  else return this;
};

//@todo addToOrganisation does the same as attachOrgAndRecord...
userSchema.methods.attachOrgAndRecord = function(organisation, record, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisation._id);
  if (orgAndRecord && record) {
    orgAndRecord.record = record;
  } else if (!orgAndRecord) {
    this.orgsAndRecords.push({organisation: organisation, record: record});
  }
  if (callback) this.save(callback);
  else return this;
};

userSchema.methods.detachOrg = function(organisationId, callback) {
  this.orgsAndRecords = this.orgsAndRecords.filter(orgAndRecord => {
    return !organisationId.equals(getId(orgAndRecord.organisation));
  });
  if (callback) this.save(callback);
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

userSchema.methods.getRecordTagByOrgId = function(organisationId) {
  var orgAndRecord = this.orgsAndRecords.find(orgAndRecord => organisationId.equals(getId(orgAndRecord.organisation)));
  if (!orgAndRecord || !orgAndRecord.record) return null;
  else return undefsafe(orgAndRecord.record, 'tag');
};

userSchema.methods.ownsRecord = function(recordId) {
  return this.orgsAndRecords.some(orgAndRecord => orgAndRecord.record && recordId.equals(getId(orgAndRecord.record)));
};

userSchema.methods.isSuperAdmin = function() {
  return this.superadmin === true;
};

//@todo there's an implementation asymetry between google and email signin
userSchema.pre('save', function(next) {
  if (this.isNew && this.canEmailSignin()) {
    Organisation.findByEmail(this.email.value, function(err, organisations) {
      if (err) {
        console.error('Cannot find Organisations by user email');
        return next();
      }
      organisations.forEach(organisation => this.attachOrgAndRecord(organisation, null));
      next();
    }.bind(this));
  } else next();
});

userSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

var slack = require('slack-notify')('https://hooks.slack.com/services/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');
userSchema.post('save', function (user) {
  if (this.wasNew) {
    slack.note(`We have a new user: ${user.loginEmail} _${user._id}_`);
  }
});

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
