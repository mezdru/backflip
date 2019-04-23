var mongoose = require('mongoose');
var mongooseDelete = require('mongoose-delete');
var linkSchema = require('./link_schema.js');
var undefsafe = require('undefsafe');
var unique = require('array-unique');
var randomstring = require('randomstring');
var LinkHelper = require('../helpers/link_helper.js');

var recordSchema = mongoose.Schema({
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true, required: true},
  tag: {type: String, required: true},
  type: {type: String, enum: ['person', 'team', 'hashtag']},
  name: String,
  name_translated: {
    en: String,
    fr: String,
    'en-UK': String
  },
  intro: {type: String},
  description: {type: String},
  picture: {
    url: String,
    path: String,
    emoji: String,
    type: {type: String},
    uuid: String
  },
  cover: {
    url: String,
    path: String,
    type: {type: String},
    uuid: String
  },
  links: [linkSchema],
  within: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
  ],
  hashtags: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
  ],
  includes: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record'}
  ],
  includes_count: {
    person: Number,
    team: Number,
    hashtag: Number
  },
  ranking: {type: Number, default: 0},
  hidden_links: [linkSchema],
  google: {
    id: {type: String, index: true},
    etag: String,
    primaryEmail: String,
    isAdmin: Boolean,
    lastLoginTime: Date,
    creationTime: Date,
    suspended: Boolean,
    customerId: String,
    orgUnitPath: String,
    includeInGlobalAddressList: Boolean,
    directory_updated: Date,
    plus_updated: Date
  },
  email: {
    value: {type: String, index: true}
  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  personAvailability: {type: String, enum: ['available','unspecified','unavailable']},
  // Hidden is used to control the algolia sync, hidden should be passed to false when user onboard
  hidden: {type: Boolean, default: false}
});

//@todo deal with consequences of "unique: true" condition on organisation/tag
//There's some UI needed here. Or make a different tag if needed..
recordSchema.index({'organisation': 1, 'tag': 1}, {unique: true, partialFilterExpression: { deleted: false }});
recordSchema.index({'organisation': 1, 'links.type': 1, 'links.value': 1});
recordSchema.index({'within': 1});
recordSchema.index({'includes': 1});

recordSchema.methods.getName = function(locale) {
  return undefsafe(this.name_translated, locale) || this.name || this.tag;
};


// This pseudo constructor takes an object that is build by RecordObjectCSVHelper or MakeFromTag
// @todo this feels weird... why manipulate fake record object instead of just Records ?
recordSchema.statics.makeFromInputObject = function(inputObject) {
  if (inputObject.type !== 'hashtag') inputObject.type = 'person';
  inputObject.tag = this.cleanTag(inputObject.tag || inputObject.name, inputObject.type);
  inputObject.name = inputObject.name || (inputObject.type === 'person' ? '' : this.getNameFromTag(inputObject.tag));
  return new this(inputObject);
};

recordSchema.methods.dumbMerge = function(inputObject) {
  this.name = inputObject.name || this.name;
  this.picture.url = inputObject.picture.url || this.picture.url;
  this.description = inputObject.description || this.description;
  //@todo clever mergeLinks();
  this.links = inputObject.links || this.links;
  return this;
};

recordSchema.methods.getGoogleId = function() {
  return undefsafe(this, 'google.id');
};

recordSchema.methods.isPerson = function() {
  return this.type === 'person';
};

recordSchema.methods.tagEquals = function(tag) {
  return this.tag.toLowerCase() === tag.toLowerCase();
};

//@todo there's a pattern break here, the links array be parsed by the router first
//We do not delete links, we move them to hidden_links
recordSchema.methods.deleteLinks = function(formLinks) {
  formLinks = formLinks || [];
  formLinks.forEach(function (formLink, index, links) {
    if (formLink.deleted == 'true') {
      let linkIndex = null;
      let hidden_link = this.links.find(function(link, index) {
        if (link._id.equals(formLink._id)) {
          linkIndex = index;
          return true;
        }
      });
      this.links.splice(linkIndex, 1);
      //@todo see if we can keep the same id (to infer original creation time later)
      delete hidden_link._id;
      this.hidden_links.push(hidden_link);
    }
  }, this);
};

//@todo there's a pattern break here, the links array should have been parsed by the router first
//@todo move the links parsing & creating logic into link_schema, or anywhere else, this file is too big.
//@todo on creating a new link, check if not in "hidden_links" and move it from there instead of creating a new one.
recordSchema.methods.createLinks = function(formNewLinks) {
  formNewLinks.forEach(function(newLink) {
    if(newLink.value) this.links.push(new LinkHelper(newLink.value).link);
  }, this);
};

recordSchema.methods.makeLinks = function(newLinks) {
  this.links = [];
  this.addLinks(newLinks);
};

recordSchema.methods.addLinks = function(newLinks) {
  newLinks.forEach(newLink => this.addLink(newLink));
};

//adds a link to the record ONLY IF the type does not exist
//@todo be more clever & overwrite if we trust new link more
recordSchema.methods.addLink = function(newLink) {
  if (newLink.type !== 'error' && !this.hasLink(newLink))
    this.links.push(newLink);
};

recordSchema.methods.hasLink = function(newLink) {
  return this.links.some(function(link) {
    if (newLink.value &&
      newLink.value === link.value &&
      !(newLink.type === 'workplace' || newLink.type === 'workchat' )) return true;
    if (newLink.type &&
      newLink.username &&
      newLink.type === link.type &&
      newLink.username === link.username) return true;
  });
};

recordSchema.methods.makeHashtags = function(hashtags, organisationId, callback) {
  this.hashtags = [];
  this.addHashtags(hashtags, organisationId, callback);
};

recordSchema.methods.addHashtags = function(hashtags, organisationId, callback) {
  queue = hashtags.map((hashtag) => this.addHashtag(hashtag, organisationId));
  Promise.all(queue).then((records) => {
    records.forEach(record => this.pushHashtag(record));
    callback(null, records);
  }).catch((reasons) => {
    callback(reasons);
  });
};

//@todo Rename: this does not really add the hashtag, it just creates a promise that returns the hashtag
//@todo When Wings (=hashtag) is not in current org, we make a new naked one from tag. We should copy emoji and other parameters.
recordSchema.methods.addHashtag = function(hashtag, organisationId) {
  return new Promise((resolve, reject) =>
  {
    if (hashtag instanceof Record) {
      if (hashtag.belongsToOrganisation(organisationId)) {
        return resolve(hashtag);
      } else {
        hashtag = hashtag.tag;
      }
    }

    if (typeof hashtag === "string") {
      this.model('Record').findByTag(hashtag, organisationId, (err, record) => {
        if (err) return reject(err);
        if (record) return resolve(record);
        this.model('Record').makeFromTag(hashtag, organisationId, (err, record) => {
          if (err) return reject(err);
          return resolve(record);
        });
      });
    } else {
      err = new Error('Not a valid hashtag');
      return reject(err);
    }
  });
};

//@todo Using concat to avoid casting to oid on push seems hacky
recordSchema.methods.pushHashtag = function(newRecord) {
  if (!this.hashtags.find((oldRecord) => getId(oldRecord).equals(getId(newRecord))))
    this.hashtags = this.hashtags.concat([newRecord]);
};

// We parse the description to find @Teams, #hashtags & @persons and build the within array accordingly.
// WE NEED ALL THE ORGS RECORDS TO BE THERE !
recordSchema.methods.makeWithin = function(organisation, callback) {
    var tags = this.getWithin(organisation);
    var newRecords = [];
    this.within = tags.map(
      function(tag) {
        var outputRecord;
        var localRecord = organisation.records.find(record => record.tagEquals(tag));
        if (localRecord) {
          outputRecord = localRecord;
        } else {
          outputRecord = this.model('Record').makeFromTag(tag, organisation._id);
          organisation.records.push(outputRecord);
          newRecords.push(outputRecord);
        }
        return this.model('Record').shallowCopy(outputRecord);
      }, this
    );
    //@todo use insertMany instead of create (implies rewriting the algolia post save synchro to use the insertMany middleware too).
    if (callback) return this.model('Record').create(newRecords, callback);
    else return newRecords;
};

// WE NEED ALL THE ORGS RECORDS TO BE THERE !
recordSchema.methods.changeOrganisation = function(organisation, callback) {
  this.organisation = organisation;
  this.makeWithin(organisation, function(err, records) {
    if (err) return callback(err);
    this.makeHashtags(this.hashtags, organisation._id, function(err, records) {
      if (err) return callback(err);
      this.save(callback);
    }.bind(this));
  }.bind(this));
};

// We need this because we don't want our local Records to reference to each other
// Otherwise there are tons of level of reference (even loops)
// @todo not sure we need it if we already handle shallow records ;)
recordSchema.statics.shallowCopy = function(record) {
  return {
    _id: record.id,
    name: record.name,
    name_translated: record.name_translated,
    tag: record.tag,
    type: record.type,
    picture: record.picture
  };
};

recordSchema.statics.shallowCopies = function(records) {
  return records.map(record => this.shallowCopy(record));
};

//@todo there are a lot of escaping/unescaping going on (because escaping creates special chars with # that are interpreted as Wings), change this.
const validator = require('validator');
//@todo Does not match person (@) yet
const tagRegex = /([#][^\s@#\,\.\!\?\;\(\)]+)/g;

recordSchema.methods.cleanDescription = function() {
  this.description = this.description || '';
  this.description = validator.unescape(this.description).replace(tagRegex, this.model('Record').cleanTag);
  this.description = validator.escape(this.description);
};


recordSchema.methods.cleanIntro = function() {
  this.intro = this.intro || '';
  this.intro = validator.unescape(this.intro).replace(tagRegex, this.model('Record').cleanTag);
  this.intro = validator.escape(this.intro);
};

var uppercamelcase = require('uppercamelcase');
var slug = require('slug');
var decamelize = require('decamelize');
recordSchema.statics.cleanTag = function(tag, type) {
  var prefix = '';
  var body = tag;

  if (type !== 'hashtag' && type !== 'person') type = null;
  type = type || Record.getTypeFromTag(tag);

  if (tag.charAt(0) === '@' || tag.charAt(0) === '#' ) {
    body = tag.slice(1);
  }

  if (!body) body = randomstring.generate(16);

  if (type === 'hashtag') {
    prefix = '#';
    body = slug(uppercamelcase(body));
  } else if (type === 'person') {
    prefix = '@';
    body = slug(uppercamelcase(body));
  }
  return prefix + body;
};

recordSchema.methods.makeTag = function() {
  if (this.type === 'person' && this.firstEmail)
    this.tag = this.model('Record').getTagFromEmail(this.firstEmail);
  else
    this.tag = this.model('Record').cleanTag(this.tag, this.type);
};

recordSchema.methods.makeTeamsIntoHashtags = function() {
  if (this.type === 'team') {
    this.type =  'hashtag';
    this.tag = this.model('Record').cleanTag(this.tag, 'hashtag');
  }
};

recordSchema.methods.convertAts = function() {
  if (this.description) this.description = this.description.replace(/@/g, '#');
  if (this.intro) this.intro = this.intro.replace(/@/g, '#');
};

recordSchema.methods.copyDescToIntro = function() {
  if (this.description) this.intro = this.description.split("\n")[0].substr(0,256);
};

recordSchema.statics.getTypeFromTag = function(tag) {
  if (tag.charAt(0) === '@') return 'person';
  else return 'hashtag';
};

recordSchema.methods.getWithin = function(organisation) {
  return unique(this.getWithinFromIntro().concat(this.getWithinFromDescription()));
};


recordSchema.methods.getWithinFromIntro = function() {
  this.cleanIntro();
  var tags = validator.unescape(this.intro).match(tagRegex);
  return tags || [];
};

recordSchema.methods.getWithinFromDescription = function(organisation) {
  this.cleanDescription();
  var tags = validator.unescape(this.description).match(tagRegex);
  return unique(tags || []);
};

recordSchema.methods.hasWing = function(wing){
  return this.hashtags.some(hashtag=> hashtag && hashtag._id.equals(wing._id));
};

// We look for tags in the org AND IN THE "ALL" ORGANISATION !
//@Todo create the corresponding index with the right collation.
recordSchema.statics.findByTag = function(tag, organisationId, callback) {
  tag = this.cleanTag(tag);
  this.findOne({organisation: [this.getTheAllOrganisationId(), organisationId], tag: tag})
  .collation({ locale: 'en_US', strength: 1 })
  .populate('hashtags', '_id tag type name name_translated picture')
  .populate('within', '_id tag type name name_translated picture')
  .exec(callback);
};

recordSchema.statics.findByIdAndUpdate = function(recordId, recordUpdated) {
  return this.findOneAndUpdate({'_id': recordId}, {$set: recordUpdated}, {new: true})
  .populate('hashtags', '_id tag type name name_translated picture')
  .populate('within', '_id tag type name name_translated picture')
  .exec();
}

// We look for tags in the org AND IN THE "ALL" ORGANISATION !
//@Todo create the corresponding index with the right collation.
recordSchema.statics.findById = function(id, organisationId, callback) {
  this.findOne({organisation: [this.getTheAllOrganisationId(), organisationId], _id: id})
  .populate('hashtags', '_id tag type name name_translated picture')
  .populate('within', '_id tag type name name_translated picture')
  .exec(callback);
};

// We look for tags in the org AND IN THE "ALL" ORGANISATION !
//@Todo create the corresponding index with the right collation.
recordSchema.statics.findByEmail = function(email, organisationId, callback) {
  this.findOne({organisation: organisationId, 'links': { $elemMatch: { value: email, type: 'email' }}})
  .populate('hashtags', '_id tag type name name_translated picture')
  .populate('within', '_id tag type name name_translated picture')
  .exec(callback);
};

recordSchema.statics.makeFromEmail = function(email, organisationId) {
  let type = 'person';
  let tag = this.getTagFromEmail(email);
  let emailLink = new LinkHelper(email).link;
  inputObject = {
    type: type,
    tag: tag,
    organisation: organisationId,
    links: [emailLink]
  };
  return this.makeFromInputObject(inputObject);
};


//@todo bad naming, it checks if belongs to the All Org too !
recordSchema.methods.belongsToOrganisation = function(organisationId) {
  return getId(this.organisation).equals(organisationId) || getId(this.organisation).equals(this.model('Record').getTheAllOrganisationId());
};

recordSchema.statics.makeFromTag = function(tag, organisationId, callback) {
  let type = this.getTypeFromTag(tag);
  let name = this.getNameFromTag(tag);
  tag = this.cleanTag(tag, type);
  inputObject = {
    type: type,
    tag: tag,
    name: name,
    organisation: organisationId
  };
  record = this.makeFromInputObject(inputObject);
  if (callback) return record.save(callback);
  else return record;
};
// new
recordSchema.statics.makeFromTagAsync = function(tag, orgId) {
  let type = this.getTypeFromTag(tag);
  let name = this.getNameFromTag(tag);
  tag = this.cleanTag(tag, type);
  inputObject = {
    type: type,
    tag: tag,
    name: name,
    organisation: orgId
  };
  record = this.makeFromInputObject(inputObject);
  return record.save();
};


recordSchema.statics.getTagFromEmail = function(email) {
  return this.cleanTag(email.split('@')[0], 'person');
};

recordSchema.statics.getNameFromTag = function(tag) {
  tag = tag.slice(1);
  tag = decamelize(tag, '-');
  tag = tag.replace('_', '-');
  //@todo remove when dots are removed from persons tags
  tag = tag.replace('.', '-');

  var list = [];
	tag.split('-').forEach(function (slug) {
		list.push(slug.substr(0, 1).toUpperCase() + slug.substr(1));
	});
  return list.join(' ');

};

//@todo Rename, this does not count but returns a promise.
recordSchema.methods.countPersons = function() {
  return new Promise((resolve, reject) =>
    {
      this
      .model('Record')
      .count(
        {
          $or:[{within:this._id},{hashtags:this._id}],
          type: 'person'
        },
      (err, count) =>
        {
          if (err) return reject(err);
          this.includes_count.person = count;
          this.save((err, record) =>
            {
              if (err) return reject(err);
              return resolve(record);
            }
          );
        }
      );
    }
  );
};

recordSchema.methods.makeIncludes = function(organisation) {
  if (this.type === 'person') return;
  var includes = organisation.records.filter(function(localRecord) {
    return localRecord.within.some(withinRecordId => withinRecordId.equals(this._id), this) && !localRecord._id.equals(this._id);
  }, this);
  this.includes_count.person = this.includes_count.team = this.includes_count.hashtag = 0;
  this.includes = [];
  includes.forEach(function(record) {
    if (record.type == 'person') {
      this.includes_count.person ++;
      if (this.includes.length < 8) this.includes.push(this.model('Record').shallowCopy(record));
    }/* else if (record.type == 'team') {
       this.includes_count.team ++;
    }*/ else if (record.type == 'hashtag' || record.type == 'team') {
      this.includes_count.hashtag ++;
    }
  }, this);
};

recordSchema.virtual('firstEmail').get(function () {
  return undefsafe(this, 'google.primaryEmail') || undefsafe(this, 'email.value') || undefsafe(this.links.find(link => link.type === 'email'), 'value');
});

recordSchema.virtual('allHashtags').get(function () {
  return this.hashtags.concat(this.within);
});

recordSchema.methods.hasPicture = function() {
  return undefsafe(this, 'picture.url') || undefsafe(this, 'picture.path');
};

//@todo Seriously ? This model is already messy as fuck and you're adding picture processing ? WTF
//@todo remove old picture from uploadcare when adding new one
var urlParse = require('url-parse');
var uploadcare = require('uploadcare')(process.env.UPLOADCARE_PUBLIC_KEY, process.env.UPLOADCARE_PRIVATE_KEY);

recordSchema.methods.addPictureByUrl = function(url, callback) {
  this.model('Record').addFileByUrl(url, function(err, file) {
    if (err) return callback(err);
    this.picture = file;
    return callback(null, this);
  }.bind(this));
};

recordSchema.methods.addPictureByUrlAsync = (url) => {
  return new Promise((resolve, reject) => {
    Record.addFileByUrl(url, function(err, file){
      if(err) reject(err);
      this.picture = file;
      resolve(this);
    }.bind(this));
  });
}

recordSchema.methods.addCoverByUrl = function(url, callback) {
  this.model('Record').addFileByUrl(url, function(err, file) {
    if (err) return callback(err);
    this.cover = file;
    return callback(null, this);
  }.bind(this));
};

recordSchema.statics.addFileByUrl = function(url, callback) {
  url = urlParse(url, true);
  fileObject = {};
  if (!url.hostname) return callback(new Error('Picture url invalid'));
  if (url.hostname === 'ucarecdn.com') {
    fileObject.url = url.toString();
    fileObject.uuid = url.pathname.split('/')[1];
    return callback(null, fileObject);
  } else {
    uploadcare.file.fromUrl(url.toString(), function(err, file) {
      if (err || !file) {
        fileObject.url = url.toString();
        console.error(err || 'No file returned from UploadCare for record '+this._id);
        return callback(null, fileObject);
      }
      fileObject.uuid = file.uuid;
      var newUrl = urlParse('https://ucarecdn.com/');
      newUrl.set('pathname', fileObject.uuid + '/-/resize/180x180/');
      fileObject.url = newUrl.toString();
      return callback(null, fileObject);
    });
  }
};

recordSchema.methods.getUploadcareUrl = function() {
  if (!this.picture.url) return false;
  var url = urlParse(this.picture.url, true);
  if (url.pathname && url.hostname === 'ucarecdn.com') return this.picture.url;
  else return false;
};

recordSchema.methods.setEmoji = function(emoji, callback) {
  this.picture.emoji = emoji;
  if (callback) this.save(callback);
};

recordSchema.methods.setPicturePath = function(picturePath, callback) {
  this.picture.path = picturePath;
  if (callback) this.save(callback);
};


var algolia = require('algoliasearch')(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_WRITE_KEY);
var index = algolia.initIndex('world');

recordSchema.methods.algoliaSync = function() {
  if(this.hidden === true) return;
  if (this.deleted) {
    index.deleteObject(this._id.toString(), function(err, doc) {
      if (err) return console.error(err);
      console.log(`Deleted ${doc.objectID} with Algolia`);
    });
  } else {
    this.hashtags = this.hashtags || [];
    this.within = this.within || [];
    this.sortLinks();
    index.saveObject({
      objectID: this._id.toString(),
      organisation: getId(this.organisation),
      tag: this.tag,
      type: this.type,
      name: this.name,
      name_translated: this.name_translated,
      intro: this.intro,
      description: this.description,
      picture: this.picture,
      cover: this.cover,
      links: this.links,
      includes_count: this.includes_count,
      hashtags: this.model('Record').shallowCopies(this.hashtags.concat(this.within)),
      personAvailability: this.personAvailability
    }, function(err, doc) {
      if (err) return console.error(err);
      console.log(`Synced ${doc.objectID} with Algolia`);
    });
  }
};

recordSchema.methods.sortLinks = function(featuredLinksTypes) {
  featuredLinksTypes = featuredLinksTypes || undefsafe(this.organisation, 'featuredLinksTypes') || [];
  var featuredLinks = [];
  featuredLinksTypes.forEach(linkType => {
    let movedLinkIndex = this.links.findIndex(link => link.type === linkType);
    if (movedLinkIndex > -1) {
      let movedLink = this.links.splice(movedLinkIndex, 1);
      featuredLinks = featuredLinks.concat(movedLink);
    }
  });
  this.links = featuredLinks.concat(this.links);
};

//@todo remove
recordSchema.statics.getValidationSchema = function(res) {
  return {
    name: {
      isLength: {
        options: [{ min: 1, max: 64 }],
        errorMessage: res.__('Please write a name (no larger than 64 characters).') // Error message for the validator, takes precedent over parameter message
      }
    },
    description: {
      isLength: {
        options: [{max: 2048}],
        errorMessage: res.__('Please write a description no larger than 2048 characters.') // Error message for the validator, takes precedent over parameter message
      }
    },
    intro: {
      isLength: {
        options: [{max: 256}],
        errorMessage: res.__('Please write an intro no larger than 256 characters.') // Error message for the validator, takes precedent over parameter message
      }
    }
  };
};

recordSchema.methods.promoteToAll = function(callback) {
  this.organisation = this.model('Record').getTheAllOrganisationId();
  if(callback) this.save(callback);
};

recordSchema.methods.isInTheAllOrganisation = function() {
  return this.organisation.equals(this.model('Record').getTheAllOrganisationId());
};

recordSchema.methods.getLinkByType = function(type) {
  if(this.links.length > 0 && this.links.find(link => link.type === type)) {
    return this.links.find(link => link.type === type).value;
  }
  return null;
};

recordSchema.statics.getWingsToString = function(recordId) {
  var stringOut = '';
  return Record.findOne({_id: recordId})
  .populate('hashtags', '_id tag type name name_translated picture')
  .populate('within', '_id tag type name name_translated picture')
  .then(record => {
    record.hashtags.forEach(wing => {
      console.log(stringOut)
      stringOut += (stringOut === '' ? "" : " - " ) + "\""+wing.name+"\"";
    });
    return stringOut;
  }).catch(error => {console.log(error); return null});
}

recordSchema.statics.getTheAllOrganisationId = function() {
  return process.env.THE_ALL_ORGANISATION_ID;
};

recordSchema.pre('save', function(next) {
  this.updated = Date.now();
  if(this.type !== 'person') next();
  if(this.isNew){
    Record.findOne({'tag': this.tag, 'organisation': this.organisation})
    .then(recordDup => {
      if(recordDup){
        this.tag = this.tag + (Math.floor(Math.random() * (99999 - 11111 + 1)) + 11111);
      }
      return next();
    });
  }else{next();}
});

recordSchema.post('save', function(doc) {
  this.algoliaSync();
});

recordSchema.post('findOneAndUpdate', function(doc) {
  Record.findOne({'_id' : doc._id})
  .populate('hashtags', '_id tag type name name_translated picture')
  .populate('within', '_id tag type name name_translated picture')
  .then(doc => {
    console.log(doc)
    doc.algoliaSync();
  });
});

recordSchema.plugin(mongooseDelete, {
  deletedAt : true,
  deletedBy : true,
  overrideMethods: 'all',
  validateBeforeDelete: false,
  indexFields: 'all'
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

var Record = mongoose.model('Record', recordSchema);

module.exports = Record;
