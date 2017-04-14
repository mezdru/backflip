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
var linkSchema = require('./link.js');

var recordSchema = mongoose.Schema({
  name: String,
  tag: String,
  type: {type: String, enum: ['person', 'team', 'hashtag']},
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null, index: true},
  picture: {
    uri: String,
    path: String
  },
  description: String,
  within: [
    {type: mongoose.Schema.Types.ObjectId, ref: 'Record', index: true}
  ],
  links: [linkSchema],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
});

recordSchema.index({'organisation': 1, 'tag': 1}, {unique: true});
recordSchema.index({'organisation': 1, 'links.type': 1, 'links.value': 1}, { partialFilterExpression: {identifier: true} });

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
