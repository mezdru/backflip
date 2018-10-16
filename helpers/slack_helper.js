"use strict";
let slack = require('slack-notify')('https://hooks.slack.com/services/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');
const FILENAME = 'slack_helper.js';

/**
 * @description Send errors data to many channels in order to monitor them.
 */
class SlackHelper {

    static notifyError(err, line, developerName = null, filename = FILENAME){
        slack.send({channel : '#errors'+developerName?'-'+developerName:'', text : filename + 'line:'+line+ ' - ' + err});
    }
    static notify(channel, message){
        slack.send({
            channel: channel,
            text: message
        });
    }
}

module.exports = SlackHelper;