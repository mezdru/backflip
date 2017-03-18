/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 18-03-2017 12:07
* @Copyright: Clément Dietschy 2017
*/

var algoliasearch = require('algoliasearch');
var client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_WRITE_KEY);

var Organisation = require('../organisation.js');

var AlgoliaOrganisation = {};

AlgoliaOrganisation.makePublicKey = function(organisationId) {
  var public_key = {};
  // tokens lives 1 day
  public_key.valid_until = Date.now() + 3600 * 24 * 1000;
  public_key.value = client.generateSecuredApiKey(
    process.env.ALGOLIA_READ_KEY,
    {
      filters: '_organisation:all OR _organisation:'+organisationId,
      validUntil: Math.floor(public_key.valid_until / 1000)
    }
  );
  return public_key;
};

module.exports = AlgoliaOrganisation;
