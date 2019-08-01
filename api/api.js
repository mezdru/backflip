var express = require('express');
var router = express.Router();

var recordsApi = require('./routes/record.api');
router.use('/records', recordsApi);

var organisationsApi = require('./routes/organisation.api');
router.use('/organisations', organisationsApi);

var usersApi = require('./routes/user.api');
router.use('/users', usersApi);

module.exports = router;