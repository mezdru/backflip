var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
  given_name: String,
  picture: String,
  google: {
    id: {type: String, index: true, unique: true},
    email: String,
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String
    },
  },
  locale: {type: String, default: 'en' },
  //organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation'},
  first_login: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false }
});

var User = mongoose.model('User', userSchema);

module.exports = User;
