var express = require('express');
var router = express.Router();
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
var AuthorizationOrganisation = require('../authorization/organisation.authorization');
var SearchLogController = require('../../controllers/statistic.controller');

const RESOURCE_MODEL = 'searchLogs';

router.use((req, res, next) => {
  req.backflip = req.backflip || {};
  req.backflip.resource = {
    model: RESOURCE_MODEL
  }
  next();
});

router.post(
  '/',
  passport.authenticate('bearer', {session: false}),
  AuthorizationOrganisation,
  SearchLogController.createSingleSearchLog,
  Authorization.resWithData
)

module.exports = router;