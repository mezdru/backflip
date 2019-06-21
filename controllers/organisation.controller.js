var Organisation = require('../models/organisation');

exports.getSingleOrganisationForPublic = (req, res, next) => {
  Organisation.findOne({tag: req.params.tag})
  .then(organisation => {

    if(!organisation) {
      req.backflip = {message: 'Organisation not found by tag', status: 404};
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

// + algolia routes (private, public)