/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 16-03-2017
* @Copyright: Clément Dietschy 2017
*/

var secrets = require('../../secrets.json');
var algoliasearch = require('algoliasearch');
var client = algoliasearch('RSXBUBL0PB', secrets.algolia.write_api_key);

var Organisation = require('../organisation.js');

var AlgoliaOrganisation = {};

AlgoliaOrganisation.makePublicKey = function(organisationId) {
  var public_key = {};
  // tokens lives 1 week
  public_key.valid_until = Date.now() + 3600 * 24 * 7 * 1000;
  public_key.value = client.generateSecuredApiKey(
    secrets.algolia.read_only_api_key,
    {
      filters: '_organisation:world OR _organisation:'+organisationId,
      validUntil: Math.floor(public_key.valid_until / 1000)
    }
  );
  return public_key;
};

module.exports = AlgoliaOrganisation;
