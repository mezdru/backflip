var mongoose = require('mongoose');

var linkSchema = mongoose.Schema({
  type: {type: String},
  value: String,
  url: String,
  username: String,
  display: String
});

module.exports = linkSchema;
