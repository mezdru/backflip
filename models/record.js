/**
* @Author: Clément Dietschy <bedhed>
* @Date:   07-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 04-05-2017 07:14
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');
var mongooseDelete = require('mongoose-delete');
var mongooseAlgolia = require('mongoose-algolia');
var linkSchema = require('./link_schema.js');
var undefsafe = require('undefsafe');
var LinkHelper = require('../helpers/link_helper.js');
var StructureHelper = require('../helpers/structure_helper.js');


var recordSchema = mongoose.Schema({
  name: String,
  tag: {type: String, required: true},
  type: {type: String, enum: ['person', 'team', 'hashtag']},
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true, required: true},
  ranking: {type: Number, default: 0},
  picture: {
    url: String,
    path: String
  },
  description: {type: String, default: '#empty'},
  within: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record', index: true}
  ],
  structure: {},
  links: [linkSchema],
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

  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now }
});

recordSchema.virtual('ObjectID').get(function () {
  return this._id;
});

//@todo restore the unique: true condition on organisation/tag
//There's some UI needed here. Or make a different tag if needed..
recordSchema.index({'organisation': 1, 'tag': 1}/*, {unique: true}*/);
recordSchema.index({'organisation': 1, 'links.type': 1, 'links.value': 1});

recordSchema.statics.makeFromInputObject = function(inputObject) {
  if (inputObject.type != 'person' && inputObject.type != 'team') inputObject.type = 'hashtag';
  inputObject.tag = this.makeTag(inputObject.tag, inputObject.name, inputObject.type);
  inputObject.name = inputObject.name || inputObject.tag.slice(1);
  return new this(inputObject);
};

recordSchema.statics.makeTag = function(tag, name, type) {
  if (tag && (tag.charAt(0) == '@' || tag.charAt(0) == '#')) tag = tag.slice(1);
  prefix = (type == 'hashtag') ? '#' : '@';
  if (tag) return prefix + tag;
  if (name) return prefix + name.replace(/\W/g, '_');
  return prefix + 'notag' + Math.floor(Math.random() * 1000);
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

// @todo delete in favor of makeWithin
recordSchema.methods.updateWithin = function(tree, callback) {
  var tags = this.getWithinTags();
  this.newWithin = [];
  tags.forEach(function(tag) {
    this.getWithinRecordByTag(tag, function(err, record) {
      if (err) return callback(err);
      this.newWithin.push(record);
      //@todo fix this ugly way to syncrhonize a foreach
      if (tags.length === this.newWithin.length) {
        this.within = this.newWithin;
        this.updateRanking(tree);
        if (tree) this.updateStructure(tree);
        return callback(null, this);
      }
    }.bind(this));
  }, this);
};

// We parse the description to find @Teams, #hashtags & @persons and build the within array accordingly.
// @todo this works only if organisation.records are loaded, otherwise creates duplicates be.
recordSchema.methods.makeWithin = function(organisation) {
  var tags = this.getWithinTags();
  var newRecords = [];
  this.within = tags.map(
    function(tag) {
      var outputRecord;
      var localRecord = organisation.records.find(record => record.tag === tag);
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
  return newRecords;
};

recordSchema.statics.shallowCopy = function(record) {
  return this({
    _id: record.id,
    name: record.name,
    tag: record.tag,
    type: record.type
  });
};

recordSchema.methods.getWithinTags = function() {
  var regex = /([@#][\w-<>\/]+)/g;
  var tags = this.description.match(regex);
  if (!tags || tags.length === 0) {
    this.description += '#notags';
    tags = ['#notags'];
  }
  // A team or a hashtag is within itself so it shows when filtering.
  if (this.type != 'person') tags.unshift(this.tag);
  return tags;
};

// @todo what if Record.within is not populated ? You're screwed aren't you ?
recordSchema.methods.getWithinRecordByTag = function(tag, callback) {
  var localRecord = this.within.find(function(record) {
    return record.tag === tag;
  });
  if (localRecord) {
    return callback(null, localRecord);
  } else {
    this.model('Record').findByTag(tag, this.organisation, function(err, distantRecord) {
      if (err) return callback(err);
      if (distantRecord) return callback(null, distantRecord);
      else this.model('Record').createByTag(tag, this.organisation, callback);
    }.bind(this));
  }
};

recordSchema.statics.findByTag = function(tag, organisationId, callback) {
  this.findOne({organisation: organisationId, tag: tag}, callback);
};

recordSchema.statics.createByTag = function(tag, organisationId, callback) {
  name = tag.slice(1);
  type = tag.substr(0,1) === '@' ? 'team' : 'hashtag';
  record = new this({
    name: name,
    tag: tag,
    type: type,
    organisation: organisationId
  });
  record.save(callback);
};

recordSchema.statics.makeFromTag = function(tag, organisationId) {
  let type = tag.substr(0,1) === '@' ? 'team' : 'hashtag';
  tag = (type === 'team') ? '@' + tag.charAt(1).toUpperCase() + tag.slice(2) : '#' + tag.slice(1);
  let name = tag.slice(1);
  inputObject = {
    type: type,
    tag: tag,
    name: name,
    organisation: organisationId
  };
  return this.makeFromInputObject(inputObject);
};

// @todo what if Record.within is not populated ? You're screwed aren't you ?
recordSchema.methods.updateStructure = function(tree) {
    structureHelper = new StructureHelper(this.within, tree);
    structureHelper.build();
    this.structure = structureHelper.structure;
};

recordSchema.methods.makeStructure = function(organisation) {
  structureHelper = new StructureHelper(this.within, organisation.tree);
  structureHelper.build();
  this.structure = structureHelper.structure;
};

recordSchema.methods.updateRanking = function(tree) {
  switch (this.type) {
    case 'person' : this.ranking = 1000; break;
    case 'hashtag' : this.ranking = 2000; break;
    case 'team' : this.ranking = 3000; break;
  }
  if (tree) this.ranking += this.getStructureRanking(tree);
};

recordSchema.methods.makeRanking = function(organisation) {
  switch (this.type) {
    case 'person' : this.ranking = 1000; break;
    case 'hashtag' : this.ranking = 2000; break;
    case 'team' : this.ranking = 3000; break;
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

recordSchema.pre('save', function(next) {
  if (this.type == 'team') {
    this.tag = '@' + this.tag.charAt(1).toUpperCase() + this.tag.slice(2);
  }
  next();
});

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

recordSchema.plugin(mongooseAlgolia, {
  appId: process.env.ALGOLIA_APPLICATION_ID,
  apiKey: process.env.ALGOLIA_WRITE_KEY,
  indexName: 'world',
  selector: '-_id -created -updated -google -hidden_links',
  populate: {
    path: 'within',
    select: 'name tag type'
  },
  softdelete: true,
  debug: true
});

var Record = mongoose.model('Record', recordSchema);

Record.validationSchema = {
  name: {
    isLength: {
      options: [{ min: 1, max: 64 }],
      errorMessage: 'Name should be between 1 and 64 chars long' // Error message for the validator, takes precedent over parameter message
    }
  },
  description: {
    isLength: {
      options: [{ min: 2, max: 2048 }],
      errorMessage: 'Description should be between 2 and 2048 chars long' // Error message for the validator, takes precedent over parameter message
    }
  }
};

module.exports = Record;
