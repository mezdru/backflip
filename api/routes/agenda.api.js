var express = require('express');
var router = express.Router();
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');
require('../passport/strategy');

const RESOURCE_MODEL = 'agenda';

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
  Authorization.superadminOrClient,
  (req, res, next) => {
    if(!req.body.job) {
      req.backflip = {status: 422, message: 'Missing body parameter : job'};
      return next();
    }
    let Agenda = require('../../models/agenda_scheduler');
    Agenda.scheduleJobWithTiming(req.body.job.name, req.body.job.data);
    req.backflip = {status: 200, message: 'Job created'};
    return next();
  },
  Authorization.resWithData
)

module.exports = router;