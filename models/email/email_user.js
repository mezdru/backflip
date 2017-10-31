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
  User.findOne({'email.value': email}).
  populate('orgsAndRecords.record').
  exec(callback);
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

//@todo fails if user.orgsAndRecords not populated
EmailUser.sendLoginEmail = function (user, organisation, res, callback) {
  EmailUser.generateToken(user, function(err, user) {
    if (err) return callback(err);
    let name = organisation ? user.getName(organisation._id).split(' ')[0] : '';
    EmailHelper.public.emailLogin(user.email.value, name, EmailUser.getLoginUrl(user, organisation, res.getLocale()), res);
    return callback(null, user);
  });
};

//if we generated a token less than 15 minutes ago
EmailUser.tooSoon = function (user, callback) {
  return user.email.generated > Date.now() - 15*60*1000;
};

//@todo fails if user.orgsAndRecords not populated
EmailUser.sendInviteEmail = function (user, inviter, organisation, res, callback) {
  EmailUser.generateToken(user, function(err, user) {
    if (err) return callback(err);
    EmailHelper.public.emailInvite(
      user.email.value,
      user.getName(organisation._id).split(' ')[0],
      inviter.getName(organisation._id),
      organisation.name,
      EmailUser.getLoginUrl(user, organisation, res.getLocale()),
      res);
    return callback(null, user);
  });
};

//@todo this should not be here as the logic is shared with other login strategies.
//@todo rewrite to allow all login strategies
EmailUser.sendMonthlyEmail = function(user, inviter, organisation, userCount, extract, res, callback) {
  EmailUser.generateToken(user, function(err, user) {
    if (err) return callback(err);
    EmailHelper.public.emailMonthly(
      user.loginEmail,
      user.getName(organisation._id).split(' ')[0],
      inviter.getName(organisation._id),
      organisation.name,
      userCount,
      EmailUser.getLoginUrl(user, organisation, res.getLocale()),
      extract,
      res
      );
    return callback(null, user);
  });
};

EmailUser.getLoginUrl = function(user, organisation, locale) {
  var url = new UrlHelper(undefsafe(organisation, 'tag'), "email/login/callback", `?hash=${user.email.hash}&token=${user.email.token}`, locale).getUrl();
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

EmailUser.addByEmail = function(email, organisation, record, callback) {
  this.getByEmail(email, function(err, user) {
    if (err) return callback(err);
    if (!user) {
      user = new User({
        email: {
          value: email,
          hash: md5(email)
        }
      });
    }
    if (!record) {
      record = EmailRecord.createRecord(email, organisation);
      record.save(function(err) {if (err) console.error(err);});
    }
    user.attachOrgAndRecord(organisation, record, callback);
  });
};

module.exports = EmailUser;
