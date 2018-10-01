"use strict";
let slack = require('slack-notify')('https://hooks.slack.com/services/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');
const FILENAME = 'errors_monitoring_helper.js';

/**
 * @description Send errors data to many channels in order to monitor them.
 */
class ErrorsMonitoringHelper {

    static printError(err, line, developerName = null, filename = FILENAME){
        console.error(filename + ' - line:'+ line +' - '+ err);
        slack.send({channel : '#errors'+developerName?'-'+developerName:'', text : filename + 'line:'+line+ ' - ' + err});
    }
}

module.exports = ErrorsMonitoringHelper;