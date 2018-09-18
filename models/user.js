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
      monthly: { type: Boolean, default: true },
      welcomed: { type: Boolean, default: false }
    }
  ],
  locale: {type: String, default: 'en' },
  name: String,
  google: {
    id: {type: String, index: true, unique: true, sparse: true},
    //@todo rename to primaryEmail
    email: {type: String, index: true, unique: true, sparse: true},
    normalized: {type: String, index: true, unique: true, sparse: true},
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String,
      access_token: String
    },
  },
  email: {
    value: {type: String, index: true, unique: true, sparse: true},
    normalized: {type: String, index: true, unique: true, sparse: true},
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
      code: String,
      created: { type: Date, default: Date.now }
    }
  ],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  superadmin: Boolean,
  senderEmail: String
});

userSchema.statics.findOneByEmail = function (email, callback) {
  email = this.normalizeEmail(email);
  this.findOne({$or: [{'google.normalized':email}, {'email.normalized':email}] }, callback);
};

var normalizeEmail = require('express-validator/node_modules/validator/lib/normalizeEmail.js');
userSchema.statics.normalizeEmail = function(email) {
  return normalizeEmail(email,
    {
      gmail_remove_subaddress:false,
      outlookdotcom_remove_subaddress:false,
      yahoo_remove_subaddress:false,
      icloud_remove_subaddress:false
    }
  );
};

userSchema.virtual('loginEmail').get(function() {
  return this.google.email || this.email.value;
});

userSchema.methods.addInvitation = function(organisation, user, code, callback) {
  var invitation = {
    organisation: organisation,
    user: user,
    code: code,
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
  return undefsafe(orgAndRecord, 'record.name') || this.name || '';
};

userSchema.methods.getRecord = function(organisationId) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  return undefsafe(orgAndRecord, 'record') || {};
};

userSchema.methods.touchLogin = function (callback) {
  if (!this.last_login){
    this.notifyNew();
    this.createHubspotContact();
  } 
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

userSchema.methods.unwelcomeToOrganisation = function(organisationId, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  if (orgAndRecord) {
    orgAndRecord.welcomed = false;
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

userSchema.methods.belongsToOrganisationByTag = function(organisationTag) {
  return this.orgsAndRecords.some(orgAndRecord => organisationTag === orgAndRecord.organisation.tag);
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

userSchema.methods.makeAdminToOrganisation = function(organisation, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisation._id);
  if (orgAndRecord) {
    orgAndRecord.admin = true;
  } else {
    this.orgsAndRecords.push({organisation: organisation, admin: true});
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

userSchema.methods.getMonthly = function(organisationId) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  if (orgAndRecord) return orgAndRecord.monthly;
  else return false;
};

userSchema.methods.toggleMonthly = function(organisationId, callback) {
  var orgAndRecord = this.getOrgAndRecord(organisationId);
  orgAndRecord.monthly = !orgAndRecord.monthly;
  if(callback) return this.save(callback);
};

userSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

userSchema.pre('save', function(next) {
  if (this.isNew && this.email.value) {
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

userSchema.pre('save', function(next) {
  if (this.isNew && this.google.hd) {
    Organisation.findByGoogleHd(this.google.hd, function(err, organisations) {
      if (err) {
        console.error('Cannot find Organisations by user google email');
        return next();
      }
      organisations.forEach(organisation => this.attachOrgAndRecord(organisation, null));
      next();
    }.bind(this));
  } else next();
});

var slack = require('slack-notify')('https://hooks.slack.com/services/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');
userSchema.methods.notifyNew = function() {
  var wingzies = 'no Wingzy yet';
  if (this.orgsAndRecords.length > 0) wingzies = this.orgsAndRecords.map(orgAndRecord => orgAndRecord.organisation.name).join(', ');
  slack.send({
    channel : (process.env.NODE_ENV === "production") ? "#alerts" : "#alerts-dev",
    text : `We have a new user: *${this.loginEmail}* _${this._id}_ in ${wingzies}`
  });
};

// create Hubspot Contact on new user
var Hubspot = require('hubspot');
var hubspot = new Hubspot({ apiKey: process.env.HUBSPOT_HAPIKEY});
userSchema.methods.createHubspotContact = function() {
  hubspot.contacts.create(
    {properties: [{property: "email", value: this.loginEmail}, {property: "lifecycleStage",value: "lead"}]},
    function(err, results) {
      if (err) { 
        console.error(err);
        slack.send({channel : "#errors-quentin", text : "createHubspotContact error : " + err});
      }
  });
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
