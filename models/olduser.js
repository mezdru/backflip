var mongoose = require('mongoose');
var oldusersSchema = mongoose.Schema({
  google: {
    id: {type: String, index: true, unique: true, sparse: true},
    //@todo rename to primaryEmail
    email: {type: String, index: true, unique: true, sparse: true}
  },
  email: {
    value: {type: String, index: true, unique: true, sparse: true},
  }
});

oldusersSchema.statics.findOneByEmail = function (email, callback) {
  email = EmailUser.normalize(email);
  this.findOne({$or: [{'google.normalized':email}, {'email.normalized':email}] }, callback);
};

var Olduser = mongoose.model('Olduser', oldusersSchema);

module.exports = Olduser;
