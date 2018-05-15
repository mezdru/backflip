var mongoose = require('mongoose');
var Record = require('./record.js');
var undefsafe = require('undefsafe');

var organisationSchema = mongoose.Schema({
  name: String,
  picture: {
    url: String,
  },
  logo: {
    url: String,
  },
  tag: {type: String, required: true, index: true, unique: true},
  google: {
    hd: [String],
  },
  email: {
    domains: [String]
  },
  colors: {
    primary: String
  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  public: { type: Boolean, default: false },
  canInvite: { type: Boolean, default: false }
});

organisationSchema.index({'google.hd': 1});
organisationSchema.index({'email.domains': 1});

organisationSchema.virtual('host').get(function() {
  return this.tag + '.' + process.env.HOST;
});

organisationSchema.virtual('orgsIdsToTags').get(function() {
  var orgsIdsToTags = {};
  orgsIdsToTags[this._id] = this.tag;
  orgsIdsToTags[this.model('Organisation').getTheAllOrganisationId()] = 'all';
  return orgsIdsToTags;
});


organisationSchema.methods.addGoogleHD = function(hd, callback) {
  this.google.hd.push(hd);
  if(callback) this.save(callback);
};

organisationSchema.methods.canGoogleSignin = function() {
  return this.google.hd.length > 0;
};

organisationSchema.methods.addEmailDomain = function(domain, callback) {
  this.email.domains.push(domain);
  if(callback) this.save(callback);
};

organisationSchema.methods.canEmailSignin = function() {
  return this.email.domains.length > 0;
};

organisationSchema.methods.makePublic = function(callback) {
  this.public = true;
  if(callback) this.save(callback);
};

organisationSchema.methods.makeCanInvite = function(callback) {
  this.canInvite = true;
  if (callback) this.save(callback);
};

// We populate ALL the records in the Organisation AND IN THE "ALL" ORGANISATION
organisationSchema.methods.populateRecords = function(callback) {
  if (this.records) return callback(null, this);
  Record.find({organisation: [this._id, this.model('Organisation').getTheAllOrganisationId()] })
    .select('_id organisation tag type name intro description picture links hashtags within updated created')
    .populate('hashtags', '_id organisation tag type name picture')
    .populate('within', '_id organisation tag type name picture')
    .exec(function(err, records) {
      if (err) return callback(err);
      this.records = records;
      return callback(null, this);
    }.bind(this));
};

organisationSchema.statics.getTheAllOrganisationId = function() {
  return process.env.THE_ALL_ORGANISATION_ID;
};

organisationSchema.statics.getTheWings = function(req, res, next) {
  Record.findOne({organisation: Organisation.getTheAllOrganisationId(), tag: "#Wings" }, function(err, wingRecord) {
    if (err) return next(err);
    if (!wingRecord) return next(new Error('Cannot get the Wings'));
    Record.find({organisation: Organisation.getTheAllOrganisationId(), hashtags: wingRecord._id }, function(err, records) {
      if (err) return next(err);
      records = records.filter(record => !record._id.equals(wingRecord._id));
      res.locals.wings = records;
      return next();
    }.bind(this));
  }.bind(this));
};

organisationSchema.statics.findByEmail = function(email, callback) {
  var domain = email.split('@')[1];
  return this.findByDomain(domain, callback);
};

//@todo handle multiple Wingzy per domain
organisationSchema.statics.findByDomain = function(domain, callback) {
  this.find({'email.domains':domain}, function(err, organisations) {
    if (err) return callback(err);
    return callback(null, organisations);
  });
};


organisationSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

var slack = require('slack-notify')('https://hooks.slack.com/services/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');
organisationSchema.post('save', function (organisation) {
  if (this.wasNew) {
    slack.success(`We have a new organisation: *${organisation.tag}* _${organisation._id}_`);
  }
});

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
