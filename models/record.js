var mongoose = require('mongoose');
var mongooseDelete = require('mongoose-delete');
var linkSchema = require('./link_schema.js');
var undefsafe = require('undefsafe');
var unique = require('array-unique');
var randomstring = require('randomstring');
var LinkHelper = require('../helpers/link_helper.js');
var StructureHelper = require('../helpers/structure_helper.js');


var recordSchema = mongoose.Schema({
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true, required: true},
  tag: {type: String, required: true},
  type: {type: String, enum: ['person', 'team', 'hashtag']},
  name: String,
  intro: {type: String},
  description: {type: String},
  picture: {
    url: String,
    path: String,
    type: {type: String}
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
  structure: {},
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
  fullcontact_updated: Date,
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

//@todo deal with consequences of "unique: true" condition on organisation/tag
//There's some UI needed here. Or make a different tag if needed..
recordSchema.index({'organisation': 1, 'tag': 1}, {unique: true, partialFilterExpression: { deleted: false }});
recordSchema.index({'organisation': 1, 'links.type': 1, 'links.value': 1});
recordSchema.index({'within': 1});
recordSchema.index({'includes': 1});

// This pseudo constructor takes an object that is build by RecordObjectCSVHelper or MakeFromTag
// @todo this feels weird... why manipulate fake record object instead of just Records ?
recordSchema.statics.makeFromInputObject = function(inputObject) {
  if (inputObject.type !== 'hashtag') inputObject.type = 'person';
  inputObject.tag = this.cleanTag(inputObject.tag || inputObject.name, inputObject.type);
  inputObject.name = inputObject.name || this.getNameFromTag(inputObject.tag);
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
      newLink.value === link.value) return true;
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

recordSchema.methods.addHashtag = function(hashtag, organisationId) {
  return new Promise((resolve, reject) =>
  {
    if (mongoose.Types.ObjectId.isValid(hashtag)) {
      this.model('Record').findById(hashtag, (err, record) => {
        if (err) return reject(err);
        if (!record) return reject(new Error('Hashtag Record not found for ObjectId'));
        if (!record.belongsToOrganisation(organisationId)) return reject(new Error('Hashtag Record Id not in this organisation'));
        return resolve(record);
      });
    } else if (hashtag instanceof Record) {
      if (!hashtag.belongsToOrganisation(organisationId)) return reject(new Error('Hashtag Record not in this organisation'));
      return resolve(hashtag);
    } else if (typeof hashtag === "string") {
      this.model('Record').findByTag(hashtag, organisationId, (err, record) => {
        if (err) return reject(err);
        if (!record) {
          this.model('Record').makeFromTag(hashtag, organisationId, (err, record) => {
            if (err) return reject(err);
            return resolve(record);
          });
        } else {
          return resolve(record);
        }
      });
    } else {
      err = new Error('Not a valid hashtag');
      return reject(err);
    }
  });
};

//@todo I don't understand why only id is pushed...
recordSchema.methods.pushHashtag = function(newRecord) {
  if (!this.hashtags.find((oldRecord) => getId(oldRecord).equals(getId(newRecord))))
    this.hashtags.push(this.model('Record').shallowCopy(newRecord));
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
    //@todo use insertMany instead of create (implies rewriting mongoose-Algolia to use the insertMany middleware too).
    if (callback) return this.model('Record').create(newRecords, callback);
    else return newRecords;
};

// We need this because we don't want our local Records to reference to each other
// Otherwise there are tons of level of reference (even loops)
// @todo not sure we need it if we already handle shallow records ;)
recordSchema.statics.shallowCopy = function(record) {
  return this({
    _id: record.id,
    name: record.name,
    tag: record.tag,
    type: record.type,
    picture: record.picture
  });
};

//@todo Does not match person (@) yet
const tagRegex = /([#][^\s@#\,\.\!\?\;\(\)]+)/g;

recordSchema.methods.cleanDescription = function() {
  this.description = this.description.replace(tagRegex, this.model('Record').cleanTag);
};

recordSchema.methods.cleanIntro = function() {
  this.intro = this.intro.replace(tagRegex, this.model('Record').cleanTag);
};

var slug = require('slug');
var decamelize = require('decamelize');
// @Todo change slug to NOT use dots (.) and small case for persons.
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
    body = slug(body, {lowercase: false});
  } else if (type === 'person') {
    prefix = '@';
    body = slug(body, {replacement: '.', remove: null});
  }
  return prefix + body;
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
  var tags = this.intro.match(tagRegex);
  return tags || [];
};

recordSchema.methods.getWithinFromDescription = function(organisation) {
  this.cleanDescription();
  var tags = this.description.match(tagRegex);
  return unique(tags || []);
};

// We look for tags in the org AND IN THE "ALL" ORGANISATION !
//@Todo create the corresponding index with the right collation.
recordSchema.statics.findByTag = function(tag, organisationId, callback) {
  tag = this.cleanTag(tag);
  this.findOne({organisation: [this.getTheAllOrganisationId(), organisationId], tag: tag})
  .collation({ locale: 'en_US', strength: 1 })
  .populate('within hashtags')
  .exec(callback);
};

recordSchema.statics.makeFromEmail = function(email, organisationId) {
  let type = 'person';
  let tag = this.getTagFromEmail(email);
  let name = this.getNameFromTag(tag);
  let emailLink = new LinkHelper(email).link;
  inputObject = {
    type: type,
    tag: tag,
    name: name,
    organisation: organisationId,
    links: [emailLink]
  };
  return this.makeFromInputObject(inputObject);
};

recordSchema.methods.belongsToOrganisation = function(organisationId) {
  return getId(this.organisation).equals(organisationId) || getId(this.organisation).equals(this.model('Record').getTheAllOrganisationId());
};

recordSchema.statics.makeFromTag = function(tag, organisationId, callback) {
  let type = this.getTypeFromTag(tag);
  tag = this.cleanTag(tag, type);
  let name = this.getNameFromTag(tag);
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

// @todo what if Record.within is not populated ? You're screwed aren't you ?
recordSchema.methods.makeStructure = function(organisation) {
  structureHelper = new StructureHelper(this.within, organisation.tree);
  structureHelper.build();
  this.structure = structureHelper.structure;
};

recordSchema.methods.makeRanking = function(organisation) {
  switch (this.type) {
    case 'person' : this.ranking = 1000; break;
    case 'hashtag' : case 'team' : this.ranking = 2000; break;
    //case 'team' : this.ranking = 3000; break;
  }
  if (organisation.tree) this.ranking += this.getStructureRanking(organisation.tree);
};

recordSchema.methods.getStructureRanking = function(tree) {
  let branches = tree.filter(function (branch) {
    return branch[branch.length-1] == this.tag;
  }, this);
  var shortestBranchLength = branches.reduce((acc, cur) => Math.min(acc, cur.length), 10);
  return 1000 - shortestBranchLength*100;
};

recordSchema.methods.countIncludes = function(callback) {
  this.model('Record').count({within:this._id}, callback);
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

recordSchema.methods.getEmail = function() {
  return undefsafe(this.links.find(link => link.type === 'email'), 'value');
};

recordSchema.methods.hasPicture = function() {
  return undefsafe(this, 'picture.url') || undefsafe(this, 'picture.path');
};

var parseDomain = require('parse-domain');
recordSchema.methods.getUploadcareUrl = function() {
  if (!this.picture.url) return false;
  var domain = parseDomain(this.picture.url);
  if (undefsafe(domain, 'domain') && domain.domain === 'ucarecdn') return this.picture.url;
  else return false;
};


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

recordSchema.statics.getTheAllOrganisationId = function() {
  return process.env.THE_ALL_ORGANISATION_ID;
};

recordSchema.pre('save', function(next) {
  this.updated = Date.now();
  next();
});

recordSchema.plugin(mongooseDelete, {
  deletedAt : true,
  deletedBy : true,
  overrideMethods: 'all',
  validateBeforeDelete: false,
  indexFields: 'all'
});


var mongooseAlgolia = require('mongoose-algolia');

// @todo we need our own sync logic, this one is too hard to control & very expensive for bulk
recordSchema.plugin(mongooseAlgolia, {
  appId: process.env.ALGOLIA_APPLICATION_ID,
  apiKey: process.env.ALGOLIA_WRITE_KEY,
  indexName: 'world',
  selector: '-_id -created -updated -google -deleted -hidden_links',
  // @todo remove the populate part for performance (we don't want another request to get the included/within records)
  populate: [{
    path: 'includes',
    select: 'name tag type picture'
  },{
    path: 'within',
    select: 'name tag type picture'
  }],
  filter: function(doc) {
    return !doc.deleted;
  },
  debug: true
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
