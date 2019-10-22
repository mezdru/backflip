var express = require('express');
var router = express.Router();
var RecordController = require('../../controllers/record.controller');
var Authorization = require('../authorization/access.authorization');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var ValidateRecord = require('../validation/record.validation');
let passport = require('passport');
require('../passport/strategy');

/** GETs */

router.get(
  '/populated',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  RecordController.getPopulatedRecord,
  Authorization.resWithData
)

router.get(
  '/:id/occurrence',
  passport.authenticate('bearer', {session: false}),
  Authorization.superadminOnly,
  // ...
  Authorization.resWithData
)

router.get(
  '/:id', 
  passport.authenticate('bearer', {session: false}),
  RecordController.getSingleRecord,
  Authorization.resUserOwnOrAdmin, 
)

router.get(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  RecordController.getRecords,
  Authorization.resWithData
)

/** POSTs */

router.post(
  '/:id/links',
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOrAdmin,
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
  Authorization.userOwnsRecordOrAdmin,
  RecordController.updateSingleLink,
  Authorization.resWithData
)

router.put(
  '/:id/promote',
  passport.authenticate('bearer', {session: false}),
  Authorization.superadminOnly,
  RecordController.promoteSingleRecord,
  Authorization.resWithData
)

router.put(
  '/:idFrom/merge/:idTo',
  passport.authenticate('bearer', {session: false}),
  Authorization.superadminOnly,
  RecordController.mergeRecords,
  Authorization.resWithData
)

router.put(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOrAdmin,
  ValidateRecord,
  RecordController.updateSingleRecord,
  Authorization.resWithData 
)

/** DELETEs */

router.delete(
  '/:id/links/:subId',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOrAdmin,
  RecordController.deleteSingleLink,
  Authorization.resWithData
)

router.delete(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.userOwnsRecordOrAdmin,
  RecordController.deleteSingleRecord,
  Authorization.resWithData
)

module.exports = router;