/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 05:31
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

organisationSchema.methods.welcome = function(callback) {
  this.welcomed = true;
  this.save(callback);
};

var Organisation = mongoose.model('Organisation', organisationSchema);


module.exports = Organisation;
