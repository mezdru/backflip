/**
* @Author: Clément Dietschy <bedhed>
* @Date:   07-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 23-04-2017 04:21
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');
var mongooseDelete = require('mongoose-delete');
var mongooseAlgolia = require('mongoose-algolia');
var linkSchema = require('./link_schema.js');
var undefsafe = require('undefsafe');
var LinkHelper = require('../helpers/link_helper.js');
var HierarchyHelper = require('../helpers/hierarchy_helper.js');


var recordSchema = mongoose.Schema({
  name: String,
  tag: String,
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
  hierarchy: {},
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

//@todo restore the unique; true condition on organisation/tag
//There's some UI needed here. Or make a different tag if needed.
recordSchema.index({'organisation': 1, 'tag': 1}/*, {unique: true}*/);
recordSchema.index({'organisation': 1, 'links.type': 1, 'links.value': 1});

recordSchema.methods.getGoogleId = function() {
  return undefsafe(this, 'google.id');
};

recordSchema.methods.isPerson = function() {
  return this.type === 'person';
};

recordSchema.statics.exportRecords4Csv = function(records) {
  var header = {
      action: 'action',
      _id: '_id',
      name: 'name',
      tag: 'tag',
      type: 'type',
      picture_url: 'picture_url',
      description: 'description',
  };
  for (var i=1; i<16; i++) {
    header[`link_${i}`] = `link_${i}`;
  }
  header[`link_home`] = 'link_home';
  var records4csv = [header];
  records.forEach(function (record) {
    records4csv.push(record.export4csv());
  });
  return records4csv;
};

recordSchema.methods.export4csv = function () {
  var record4csv = {
      action: 'keep',
      _id: this._id,
      name: this.name,
      tag: this.tag,
      type: this.type,
      picture_url: this.picture.url,
      description: this.description,
  };
  this.links.forEach(function (link, index) {
    if (link.type == 'home') {
      record4csv[`link_home`] = link.display;
    } else if (link.type == 'phone') {
      record4csv[`link_${index+1}`] = link.display;
    } else {
      record4csv[`link_${index+1}`] = link.value;
    }
  });
  return record4csv;
};

recordSchema.statics.importRecordFromCsvLineAsJson = function(csvLineAsJson, organisationId, userId, callback) {
  if (csvLineAsJson.action != 'create' && csvLineAsJson.action != 'overwrite' && csvLineAsJson.action != 'update' && csvLineAsJson.action != 'delete') return callback(null, null);
  var csvLineAsRecord = this.readCsvLineAsJson(csvLineAsJson, organisationId);
  if (csvLineAsRecord.action == 'create') {
      return this.model('Record').createFromCsv(csvLineAsRecord, callback);
  } else if ((csvLineAsRecord.action == 'overwrite' || csvLineAsRecord.action == 'update' || csvLineAsRecord.action == 'delete') && csvLineAsRecord._id) {
    this.findById(csvLineAsRecord._id).populate('within', 'name tag type').exec(function(err, oldRecord) {
      if (err) return callback(err);
      if (!oldRecord) return callback(null, null);
      if (!oldRecord.organisation.equals(organisationId)) {
        return callback(new Error('Record out of Organisation'));
      }
      if (csvLineAsRecord.action == 'overwrite') {
        return oldRecord.overwriteFromCsv(csvLineAsRecord, callback);
      } else if (csvLineAsRecord.action == 'update') {
        return oldRecord.updateFromCsv(csvLineAsRecord, callback);
      } else if (csvLineAsRecord.action == 'delete') {
        return oldRecord.delete(userId, callback);
      }
    });
  }
};

recordSchema.statics.readCsvLineAsJson = function(csvLineAsJson, organisationId) {
  var csvLineAsRecord = csvLineAsJson;
  csvLineAsRecord.organisation = organisationId;
  csvLineAsRecord.picture = {
    url: csvLineAsJson.picture_url
  };
  csvLineAsRecord.links = [];
  for (var prop in csvLineAsJson) {
    let header = prop.split('_');
    if (csvLineAsRecord[prop] && header[0] == 'link') {
      let link = { value: csvLineAsRecord[prop] };
      if (header[1] && !parseInt(header[1], 10)) link.type = header[1];
      csvLineAsRecord.links.push(link);
    }
  }
  return csvLineAsRecord;
};

recordSchema.statics.createFromCsv = function(csvLineAsRecord, callback) {
  if (csvLineAsRecord.action == 'create') {
    delete csvLineAsRecord._id;
    newRecord = new this(csvLineAsRecord);
    newRecord.links = csvLineAsRecord.links.map(function(link) {
      return new LinkHelper(link.value, link.type).link;
    });
    newRecord.updateWithin(null, function(err) {
      if (err) return console.error(err);
      this.save(callback);
    }.bind(newRecord));
  }
};

recordSchema.methods.overwriteFromCsv = function (csvLineAsRecord, callback) {
  if (csvLineAsRecord.action == 'overwrite') {
    this.name = csvLineAsRecord.name;
    this.tag = csvLineAsRecord.tag;
    this.type = csvLineAsRecord.type;
    this.picture = csvLineAsRecord.picture;
    this.description = csvLineAsRecord.description;
    this.links = csvLineAsRecord.links.map(function(link) {
      return new LinkHelper(link.value, link.type).link;
    });
    this.updateWithin(null, function(err) {
      if (err) return console.error(err);
      this.save(callback);
    }.bind(this));
  }
};

recordSchema.methods.updateFromCsv = function (csvLineAsRecord, callback) {
  if (csvLineAsRecord.action == 'update') {
    this.name = csvLineAsRecord.name;
    this.tag = csvLineAsRecord.tag;
    this.type = csvLineAsRecord.type;
    this.picture = csvLineAsRecord.picture;
    this.description = csvLineAsRecord.description;
    this.updateWithin(null, function(err) {
      if (err) return console.error(err);
      this.save(callback);
    }.bind(this));
  }
};


//@todo there's a pattern break here, the links array should have been parsed by the router first
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

// We parse the description to find @Teams, #hashtags & @persons and build the within array accordingly.
// @todo check performance of this expensive logic, if bulked there's better to do, like loading all teams & hashtags at once.
// @todo I don't want to make this a pre middleware because of performance, but maybe it should be.
// @todo teams tags are capitalized as a pre filter, but the tag is not updated in the desciption yet
recordSchema.methods.updateWithin = function(tree, callback) {
	var regex = /([@#][\w-<>\/]+)/g;
  var tags = this.description.match(regex);
  if (!tags || tags.length === 0) {
    this.description += '#notags';
    tags = ['#notags'];
  }
  this.newWithin = [];
  tags.forEach(function(tag) {
    this.getWithinRecordByTag(tag, function(err, record) {
      if (err) return callback(err);
      this.newWithin.push(record);
      //@todo fix this ugly way to syncrhonize a foreach
      if (tags.length === this.newWithin.length) {
        this.within = this.newWithin;
        if (tree) this.updateHierarchy(tree);
        return callback(null, this);
      }
    }.bind(this));
  }, this);
};

recordSchema.methods.updateHierarchy = function(tree) {
    hierarchyHelper = new HierarchyHelper(this.within, tree);
    hierarchyHelper.build();
    this.hierarchy = hierarchyHelper.hierarchy;
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



recordSchema.pre('save', function(next) {
  if (this.type == 'team') {
    this.tag = '@' + this.tag.charAt(1).toUpperCase() + this.tag.slice(2);
  }
  next();
});

/*recordSchema.pre('save', function(next) {
  if (!this.ranking) {
    switch (this.type) {
      case 'person' : this.ranking = 1000; break;
      case 'hashtag' : this.ranking = 2000; break;
      case 'team' : this.ranking = 3000; break;
    }
  }
  next();
});*/

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
      errorMessage: 'Name should be between 4 and 64 chars long' // Error message for the validator, takes precedent over parameter message
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
