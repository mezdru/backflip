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

organisationSchema.methods.populateRecords = function(callback) {
  if (this.records) return callback(null, this);
  Record.find({organisation: this._id})
    .select('tag type description')
    .exec(function(err, records) {
    if (err) return callback(err);
      this.records = records;
      return callback(null, this);
    }.bind(this));
};

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
