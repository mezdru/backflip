var Organisation = require('../organisation.js');

var GoogleOrganisation = {};

//@todo handle multi wingzy per domain
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
  return organisation.save(callback);
};

GoogleOrganisation.tagFromDomain = function (domain) {
  var elements = domain.split('.');
  return elements[0];
};

module.exports = GoogleOrganisation;
