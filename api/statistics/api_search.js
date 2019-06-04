var express = require('express');
var router = express.Router();
var authorization = require('../mid_authorization_organisation');
var EmailUser = require('../../models/email/email_user');
var User = require('../../models/user');
var passport = require('passport');
var SearchLog = require('../../models/search_log');
require('../passport/strategy');


router.post('/:orgId', passport.authenticate('bearer', { session: false }), (req, res, next) => {
  User.findOne({'orgsAndRecords.organisation': req.params.orgId})
  .then(user => {
    if(!user) return res.status(403).json({message: "User hasn't access to the organisation."});
    if(!req.body.tags) return res.status(422).json({message: "Missing body parameter: tags [Array]"});

    (new SearchLog({
      organisation: req.params.orgId,
      user: user._id,
      tag: req.body.tags,
      query: req.body.query
    })).save()
    .then(searchLogSaved => {
      return res.status(200).json({message: 'Search log saved with success.', searchLog: searchLogSaved});
    }).catch(e => {
      console.log(e);
      return next(e);
    });
  });

});

router.use(function (err, req, res, next) {
	if (err) return res.status(500).json({ message: 'Internal error', errors: [err.message] });
	return res.status(500).json({ message: 'Unexpected error' });
});

module.exports = router;