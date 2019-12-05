var express = require('express');
var router = express.Router();
let passport = require('passport');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var Authorization = require('../authorization/access.authorization');
var SkillsPropositionController = require('../../controllers/skillsProposition.controller');

router.post(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  Authorization.helpRequestUserRecordCheck,
  SkillsPropositionController.createSingleSkillsProposition,
  Authorization.resWithData
)

router.get(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  SkillsPropositionController.getSingleSkillsProposition,
  Authorization.resUserAccessOrg
)

router.put(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  Authorization.userIsSkillsPropositionRecipient,
  SkillsPropositionController.updateSingleSkillsProposition,
  Authorization.resWithData
)

module.exports = router;