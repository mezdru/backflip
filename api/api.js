var express = require('express');
var router = express.Router();

var api_organisation = require('./organisation/api_organisation');
router.use('/organisations', api_organisation);

var api_record = require('./record/api_record');
router.use('/profiles', api_record);

var api_user = require('./user/api_user');
router.use('/users', api_user);

var api_email = require('./email/api_email');
router.use('/emails', api_email);

var api_search = require('./statistics/api_search');
router.use('/statistics/search', api_search);

module.exports = router;