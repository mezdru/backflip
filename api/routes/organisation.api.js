let express = require('express');
var passport = require('passport');

let OrganisationController = require('../../controllers/organisation.controller');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var Authorization = require('../authorization/access.authorization');
require('../passport/strategy');

let router = express.Router();

const RESOURCE_MODEL = 'organisation';

router.use((req, res, next) => {
  req.backflip = req.backflip || {};
  req.backflip.resource = {
    model: RESOURCE_MODEL
  }
  next();
});


router.get(
  '/forPublic',
  OrganisationController.getSingleOrganisationForPublic,
  Authorization.resWithData
);

router.get(
  '/:id/algolia/public', 
  OrganisationController.getAlgoliaPublicKey, 
  Authorization.resWithData
);

router.get(
  '/:id/algolia/private',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  OrganisationController.getAlgoliaPrivateKey,
  Authorization.resWithData
);

router.get(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  OrganisationController.getSingleOrganisation,
  Authorization.resWithData
);


module.exports = router;