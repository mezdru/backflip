var Organisation = require('../models/organisation');
var algoliaOrganisation = require('../models/algolia/algolia_organisation');
var KeenHelper = require('../helpers/keen_helper');
var undefsafe = require('undefsafe');

exports.getSingleOrganisationForPublic = (req, res, next) => {
  Organisation.findOne({ ...req.query })
    .populate('settings.wings.families', '_id name name_translated picture tag intro intro_translated')
    .populate('settings.search.tabs', '_id name name_translated picture tag intro intro_translated')
    .then(org => {

      if (!org) {
        req.backflip = { message: 'Organisation not found', status: 404 };
      } else {
        req.backflip = {
          message: 'Organisation found for public', status: 200, data: {
            _id: org._id,
            tag: org.tag,
            name: org.name,
            logo: org.logo,
            cover: org.cover,
            public: org.public,
            intro: org.intro,
            features: org.features,
            settings: (org.public ? org.settings : {auth: undefsafe(org, 'settings.auth')})
          }
        };
      }
      return next();
    }).catch(err => next(err));
}

exports.getSingleOrganisation = (req, res, next) => {
  Organisation.findOne({ _id: req.params.id })
    .populate('settings.wings.families', '_id name name_translated picture tag intro intro_translated')
    .populate('settings.search.tabs', '_id name name_translated picture tag intro intro_translated')
    .then(organisation => {
      if (!organisation) {
        req.backflip = { message: 'Organisation not found', status: 404 };
      } else {
        req.backflip = { message: 'Organisation found', status: 200, data: organisation };
      }
      return next();
    }).catch(err => next(err));
}

exports.updateSingleOrganisation = async (req, res, next) => {
  if(!req.body.organisation) {
    req.backflip = {message: "Missing organisation object in body.", status: 422};
    return next();
  }

  let newOrgValues = {};
  if(req.body.organisation.name) newOrgValues.name = req.body.organisation.name;
  if(req.body.organisation.intro) newOrgValues.intro = req.body.organisation.intro;
  if(req.body.organisation.tag && req.user.superadmin) newOrgValues.tag = req.body.organisation.tag; // control access to tag update
  if(req.body.organisation.logo) newOrgValues.logo = req.body.organisation.logo;
  if(req.body.organisation.cover) newOrgValues.cover = req.body.organisation.cover;

  let orgUpdated = await Organisation.findOneAndUpdate({ _id: req.organisation._id }, { $set: newOrgValues }, { new: true }).catch(e => null);

  if (!orgUpdated) {
    req.backflip = { message: 'Organisation not found', status: 404 };
    return next();
  }

  req.backflip = {message: "Organisation updated with success", status: 200, data: orgUpdated};
  return next();
}

exports.getAlgoliaPrivateKey = (req, res, next) => {
  Organisation.findOne({ _id: req.params.id })
    .then(organisation => {
      if (!organisation) {
        req.backflip = { message: 'Organisation not found.', status: 404 };
      } else {
        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        req.backflip = { message: 'Organisation algolia key found', status: 200, data: publicKey };
      }
      return next();
    }).catch(err => next(err));
}

exports.getAlgoliaPublicKey = (req, res, next) => {
  Organisation.findOne({ _id: req.params.id, public: true })
    .then(organisation => {
      if (!organisation) {
        req.backflip = { message: 'Organisation public not found.', status: 404 };
      } else {
        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        req.backflip = { message: 'Organisation algolia key found', status: 200, data: publicKey };
      }
      return next();
    }).catch(err => next(err));
}

exports.getKeenPublicKey = async (req, res, next) => {
  let keenKeyObject = await KeenHelper.findOrCreateAccessKey(req.params.id, 'writes', true);

  if (!keenKeyObject || !keenKeyObject.key) {
    req.backflip = { status: 422, message: "Can't fetch access key <Writes> for organisation." };
    return next();
  }

  req.backflip = { status: 200, message: "Keen access key <Writes> fetch with success.", data: keenKeyObject.key };
  return next();
}

exports.getKeenPrivateKey = async (req, res, next) => {
  let keenKeyObject = await KeenHelper.findOrCreateAccessKey(req.params.id, 'writes', false);

  if (!keenKeyObject || !keenKeyObject.key) {
    req.backflip = { status: 422, message: "Can't fetch access key <Writes> for organisation." };
    return next();
  }

  req.backflip = { status: 200, message: "Keen access key <Writes> fetch with success.", data: keenKeyObject.key };
  return next();
}

exports.getKeenPrivateReadKey = async (req, res, next) => {
  let keenKeyObject = await KeenHelper.findOrCreateAccessKey(req.params.id, 'queries', false);

  if (!keenKeyObject || !keenKeyObject.key) {
    req.backflip = { status: 422, message: "Can't fetch access key <Writes> for organisation." };
    return next();
  }

  req.backflip = { status: 200, message: "Keen access key <Writes> fetch with success.", data: keenKeyObject.key };
  return next();
}