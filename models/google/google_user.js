var User = require('../user.js');
var GoogleOrganisation = require('./google_organisation.js');
var GoogleRecord = require('./google_record.js');
var EmailUser = require('../email/email_user.js');
var undefsafe = require('undefsafe');

var GoogleUser = {};

GoogleUser.getByTokens = function (tokens, oAuth, callback) {
  tokens.id_payload = GoogleUser.decodeIdToken(tokens.id_token);
  User.findOne({'google.id': tokens.id_payload.sub})
  .populate('orgsAndRecords.record', 'name picture tag')
  .populate('orgsAndRecords.organisation', 'name picture tag')
  .exec( function(err, user) {
    if (err) return callback(err);
    //if no user is returned, create a new user
    if (!user) {
      EmailUser.getByEmail(tokens.id_payload.email, function(err, user) {
        if(err) return callback(err);
        if(!user) return GoogleUser.newByTokens(tokens, oAuth, callback);
        else return GoogleUser.addStrategy(tokens, user, callback);
      });
    }
    //else return the found user
    else return callback(null, user);
  });
};

//@todo merge with getByEmail (findAndUpdate) and save 1 DB query.
GoogleUser.addStrategy = function(tokens, user, callback) {
  //we probably decoded the id_token just before, but in case we didn't
  tokens.id_payload = tokens.id_payload || GoogleUser.decodeIdToken(tokens.id_token);
  user.google = {
    id: tokens.id_payload.sub,
    email: tokens.id_payload.email,
    normalized: User.normalizeEmail(tokens.id_payload.email),
    hd: tokens.id_payload.hd,
    tokens: {
      id_token: tokens.id_token,
      refresh_token: tokens.refresh_token
    }
  };
  return user.save(callback);
};


GoogleUser.newByTokens = function(tokens, oAuth, callback) {
  //we probably decoded the id_token just before, but in case we didn't
  tokens.id_payload = tokens.id_payload || GoogleUser.decodeIdToken(tokens.id_token);
  //@todo populate all fields
  //@todo fetch from google+ or userinfo...
  var user = new User({
    google: {
      id: tokens.id_payload.sub,
      email: tokens.id_payload.email,
      normalized: User.normalizeEmail(tokens.id_payload.email),
      hd: tokens.id_payload.hd,
      tokens: {
        id_token: tokens.id_token,
        refresh_token: tokens.refresh_token
      },
    },
  });

  return user.save(callback);

  // if there is no domain, we cannot find or create an organisation
  //if (!user.google.hd) return user.save(callback);

  // if there is a domain, we find the user's organisation and the user Record
  //@todo inherit admin from Google (careful with 204 redirect not happening due to restrict.js L44)
  //@todo fetch record not only on user creation (imagine this is the first user)
  /*GoogleOrganisation.getByDomain(user.google.hd, user, function(err, organisation) {
    if (err) return callback(err);
    GoogleUser.attachOrgAndRecord(user, organisation, callback);
  });*/
};

GoogleUser.attachOrgAndRecord = function(user, organisation, callback) {
  //@todo what if the record does not exist yet ?
  //@todo what if the record exists but we are not in the same domain ?
  //@todo what if the record exists but without google id ?
  GoogleRecord.getByGoogleId(user.google.id, organisation._id, function(err, record) {
    if (err) return callback(err);
    user.attachOrgAndRecord(organisation, record, callback);
  });
};

// A function taking the id_token from Google OAuth and returning the payload as an array
GoogleUser.decodeIdToken = function (idToken) {
    var encodedPayload = idToken.split('.')[1];
    var buffer = new Buffer(encodedPayload, 'base64');
    var decodedPayload = JSON.parse(buffer.toString('utf8'));
    return decodedPayload;
};

module.exports = GoogleUser;
