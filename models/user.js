var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
  google: {
    tokens: {
      access_token: String,
      id_token: String,
      refresh_token: String
    },
    id: {type: String, index: true, unique: true},
    email: String,
    name: String,
    given_name: String,
    family_name: String,
    link: String,
    picture: String,
    gender: String,
    locale: String,
    hd: String
  },
  created: Date,
  touched: Date,
});

var User = mongoose.model('User', userSchema);

User.getByGoogleId = function(googleId, cal) {
  User.findOne({'google.id': googleId}, function(err, user) {
    return cal(err, user);
  });
};

module.exports = User;
