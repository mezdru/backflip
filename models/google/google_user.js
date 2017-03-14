var User = require('../user.js');

var GoogleUser = {};

GoogleUser.getFromIdPayload = function (idPayload, oAuth, callback) {
  User.findOne({'google.id': idPayload.sub}, function(err, user) {
    if (err) return callback(err);
    //if no user is returned, create a new user
    if (!user) return GoogleUser.newFromIdPayload(idPayload, oAuth, callback);
    //else return the found user
    return callback(null, user);
  });
};

GoogleUser.newFromIdPayload = function(IdPayload, oAuth, callback) {
  //@todo populate all fields
  //@todo fetch from google+ or userinfo...
  var user = new User({
    google: {
      id: tokenPayload.sub,
      email: tokenPayload.email,
      hd: tokenPayload.hd,
      tokens: {
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token
      },
    },
  });
  user.save(callback);
};

module.exports = GoogleUser;
