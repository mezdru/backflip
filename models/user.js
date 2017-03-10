var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
  given_name: String,
  picture: String,
  locale: String,
  org: {type: String, ref: 'Organisation'},
  google: {
    tokens: {
      access_token: String,
      id_token: String,
      refresh_token: String
    },
    id: {type: String, index: true, unique: true},
    email: String,
    hd: String
  },
  first_login: Date,
  last_login: Date,
  welcomed: Boolean
});

var User = mongoose.model('User', userSchema);

User.getByGoogleTokens = function(googleTokens, cal) {
  var google = {tokens: googleTokens};
  Object.assign(google, this.decodeIdToken(google.tokens.id_token));
  google.id = google.sub;
  User.findOne({'google.id': google.id}, function(err, user) {
    //@todo what if there is no answer ? what it there is (update last_login for example)
  });
};

User.decodeIdToken = function (id_token) {
    var payload = id_token.split('.')[1];
    var buffer = new Buffer(payload, 'base64');
    return JSON.parse(buffer.toString('utf8'));
};

module.exports = User;
