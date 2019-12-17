var express = require('express');
var router = express.Router();
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var InvitationCodeController = require('../../controllers/invitationCode.controller');

router.get(
  '/ambassadors',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.adminOnly,
  InvitationCodeController.getAmbassadors,
  Authorization.resWithData
)

module.exports = router;