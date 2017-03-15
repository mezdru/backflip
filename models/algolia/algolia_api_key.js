/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 15-03-2017
* @Copyright: Clément Dietschy 2017
*/

var secrets = require('../../secrets.json');
var algoliasearch = require('algoliasearch');
var client = algoliasearch('RSXBUBL0PB', secrets.algolia.write_api_key);

var Organisation = require('../organisation.js');

var AlgoliaApiKey = {};

AlgoliaApiKey.renewPublicKey = function (organisationId, callback) {
  var public_key =  AlgoliaApiKey.makePublicKey(organisationId);
  Organisation.findByIdAndUpdate(organisationId, {$set: {algolia: {public_key: public_key}}}, callback);
};

AlgoliaApiKey.makePublicKey = function(organisationId) {
  var public_key = {};
  // tokens lives 1 week
  public_key.valid_until = Date.now() + 3600 * 24 * 7 * 1000;
  public_key.value = client.generateSecuredApiKey(
    secrets.algolia.read_only_api_key,
    {
      filters: '_organisation:all OR _organisation:'+organisationId,
      validUntil: Math.floor(public_key.valid_until / 1000)
    }
  );
  return public_key;
};

AlgoliaApiKey.getPublicKey = function(organisationId, callback) {
  Organisation.findById(organisationId, 'algolia.public_key', function(err, organisation) {
    return callback(err, organisation.algolia.public_key);
  });
};

//@todo remove, just for playing around during dev
AlgoliaApiKey.test = function(query, callback) {
  AlgoliaApiKey.getPublicKey('58c909db06dd0e24af5522bf', function(err, publicKey) {
    console.log(publicKey);
    if (err) return callback(err);
    client = algoliasearch('RSXBUBL0PB', publicKey.value);
    index = client.initIndex('world');
    index.search(query, callback);
  });
};

module.exports = AlgoliaApiKey;
