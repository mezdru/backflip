/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 08-04-2017 09:44
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var organisationSchema = mongoose.Schema({
  name: String,
  picture: {
    uri: String,
    path: String
  },
  tag: {type: String, index: true, unique: true},
  google: {
    hd: String,
  },
  tree: [[String]],
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false },
  public: { type: Boolean, default: false }
});

organisationSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
