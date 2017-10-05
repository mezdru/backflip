/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 23-06-2017 06:47
* @Copyright: Clément Dietschy 2017
*/

var User = require('../user.js');
var undefsafe = require('undefsafe');
var md5 = require('md5');
var randomstring = require('randomstring');

var EmailRecord = require('./email_record.js');
var EmailHelper = require('../../helpers/email_helper.js');
var UrlHelper = require('../../helpers/url_helper.js');

var EmailUser = {};

//@todo look for user with a google email too
EmailUser.getByEmail = function (email, callback) {
  User.findOne({'email.value': email}, callback);
};

EmailUser.getByHash = function (hash, callback) {
  User.findOne({'email.hash': hash}, callback);
};

EmailUser.makeHash = function (user) {
  user.email.hash = user.email.hash || md5(user.email.value);
};

EmailUser.generateToken = function (user, callback) {
  if (!user.email.value) {
    err = new Error('Email authentification not activated for user');
    err.status = 403;
    return callback(err);
  }
  EmailUser.makeHash(user);
  user.email.token = randomstring.generate(128);
  user.email.generated = Date.now();
  user.save(callback);
};

EmailUser.sendLoginEmail = function (user, res, callback) {
  EmailUser.generateToken(user, function(err, user) {
    if (err) return callback(err);
    EmailHelper.public.emailInvite(user.name, user.email.value, EmailUser.getLoginUrl(user, res));
    return callback(null, user);
  });
};

EmailUser.getLoginUrl = function(user, res) {
  var url = new UrlHelper(undefsafe(res.locals, 'organisation.tag'), "email/login/callback", `?hash=${user.email.hash}&token=${user.email.token}`, res.getLocale()).getUrl();
  console.log(url);
  return url;
};

EmailUser.login = function(hash, token, callback) {
  EmailUser.getByHash(hash, function(err, user) {
    if (err) return callback(err);
    if (!user) {
      err = new Error('Cannot find user from Hash');
      err.status = 404;
      return callback(err);
    }
    authenticate = EmailUser.authenticate(user, token);
    if (authenticate === true) {
      return callback(null, user);
    } else {
      return callback(authenticate);
    }
  });
};

EmailUser.authenticate = function(user, token) {
  if (EmailUser.tokenStillValid(user.email.generated)) {
    if (user.email.token === token) {
      return true;
    } else {
      err = new Error('Wrong Token');
      err.status = 403;
      return err;
    }
  } else {
    //@todo renew token & send email here instead of failing miserably.
    err = new Error('Token expired');
    err.status = 403;
    return err;
  }
};

EmailUser.tokenStillValid = function(generated) {
  return generated > Date.now() - 24*30*3600*1000;
};

EmailUser.createByEmail = function(email, organisationId, callback) {
  this.getByEmail(email, function(err, user) {
    if (err) return callback(err);
    if (user) {
      err = new Error('User already exist');
      err.status = 403;
      return callback(err);
    }
    EmailRecord.createRecord(email, organisationId, function(err, record) {
      if (err) return callback(err);
      user = new User({
        email: {
          value: email,
          hash: md5(email)
        },
        orgsAndRecords: [
          {
            organisation: organisationId,
            record: record._id
          }
        ]
      });
      return user.save(callback);
    });
  });
};

module.exports = EmailUser;