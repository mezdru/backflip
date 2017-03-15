/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 15-03-2017
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
    google: {
      hd: domain,
    },
  });
  return organisation.save(callback);
};

module.exports = GoogleOrganisation;
