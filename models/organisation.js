var mongoose = require('mongoose');

var organisationSchema = mongoose.Schema({
  name: String,
  picture: String,
  google: {
    hd: String,
  },
  created: { type: Date, default: Date.now },
  updated: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false }
});

var Organisation = mongoose.model('Organisation', organisationSchema);

organisationSchema.methods.needsWelcoming = function () {
  return !this.welcomed;
};

module.exports = Organisation;
