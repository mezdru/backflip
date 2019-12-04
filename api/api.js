var express = require('express');
var router = express.Router();

var recordsApi = require('./routes/record.api');
router.use('/records', recordsApi);

// Superadmin actions
var recordsActionsApi = require('./routes/recordActions.api');
router.use('/records', recordsActionsApi);

var organisationsApi = require('./routes/organisation.api');
router.use('/organisations', organisationsApi);

var usersApi = require('./routes/user.api');
router.use('/users', usersApi);

var statisticsApi = require('./routes/statistic.api');
router.use('/statistics', statisticsApi);

var emailsApi = require('./routes/email.api');
router.use('/emails', emailsApi);

var helpRequestsApi = require('./routes/helpRequest.api');
router.use('/helpRequests', helpRequestsApi);

var agendaApi = require('./routes/agenda.api');
router.use('/agenda', agendaApi);

var skillsPropositionApi = require('./routes/skillsProposition.api');
router.use('/skillsPropositions', skillsPropositionApi);

module.exports = router;