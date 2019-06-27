var express = require('express');
var router = express.Router();

var recordsApi = require('./routes/record.api');
router.use('/records', recordsApi);

module.exports = router;