/**
* @Author: Clément Dietschy <bedhed>
* @Date:   07-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 07-04-2017 11:22
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var recordSchema = mongoose.Schema({
  given_name: String,
  picture: String,
  _organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation', default: null},
  locale: {type: String, default: 'en' },
  google: {
    id: {type: String, index: true, unique: true},
    email: String,
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String
    },
  },
  last_login: { type: Date },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false }
});

userSchema.methods.touchLogin = function (callback) {
  this.last_login = Date.now();
  this.save(callback);
};

userSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

var User = mongoose.model('User', userSchema);



module.exports = User;
