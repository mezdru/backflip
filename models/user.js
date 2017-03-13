var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
  given_name: String,
  picture: String,
  locale: {type: String, default: 'en' },
  organisation: {type: mongoose.Schema.Types.ObjectId, ref: 'Organisation'},
  google: {
    id: {type: String, index: true, unique: true},
    email: {type: String, index: true, unique: true},
    hd: String,
    tokens: {
      id_token: String,
      refresh_token: String
    },
  },
  first_login: { type: Date, default: Date.now },
  last_login: { type: Date, default: Date.now },
  welcomed: { type: Boolean, default: false }
});

var User = mongoose.model('User', userSchema);



module.exports = User;
