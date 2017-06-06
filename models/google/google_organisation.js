/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 06-06-2017 11:14
* @Copyright: Clément Dietschy 2017
*/

var Organisation = require('../organisation.js');
var EmailHelper = require('../../helpers/email_helper.js');

var GoogleOrganisation = {};

//@todo handle multi domain per organisation
GoogleOrganisation.getByDomain = function (domain, user, callback) {
  Organisation.findOne({'google.hd': domain}, function(err, organisation) {
    if (err) return callback(err);
    if (!organisation) return GoogleOrganisation.newByDomain(domain, user, callback);
    else return callback(null, organisation);
  });
};

GoogleOrganisation.newByDomain = function (domain, user, callback) {
  //@todo populate all fields
  //@todo fetch from googleadmin ...
  var organisation = new Organisation({
    name: domain,
    tag: this.tagFromDomain(domain),
    google: {
      hd: domain,
    },
  });
  EmailHelper.superadmin.newOrg(user.name, user.google.email, organisation.name, `${organisation.tag}.lenom.io`);
  return organisation.save(callback);
};

GoogleOrganisation.tagFromDomain = function (domain) {
  var elements = domain.split('.');
  return elements[0];
};

module.exports = GoogleOrganisation;
