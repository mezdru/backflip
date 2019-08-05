var Organisation = require('../models/organisation');
var algoliaOrganisation = require('../models/algolia/algolia_organisation');

exports.getSingleOrganisationForPublic = (req, res, next) => {
  Organisation.findOne({... req.query})
  .then(organisation => {

    if(!organisation) {
      req.backflip = {message: 'Organisation not found', status: 404};
    } else {
      req.backflip = {message: 'Organisation found for public', status: 200, data: {
        _id: organisation._id,
        tag: organisation.tag,
        name: organisation.name,
        logo: organisation.logo,
        cover: organisation.cover,
        public: organisation.public        
      }};
    }
    return next();
  }).catch(err => next(err));
}

exports.getSingleOrganisation = (req, res, next) => {
  Organisation.findOne({_id: req.params.id})
  .then(organisation => {
    if(!organisation) {
      req.backflip = {message: 'Organisation not found', status: 404};
    } else {
      req.backflip = {message: 'Organisation found', status: 200, data: organisation};
    }
    return next();
  }).catch(err => next(err));
}

exports.getAlgoliaPrivateKey = (req, res, next) => {
  Organisation.findOne({_id: req.params.id})
  .then(organisation => {
    if(!organisation) {
      req.backflip = {message: 'Organisation not found.', status: 404};
    } else {
      let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
      req.backflip = {message: 'Organisation algolia key found', status: 200, data: publicKey};
    }
    return next();
  }).catch(err => next(err));
}

exports.getAlgoliaPublicKey = (req, res, next) => {
  Organisation.findOne({_id: req.params.id, public: true})
  .then(organisation => {
    if(!organisation) {
      req.backflip = {message: 'Organisation public not found.', status: 404};
    } else {
      let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
      req.backflip = {message: 'Organisation algolia key found', status: 200, data: publicKey};
    }
    return next();
  }).catch(err => next(err));
}
