var express = require('express');
var router = express.Router();
var UserController = require('../../controllers/user.controller');
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');

router.get(
  '/me',
  passport.authenticate('bearer', {session: false}),
  UserController.getMe,
  Authorization.resWithData
)

router.get(
  '/:id', 
  passport.authenticate('bearer', {session: false}),
  Authorization.superadminOnly, 
  UserController.getSingleUser,
  Authorization.resWithData
)

router.get(
  '', 
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.adminOnly,
  UserController.getUsersInOrg,
  Authorization.resWithData
)

router.put(
  '/me/orgsAndRecords',
  passport.authenticate('bearer', {session: false}),
  UserController.updateOrgAndRecord,
  Authorization.resWithData
)

router.put(
  '/:id/ban/:organisationId',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.adminOnly,
  UserController.banUser,
  Authorization.resWithData
)

router.put(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  Authorization.currentUser,
  UserController.updateSingleUser,
  Authorization.resWithData
)

module.exports = router;