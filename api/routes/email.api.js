var express = require('express');
var router = express.Router();
var EmailController = require('../../controllers/email.controller');
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
require('../passport/strategy');

router.get(
  '/unsubscribe/:token/:hash',
  EmailController.unsubscribeCallback
)

router.get(
  '/confirmation/callback/:token/:hash',
  EmailController.askConfirmationCallback
)

router.post(
  '/security/integration/:integrationName',
  passport.authenticate('bearer', {session: false}),
  EmailController.sendSecurityNotification,
  Authorization.resWithData
)

router.post(
  '/confirmation/:orgTag?',
  passport.authenticate('bearer', {session: false}),
  EmailController.sendAskConfirmation,
  Authorization.resWithData
)

// No authorization token required ?
router.post(
  '/password',
  EmailController.sendPassportRecovery,
  Authorization.resWithData
)

router.post(
  '/invitation/:orgId/confirmation',
  passport.authenticate('bearer', {session: false}),
  EmailController.sendInvitationCodeConfirmation,
  Authorization.resWithData
)

module.exports = router;