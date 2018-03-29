var mongoose = require('mongoose');
var Record = require('./record.js');

var organisationSchema = mongoose.Schema({
  name: String,
  picture: {
    url: String,
  },
  logo: {
    url: String,
  },
  tag: {type: String, index: true, unique: true},
  google: {
    hd: [String],
  },
  email: {
    domains: [String]
  },
  colors: {
    primary: [String]
  },
  tree: [[String]],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  public: { type: Boolean, default: false }
});

organisationSchema.virtual('host').get(function() {
  return this.tag + '.' + process.env.HOST;
});

organisationSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

organisationSchema.methods.welcome = function(callback) {
  this.welcomed = true;
  if(callback) this.save(callback);
};

organisationSchema.methods.addGoogleHD = function(hd, callback) {
  this.google.hd.push(hd);
  if(callback) this.save(callback);
};

organisationSchema.methods.addEmailDomain = function(domain, callback) {
  this.email.domains.push(domain);
  if(callback) this.save(callback);
};

organisationSchema.methods.makePublic = function(callback) {
  this.public = true;
  if(callback) this.save(callback);
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

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
