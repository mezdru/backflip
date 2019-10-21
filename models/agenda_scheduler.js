var AgendaPack = require('agenda');
var EmailUser = require('../models/email/email_user');
var User = require('../models/user');
var Slack = require('../helpers/slack_helper');
var ClientAuthHelper = require('../helpers/client_auth_helper');
var ConnectionLogHelper = require('../helpers/connectionLog_helper');
var Record = require('../models/record');
var EmailHelper = require('../helpers/email_helper');
var UrlHelper = require('../helpers/url_helper');
var FrontflipUrlHelper = require('../helpers/frontflipUrl.helper');

var Agenda = (function () {
  this.agenda = new AgendaPack({ db: { address: process.env.MONGODB_URI, collection: 'jobs' } });
  this.i18n;

  this.agenda.on('ready', function () {
    console.log('AGENDA: Ready');
    this.agenda.start();
    

    if(process.env.NODE_ENV === 'production') {
      agenda.jobs({ name: 'sendToIncompleteProfile' })
      .then(jobs => {
        console.log('AGENDA: already : ' + jobs.length + ' jobs (sendToIncompleteProfile)');
        if (jobs.length === 0) {
          let job = this.agenda.create('sendToIncompleteProfile');
          job.schedule('in 5 minutes');
          job.save();
        }
      });
    }

    this.agenda.define('sendInvitationCta', (job, done) => {
      let data = job.attrs.data;
      data.user = User.hydrate(data.user);
      console.log('AGENDA: Sending invitation call to action email to ' + data.user.loginEmail);
      Slack.notify('#alerts-scheduler', 'AGENDA: Sending invitation call to action email to ' + data.user.loginEmail);
      EmailUser.sendInvitationCtaEmail(data.user, data.organisation, data.record, this.i18n);
      this.removeJob(job).then(() => { done(); });
    });


    this.agenda.define('sendInvitationEmail', (job, done) => {
      let data = job.attrs.data;
      User.findOne({ '_id': data.user._id })
        .then((userUpdated) => {
          let userOrgAndRecord = userUpdated.getOrgAndRecord(data.organisation._id);
          if (userUpdated &&
            !userUpdated.last_login &&
            (userOrgAndRecord && !userOrgAndRecord.welcomed)) {
            console.log('AGENDA: Resending an invitation');
            Slack.notify('#alerts-scheduler', 'AGENDA: Resend invitation email : ' + (userUpdated.email.value || null) + ' : ' + new Date().toLocaleString('fr-FR'));
            EmailUser.resendInviteEmail(userUpdated, new User(data.sender), data.organisation, data.locale, this.i18n);
            this.removeJob(job).then(() => { done(); });
          } else {
            this.removeJob(job).then(() => { done(); });
          }
        }).catch(e => {
          console.log(e);
        });
    });

    this.agenda.define('reactiveUsersBatch', { concurrency: 1 }, async (job, done) => {
      if (process.env.DISABLE_BATCH) return this.removeJob(job).then(() => done());

      console.log('AGENDA: Will run reactiveUsersBatch');
      Slack.notify('#alerts-scheduler', 'AGENDA: Will run reactiveUsersBatch');

      let inactiveUsers = await getInactiveUsers();

      console.log('AGENDA: Will send an email to ' + inactiveUsers.length + ' users.');
      Slack.notify('#alerts-scheduler', 'AGENDA: Will send an email to ' + inactiveUsers.length + ' users.');

      let resultsSuccess = 0;
      let resultsFailed = 0;
      let userBypassed = 0;

      const results = inactiveUsers.map(async (user) => {
        try {
          if (user.superadmin || user.isUnsubscribe) {
            userBypassed++;
            return;
          }
          let organisation = (user.orgsAndRecords.length > 0 ? user.orgsAndRecords[0].organisation : null);
          let record = (user.orgsAndRecords.length > 0 ? user.orgsAndRecords[0].record : null);
          await EmailUser.sendReactiveUserEmail(user, organisation, record, this.i18n)
            .then(() => { resultsSuccess++; return; })
            .catch(() => { resultsFailed++; return; });
        } catch (e) {
          console.log(e);
          resultsFailed++;
        }
      });

      Promise.all(results).then(() => {
        console.log('AGENDA: reactiveUsersBatch terminated.')
        console.log('AGENDA: ' + resultsSuccess + ' emails sent with success.');
        console.log('AGENDA: ' + resultsFailed + ' failed.');
        console.log('AGENDA: ' + userBypassed + ' bypassed.');
        console.log('AGENDA: ' + (resultsSuccess / (inactiveUsers.length)) * 100 + '% of emails sended.');
        Slack.notify('#alerts-scheduler', 'AGENDA: reactiveUsersBatch terminated.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + resultsSuccess + ' emails sent with success.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + resultsFailed + ' failed.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + userBypassed + ' bypassed.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + (resultsSuccess / (inactiveUsers.length)) * 100 + '% of emails sended.');
      });

      this.removeJob(job).then(() => done());
      let newJob = this.agenda.create('reactiveUsersBatch');
      newJob.schedule('in 2 weeks');
      newJob.save();
    });

    /**
     * @description Send an email to all active users with incomplete first profile.
     */
    this.agenda.define('sendToIncompleteProfile', { concurrency: 1 }, async (job, done) => {
      if (process.env.DISABLE_BATCH) return this.removeJob(job).then(() => done());

      let records = await Record.find({type: 'person', hidden: false}).populate('organisation', '_id name tag logo cover');
      let users = await User.find();
      let resultsSuccess = 0;
      let resultsFailed = 0;
      let userBypassed = 0;
      let completeProfile = 0;

      const results = records.map(async (record) => {
        try{
          // find record user
          let user = users.find(user => user.orgsAndRecords.find(oar => JSON.stringify(oar.record) === JSON.stringify(record._id)));
          if(!user || user.superadmin || user.isUnsubscribe) {userBypassed++; return;}

          let incompleteFields = record.getIncompleteFields();
          if(incompleteFields.length === 0)  {completeProfile++; return;}

          let recipientEmail = record.getLinkByType('email') || user.loginEmail;
          if(recipientEmail == 'cdoherty@i66emp.us') {userBypassed++; return;}
          
          let percentage = Math.max(100 - (incompleteFields.length * 9), 50);

          if(!user.email || !user.email.value) {
            user.email = {
              value: user.loginEmail,
            };
            EmailUser.makeNormalized(user);
          }

          await new Promise((resolve, reject) => {
            EmailUser.generateToken(user, function(err, userUpdated) {
              if(err) {
                resultsFailed++;
                return resolve();
              }
              EmailHelper.emailIncompleteProfile(
                recipientEmail,
                record.organisation,
                record.name,
                incompleteFields,
                percentage,
                (new FrontflipUrlHelper(record.organisation.tag, '/onboard/intro/edit/'+record.tag, userUpdated.locale)).getUrl(),
                (new FrontflipUrlHelper(record.organisation.tag, '', userUpdated.locale)).getUrl(),
                (new UrlHelper(null, 'api/emails/unsubscribe/' + userUpdated.email.token + '/' + userUpdated.email.hash, null, null)).getUrl(),
                userUpdated.locale,
                i18n
              ).then((response) => {
                if(response.response.status == 200) resultsSuccess++;
                else resultsFailed++;
                resolve();
              }).catch((err) => {
                resultsFailed ++;
                resolve();
              })
            });
          });

        }catch(e) {
          console.log(e);
          resultsFailed++;
        }
      });

      Promise.all(results).then(() => {
        console.log('AGENDA: sendToIncompleteProfile terminated.')
        console.log('AGENDA: ' + completeProfile + ' profile completed. ('+ (completeProfile / records.length)*100 +'%)');
        console.log('AGENDA: ' + resultsSuccess + ' emails sent with success.');
        console.log('AGENDA: ' + resultsFailed + ' failed.');
        console.log('AGENDA: ' + userBypassed + ' bypassed.');
        console.log('AGENDA: ' + (resultsSuccess / (records.length)) * 100 + '% of emails sended.');
        Slack.notify('#alerts-scheduler', 'AGENDA: sendToIncompleteProfile terminated.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + resultsSuccess + ' emails sent with success.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + resultsFailed + ' failed.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + userBypassed + ' bypassed.');
        Slack.notify('#alerts-scheduler', 'AGENDA: ' + (resultsSuccess / (records.length)) * 100 + '% of emails sended.');
      });

      this.removeJob(job).then(() => done());
      let newJob = this.agenda.create('sendToIncompleteProfile');
      newJob.schedule('in 1 week');
      newJob.save();
    });

    /**
     * @description Schedule resend invitation after 3 days
     */
    this.scheduleResendInvitation = function (user, sender, organisation, locale) {
      if (process.env.NODE_ENV === 'production') {
        try {
          let job = this.agenda.create('sendInvitationEmail',
            { sender: sender, user: user, organisation: organisation, locale: locale });
          job.schedule('in 3 days');
          job.save();
          let scheduledDate = new Date();
          scheduledDate = scheduledDate.setDate(scheduledDate.getDate() + 3);
          let scheduledDateString = new Date(scheduledDate).toLocaleString('fr-FR');
          Slack.notify('#alerts-scheduler', 'AGENDA: Schedule resend invitation email : ' + ((new User(user)).email.value || null) + ' : ' + scheduledDateString);
        } catch (error) {
          Slack.notifyError(error, 36, 'quentin', 'agenda_scheduler');
        }
      }
    };

    this.scheduleSendInvitationCta = function (user, organisation, record) {
      if (process.env.NODE_ENV === 'production') {
        try {
          let job = this.agenda.create('sendInvitationCta',
            { user: user, organisation: organisation, record: record });

          job.schedule('in 3 days'); // 3 days
          job.save();
          let scheduledDate = new Date();
          scheduledDate = scheduledDate.setDate(scheduledDate.getDate() + 3);
          let scheduledDateString = new Date(scheduledDate).toLocaleString('fr-FR');
          Slack.notify('#alerts-scheduler', 'AGENDA: Schedule send invitation code call to action : ' + ((new User(user)).email.value || null) + ' : ' + scheduledDateString);
        } catch (error) {
          Slack.notifyError(error, 36, 'quentin', 'agenda_scheduler');
        }
      }
    }

    /**
     * @description Remove job from database
     */
    this.removeJob = async function (job) {
      return await job.remove(err => {
        if (!err) {
          console.log('Successfully removed job from collection');
          return;
        }
      });
    };

  }.bind(this));
  return this;
})();

module.exports = Agenda;

async function getInactiveUsers() {
  var nowMinus14Days = new Date();
  nowMinus14Days.setDate(nowMinus14Days.getDate() - 14);

  // get users
  let users = await User.find()
    .populate('orgsAndRecords.record', '_id name tag')
    .populate('orgsAndRecords.organisation', '_id name tag logo cover');

  // get connection logs
  let clientAccessToken = await ClientAuthHelper.fetchClientAccessToken();
  let connectionLogs = await ConnectionLogHelper.getConnectionLogs(clientAccessToken);

  // filter to get only inactive users
  let inactiveUsers = users.filter(user => {
    let latestLog = getLatestConnectionLog(user._id, connectionLogs);
    return (!latestLog || (new Date(latestLog.created)).getTime() < nowMinus14Days.getTime());
  });

  return inactiveUsers;
}

async function getActiveUsers() {
  var nowMinus14Days = new Date();
  nowMinus14Days.setDate(nowMinus14Days.getDate() - 14);

  // get users
  let users = await User.find()
    .populate('orgsAndRecords.record', '_id name tag')
    .populate('orgsAndRecords.organisation', '_id name tag logo cover');

  // get connection logs
  let clientAccessToken = await ClientAuthHelper.fetchClientAccessToken();
  let connectionLogs = await ConnectionLogHelper.getConnectionLogs(clientAccessToken);

  // filter to get only inactive users
  let activeUsers = users.filter(user => {
    let latestLog = getLatestConnectionLog(user._id, connectionLogs);
    return (latestLog && (new Date(latestLog.created)).getTime() > nowMinus14Days.getTime());
  });

  return activeUsers;
}

function getLatestConnectionLog(userId, connectionLogs) {
  if (!userId || !connectionLogs || connectionLogs.length === 0) return null;
  let userLogs = connectionLogs.filter(log => JSON.stringify(userId) === JSON.stringify(log.user));

  var mostRecentDate = new Date(Math.max.apply(null, userLogs.map(e => {
    return new Date(e.created);
  })));

  return userLogs.filter(e => {
    var d = new Date(e.created);
    return d.getTime() == mostRecentDate.getTime();
  })[0];

}