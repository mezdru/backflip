var User = require('../user.js');

var GoogleUser = {};

GoogleUser.getFromIdPayload = function (IdPayload, oAuth, callback) {
  User.findOne({'google.id': IdPayload.sub}, function(err, user) {
    if (err) return callback(err);
    if (!user) {
    }
    return callback(null, user);
  });
};

GoogleUser.newFromIdPayload = function(IdPayload, oAuth, callback) {
  /*var user = new User({
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
  user.save(function(err) {
    if (err) return next(err);
    //once saved let's go back as a registered user
    req.session.user = {
      id: user.id,
      email: user.email,
      google: {
        tokens: tokens
      }
    };
  });*/
};

module.exports = GoogleUser;
