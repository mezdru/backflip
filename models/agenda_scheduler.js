var AgendaPack = require('agenda');
var EmailUser = require('../models/email/email_user');
var User = require('../models/user');
var Slack = require('../helpers/slack_helper');

var Agenda = (function () {
  this.agenda = new AgendaPack({ db: { address: process.env.MONGODB_URI, collection: 'jobs' } });
  this.i18n;

  this.agenda.on('ready', function () {
    console.log('AGENDA: Ready');
    this.agenda.start();

    // Init inactive users batch
    if(process.env.NODE_ENV === 'production') {
      agenda.jobs({name: 'reactiveUsersBatch'})
      .then(jobs => {
        console.log('already : ' + jobs.length + ' jobs');
        if(jobs.length === 0 ) {
          let job = this.agenda.create('reactiveUsersBatch');
          job.schedule('in 30 seconds');
          job.save();
        }
      });
    }


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

    this.agenda.define('reactiveUsersBatch', {concurrency: 1},(job, done) => {
      var nowMinus7Days = new Date();
      nowMinus7Days.setDate(nowMinus7Days.getDate() - 7);
      console.log('AGENDA: Will run reactiveUsersBatch');
      console.log('AGENDA: For all users for those last_action is lower than ' + nowMinus7Days.toLocaleString('fr-FR'));

      User.find( {$or: [{last_action: {$lt: nowMinus7Days}}, {last_action: null}]})
      .populate('orgsAndRecords.record', '_id name tag')
      .populate('orgsAndRecords.organisation', '_id name tag logo cover')
      .then(inactiveUsers => {
        console.log(JSON.stringify(inactiveUsers[0]))
        console.log('AGENDA: Will send an email to ' + inactiveUsers.length + ' users.');

        inactiveUsers = inactiveUsers.slice(0, 1);

        let resultsSuccess = 0;
        let resultsFailed = 0;
        const results = inactiveUsers.map( async (user) => {
          try{
            let organisation = (user.orgsAndRecords.length > 0 ? user.orgsAndRecords[0].organisation : null);
            let record = (user.orgsAndRecords.length > 0 ? user.orgsAndRecords[0].record : null);
            await EmailUser.sendReactiveUserEmail(user, organisation, record, this.i18n)
            .then(() => {resultsSuccess++; return;})
            .catch(() => {resultsFailed++; return;});
          }catch(e) {
            resultsFailed++;
          }
        });

        Promise.all(results).then(() => {
          console.log('AGENDA: reactiveUsersBatch terminated.')
          console.log('AGENDA: '+resultsSuccess+' emails sent with success.');
          console.log('AGENDA: '+resultsFailed+' failed.');
          console.log('AGENDA: '+(resultsSuccess/(inactiveUsers.length))*100 +'% of success.');
        })

        this.removeJob(job).then(()=> done());
        let newJob = this.agenda.create('reactiveUsersBatch');
        newJob.schedule('in 7 days');
        newJob.save();
      });
    });

    /**
     * @description Schedule reactive inactive users (no action since 7 days) after 7 days.
     */
    this.scheduleReactiveUsersBatch = function() {
      agenda.jobs({name: 'reactiveUsersBatch'})
      .then(jobs => {
        if(jobs.length === 0 ) {
          let job = this.agenda.every('10 seconds', 'reactiveUsersBatch');
          job.save();
        }
      });
    };

    /**
     * @description Schedule resend invitation after 3 days
     */
    this.scheduleResendInvitation = function(user, sender, organisation, locale) {
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