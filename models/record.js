/**
* @Author: Clément Dietschy <bedhed>
* @Date:   07-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 05:33
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');
var mongooseDelete = require('mongoose-delete');
var mongooseAlgolia = require('mongoose-algolia');
var linkSchema = require('./link_schema.js');
var undefsafe = require('undefsafe');


var recordSchema = mongoose.Schema({
  name: String,
  tag: String,
  type: {type: String, enum: ['person', 'team', 'hashtag']},
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true},
  picture: {
    url: String,
    path: String
  },
  description: {type: String, default: '#empty'},
  within: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record', index: true}
  ],
  links: [linkSchema],
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
recordSchema.index({'organisation': 1, 'links.type': 1, 'links.value': 1}, { partialFilterExpression: {identifier: true} });

recordSchema.methods.getGoogleId = function() {
  return undefsafe(this, 'google.id');
};

recordSchema.methods.isPerson = function() {
  return this.type === 'person';
};

recordSchema.plugin(mongooseDelete, {
  deletedAt : true,
  overrideMethods: 'all',
  validateBeforeDelete: false,
  indexFields: 'all'
});

recordSchema.plugin(mongooseAlgolia, {
  appId: process.env.ALGOLIA_APPLICATION_ID,
  apiKey: process.env.ALGOLIA_WRITE_KEY,
  indexName: 'world',
  selector: '-_id -created -updated -google',
  debug: true
});

var Record = mongoose.model('Record', recordSchema);

Record.validationSchema = {
  name: {
    notEmpty: {
      errorMessage: 'Name should not be empty'
    },
    isLength: {
      options: [{ min: 4, max: 64 }],
      errorMessage: 'Name should be between 4 and 64 chars long' // Error message for the validator, takes precedent over parameter message
    }
  },
  description: {
    notEmpty: {
      errorMessage: 'Story should not be empty'
    },
    isLength: {
      options: [{ min: 16, max: 2048 }],
      errorMessage: 'Description should be between 16 and 2048 chars long' // Error message for the validator, takes precedent over parameter message
    }
  }
};



module.exports = Record;
