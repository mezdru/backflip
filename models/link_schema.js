/**
* @Author: Clément Dietschy <bedhed>
* @Date:   13-04-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 10-04-2017 05:33
* @Copyright: Clément Dietschy 2017
*/

var mongoose = require('mongoose');

var linkSchema = mongoose.Schema({
  type: {type: String},
  value: String,
  url: String,
  display: String
});

module.exports = linkSchema;
