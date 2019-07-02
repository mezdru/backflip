var express = require('express');
var router = express.Router();
var UserController = require('../controllers/user.controller');
var Authorization = require('../authorization/access.authorization');
let passport = require('passport');

const RESOURCE_MODEL = 'user';

router.use((req, res, next) => {
  req.backflip.resource = {
    model: RESOURCE_MODEL
  }
  next();
});

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
  Authorization.superadminOnly, 
  UserController.getSingleUser,
  Authorization.resWithData
)

router.get(
  '/me',
  passport.authenticate('bearer', {session: false}),
  UserController.getMe,
  Authorization.resWithData
)

router.put(
  '/me/orgsAndRecords',
  passport.authenticate('bearer', {session: false}),
  UserController.updateMeOrgsAndRecords,
  Authorization.resWithData
)

router.put(
  '/:id',
  passport.authenticate('bearer', {session: false}),
  Authorization.userOwnsOnly,
  UserController.updateSingleUser,
  Authorization.resWithData
)

module.exports = router;