var mongoose = require('mongoose');
var Record = require('./record.js');
var undefsafe = require('undefsafe');
var randomstring = require('randomstring');


var organisationSchema = mongoose.Schema({
  name: String,
  picture: {
    url: String,
  },
  logo: {
    url: String,
  },
  cover: {
    url: String,
  },
  tag: {type: String, required: true, index: true, unique: true, set: cleanOrgTag},
  redirect_to_tag: {type: String, required: false, set: cleanOrgTag},
  google: {
    hd: [String],
  },
  email: {
    domains: [String]
  },
  style: {
    css: String
  },
  codes: [
    {
      _id: false,
      value: String,
      creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
      starts: { type: Date, default: Date.now },
      ends: { type: Date, default: Date.now }
    }
  ],
  creator: {type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null},
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  public: { type: Boolean, default: false },
  premium: { type: Boolean, default: false },
  // @todo : Do not use canInvite, use features.canInvite instead
  canInvite: { type: Boolean, default: true },
  featuredWingsFamily : [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
  ],
  featuredLinksTypes: [String],
  onboardSteps: [
    String
  ],
  intro: {
    'en-UK': String,
    en: String,
    fr: String
  },
  onboardWelcome: {
    'en-UK': String,
    en: String,
    fr: String
  },
  features: {
    claps: {type: Boolean, default: true},
    askForHelp: {type: Boolean, default: true},
    proposeWings: {type: Boolean, default: true},
    map: {type: Boolean, default: false},
    canInvite: {type: Boolean, default: true},
    secondaryProfiles: {type: Boolean, default: false}
  }
});

/**
 * @description SET tag : Replace UpperCase by LowerCase in tag value.
 * @param {string} tag
 */
function cleanOrgTag(tag){
  if(typeof(tag) !== "undefined"){
    return tag.toLowerCase();
  }
  return null;
}

organisationSchema.index({'google.hd': 1});
organisationSchema.index({'email.domains': 1});

organisationSchema.virtual('host').get(function() {
  return this.tag + '.' + process.env.HOST;
});

//@todo WTF 'maboite.com' ??? probably some placeholder for front... in the model :(
organisationSchema.virtual('domain').get(function() {
  return undefsafe(this, 'google.hd.0') || undefsafe(this, 'email.domain.0') || 'maboite.com';
});

organisationSchema.virtual('orgsIdsToTags').get(function() {
  var orgsIdsToTags = {};
  orgsIdsToTags[this._id] = this.tag;
  orgsIdsToTags[this.model('Organisation').getTheAllOrganisationId()] = 'all';
  return orgsIdsToTags;
});

organisationSchema.virtual('orgsTagsToIds').get(function() {
  var orgsTagsToIds = {};
  orgsTagsToIds[this.tag] = this._id;
  orgsTagsToIds.all = this.model('Organisation').getTheAllOrganisationId();
  return orgsTagsToIds;
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

organisationSchema.methods.addCode = function(starts, ends, creator, customCode, callback) {
  var code = {
    value: customCode || randomstring.generate(16),
    creator: creator,
    starts: starts || Date.now(),
    ends: ends || Date.now() + 30*24*60*60*1000,
    created: Date.now(),
  };
  this.codes.unshift(code);
  if(callback) return this.save(callback);
};

organisationSchema.methods.validateCode = function(codeToValidate) {
  return this.codes.some(code => {
    return codeToValidate == code.value &&
    code.starts.getTime() < Date.now() &&
    code.ends.getTime() > Date.now();
  });
};

// We populate ALL the records in the Organisation AND IN THE "ALL" ORGANISATION
// @todo move the find into the record model to avoid duplication
organisationSchema.methods.populateRecords = function(includeAll, callback) {
  if (!callback) {
    callback = includeAll;
    includeAll = false;
  }
  var organisation = includeAll ? [this._id, this.model('Organisation').getTheAllOrganisationId()] : this._id;

  if (this.records) return callback(null, this);
  Record.find({organisation: organisation})
    .select('_id organisation tag type name name_translated intro description picture links hashtags within updated created')
    .populate('hashtags', '_id organisation tag type name name_translated picture description')
    .populate('within', '_id organisation tag type name name_translated picture')
    .populate('organisation')
    .exec(function(err, records) {
      if (err) return callback(err);
      this.records = records;
      return callback(null, this);
    }.bind(this));
};

organisationSchema.methods.getFeaturedWingsRecords = function(){
  return Record.find({'organisation': this._id, 'hashtags' : {'$in': this.featuredWingsFamily}, 'type': 'hashtag'})
    .populate('hashtags', '_id organisation tag name description')
    .exec().then((records)=>{
      if(records.length === 0 ){
        return Record.find({organisation: Organisation.getTheAllOrganisationId(), hashtags: process.env.DEFAULT_SOFTWING_ID})
        .populate('hashtags', '_id organisation tag name description')
        .exec().then((defaultRecords)=>{
          return defaultRecords;
        });
      }else{
        return records;
      }
    });
}

// Old method to get first soft wings
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

organisationSchema.methods.populateFirstWings = function(){
  this.featuredWingsFamily.length===0 ? this.featuredWingsFamily.push(process.env.DEFAULT_SOFTWING_ID):'';
  return this.populate('featuredWingsFamily', '_id tag name intro').execPopulate();
}

organisationSchema.methods.addFeaturedWingsFamily = function(recordId){
  this.isInFeaturedWingsFamilyArray(recordId) ? '' : this.featuredWingsFamily.push(recordId);
  return this.save();
}
organisationSchema.methods.removeFeaturedWingsFamily = function(recordId){
  this.isInFeaturedWingsFamilyArray(recordId) ? this.featuredWingsFamily.splice(this.featuredWingsFamily.indexOf(recordId), 1) : '';
  return this.save();
}

organisationSchema.methods.isInFeaturedWingsFamilyArray = function(recordId){
  return this.featuredWingsFamily.some(record=> record.equals(recordId));
}

/**
 * @description Get login message of the organisation by locale chosen. Default: english message.
 * @param {String} locale
 */
organisationSchema.methods.getLoginMessage = function(locale) {
  let loginMessage = this.loginMessages.find(loginMessage => loginMessage.locale === locale);
  if(!loginMessage) loginMessage = this.loginMessages.find(loginMessage => loginMessage.locale === 'en');
  if(loginMessage) return loginMessage.message;
  return null;
}

organisationSchema.statics.getTheAllOrganisationId = function() {
  return process.env.THE_ALL_ORGANISATION_ID;
};

organisationSchema.statics.findByEmail = function(email, callback) {
  var domain = email.split('@')[1];
  return this.findByDomain(domain, callback);
};

organisationSchema.statics.findByDomain = function(domain, callback) {
  this.find({'email.domains':domain}, function(err, organisations) {
    if (err) return callback(err);
    return callback(null, organisations);
  });
};

organisationSchema.statics.findByGoogleHd = function(hd, callback) {
  this.find({'google.hd':hd}, function(err, organisations) {
    if (err) return callback(err);
    return callback(null, organisations);
  });
};

organisationSchema.pre('save', function (next) {
    this.wasNew = this.isNew;
    next();
});

var slack = require('slack-notify')(process.env.SLACK_APP);
organisationSchema.post('save', function (organisation) {
  if (this.wasNew) {
    slack.send({
      channel : (process.env.NODE_ENV === "production") ? "#alerts" : "#alerts-dev",
      text : `We have a new organisation: *${organisation.tag}* _${organisation._id}_ created by _${organisation.creator}_`,
      icon_emoji: ':stuck_out_tongue:',
    });
  }
});

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
