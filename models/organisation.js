var mongoose = require('mongoose');

var organisationSchema = mongoose.Schema({
  name: String,
  picture: String,
  google: {
    hd: String,
  },
  added: { type: Date, default: Date.now }
});

var Organisation = mongoose.model('Organisation', organisationSchema);

module.exports = Organisation;
