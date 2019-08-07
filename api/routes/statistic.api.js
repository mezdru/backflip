var express = require('express');
var router = express.Router();
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var SearchLogController = require('../../controllers/statistic.controller');

router.post(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  SearchLogController.createSingleSearchLog,
  Authorization.resWithData
)

module.exports = router;