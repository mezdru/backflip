var express = require('express');
var router = express.Router();
var RecordController = require('../../controllers/record.controller');
var Authorization = require('../authorization/access.authorization');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var ValidateRecord = require('../validation/record.validation');
let passport = require('passport');
require('../passport/strategy');

const RESOURCE_MODEL = 'record';

router.use((req, res, next) => {
  req.backflip = req.backflip || {};
  req.backflip.resource = {
    model: RESOURCE_MODEL
  }
  next();
});

/** GETs */

router.get(
  '/:id/occurrence',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.superadminOnly,
  // ...
  Authorization.resWithData
)

router.get(
  '/:id', 
  passport.authenticate('bearer', {session: false}),
  RecordController.getSingleRecord,
  Authorization.resUserOwnOnly, 
)

router.get(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.superadminOnly,
  RecordController.getRecords,
  Authorization.resWithData
)

/** POSTs */

router.post(
  '/:id/links',
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOnly,
  RecordController.createSingleLink,
  Authorization.resWithData
)

router.post(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  ValidateRecord,
  RecordController.createSingleRecord,
  Authorization.resWithData
)

/** PUTs */

router.put(
  '/:id/links/:subId',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOnly,
  RecordController.updateSingleLink,
  Authorization.resWithData
)

router.put(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOnly,
  ValidateRecord,
  RecordController.updateSingleRecord,
  Authorization.resWithData 
)

/** DELETEs */

router.delete(
  '/:id/links/:subId',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  RecordController.deleteSingleLink,
  Authorization.resWithData
)

router.delete(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOnly,
  // ...
  Authorization.resWithData
)

module.exports = router;