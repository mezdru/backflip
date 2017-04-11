/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 11-04-2017 02:35
* @Copyright: Clément Dietschy 2017
*/

var Organisation = require('../organisation.js');

var GoogleOrganisation = {};

GoogleOrganisation.getByDomain = function (domain, oAuth, callback) {
  Organisation.findOne({'google.hd': domain}, function(err, organisation) {
    if (err) return callback(err);
    if (!organisation) return GoogleOrganisation.newByDomain(domain, oAuth, callback);
    else return callback(null, organisation);
  });
};

GoogleOrganisation.newByDomain = function (domain, oAuth, callback) {
  //@todo populate all fields
  //@todo fetch from googleadmin ...
  var organisation = new Organisation({
    name: domain,
    tag: this.tagFromDomain(domain),
    google: {
      hd: domain,
    },
  });
  return organisation.save(callback);
};

GoogleOrganisation.tagFromDomain = function (domain) {
  var elements = domain.split('.');
  return elements[0];
};

module.exports = GoogleOrganisation;
