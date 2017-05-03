/**
* @Author: Clément Dietschy <bedhed>
* @Date:   15-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 03-05-2017 03:39
* @Copyright: Clément Dietschy 2017
*/

var algoliasearch = require('algoliasearch');
var client = algoliasearch(process.env.ALGOLIA_APPLICATION_ID, process.env.ALGOLIA_WRITE_KEY);

var Organisation = require('../organisation.js');

var RecordObjectCSVHelper = require('../../helpers/record_csv_helper.js');

var AlgoliaOrganisation = {};

AlgoliaOrganisation.makePublicKey = function(organisationId) {
  var public_key = {};
  // tokens lives 1 day
  public_key.valid_until = Date.now() + 3600 * 24 * 1000;
  public_key.value = client.generateSecuredApiKey(
    process.env.ALGOLIA_READ_KEY,
    {
      filters: 'organisation:all OR organisation:'+organisationId,
      validUntil: Math.floor(public_key.valid_until / 1000)
    }
  );
  return public_key;
};

AlgoliaOrganisation.clear = function(organisationId, callback) {
  var world = client.initIndex('world');
  world.deleteByQuery({filters: 'organisation:'+organisationId}, callback);
};

AlgoliaOrganisation.browse = function(organisationId, callback) {
  var world = client.initIndex('world');
  world.browse({filters: 'organisation:'+organisationId}, callback);
};

AlgoliaOrganisation.exportHits4Csv = function(hits) {
  return RecordObjectCSVHelper.getCSVfromRecords(hits);
};

AlgoliaOrganisation.export4csv = function (hit) {
  var record4csv = {
      action: 'keep',
      _id: hit.objectID,
      name: hit.name,
      tag: hit.tag,
      type: hit.type,
      picture_url: hit.picture.url || hit.picture.uri || "/images" + hit.picture.path,
      description: hit.description,
  };
  hit.links.forEach(function (link, index) {
    if (link.type == 'home') {
      record4csv[`link_home`] = link.display;
    } else if (link.type == 'phone') {
      record4csv[`link_${index+1}`] = link.display;
    } else {
      record4csv[`link_${index+1}`] = link.value || link.uri;
    }
  });
  return record4csv;
};

module.exports = AlgoliaOrganisation;
