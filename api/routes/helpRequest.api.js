var express = require('express');
var router = express.Router();
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var HelpRequestController = require('../../controllers/helpRequest.controller');

router.post(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.helpRequestUserRecordCheck,
  HelpRequestController.createSingleHelpRequest,
  Authorization.resWithData
)

module.exports = router;