var AgendaPack = require('agenda');
var EmailUser = require('../models/email/email_user');
var User = require('../models/user');
var Organisation = require('../models/organisation');
var Slack = require('../helpers/slack_helper');
var Record = require('../models/record');
var AgendaController = require('../controllers/agenda.controller');

var Agenda = (function () {
  this.agenda = new AgendaPack({ db: { address: process.env.MONGODB_URI, collection: 'jobs' } });
  this.i18n;
  this.SCHEDULE_TIMING = ['1 day', '3 days', '1 week', '1 month']

  this.agenda.on('ready', function () {
    console.log('AGENDA: Ready');
    this.agenda.start();


    /**
     * @description Onboard workflow: STEP 1 : Confirm your email
     * @param userId User id
     * @param orgTag Organisation tag
     * @param timingIndex SCHEDULE_TIMING current timing index
     */
    this.agenda.define('sendEmailConfirmation', async (job, done) => {
      let user = await User.findOne({ _id: job.attrs.data.userId });

      if (!user.email.validated) {
        await AgendaController.sendEmailConfirmation(user, job.attrs.data.orgTag, this.i18n);
        this.scheduleJobWithTiming('sendEmailConfirmation', {userId: user._id, orgTag: job.attrs.data.orgTag}, job.attrs.data.timingIndex+1);
      }

      this.removeJob(job).then(() => done());
    });


    /**
     * @description Onboard workflow: STEP 2 : Complete your profile
     * @param userId User id
     * @param orgId Organisation id
     * @param timingIndex SCHEDULE_TIMING current timing index
     */
    this.agenda.define('sendEmailCompleteYourProfile', async (job, done) => {
      let user = await User.findOne({ _id: job.attrs.data.userId });
      let organisation = await Organisation.findOne({_id: job.attrs.data.orgId});
      let oar = user.getOrgAndRecord(job.attrs.data.orgId);

      if(!oar.welcomed && user.email.validated) {
        await AgendaController.sendEmailCompleteYourProfile(user, organisation, this.i18n);
        this.scheduleJobWithTiming('sendEmailCompleteYourProfile', {userId: user._id, orgId: job.attrs.data.orgId}, job.attrs.data.timingIndex+1);
      } else if(!user.email.validated) {
        this.scheduleJobWithTiming('sendEmailCompleteYourProfile', {userId: user._id, orgId: job.attrs.data.orgId}, job.attrs.data.timingIndex);
      }

      this.removeJob(job).then(() => done());
    });


    /**
     * @description Onboard workflow: STEP 3 : Perfect your profile
     * @param userId User id
     * @param orgId Organisation id
     * @param timingIndex SCHEDULE_TIMING current timing index
     */
    this.agenda.define('sendEmailPerfectYourProfile', async (job, done) => {
      let user = await User.findOne({ _id: job.attrs.data.userId });
      let organisation = await Organisation.findOne({_id : job.attrs.data.orgId});
      let recordId = user.getRecordIdByOrgId(job.attrs.data.orgId);
      let record = await Record.findOne({_id: recordId});

      if(!record.completedAt) {
        await AgendaController.sendEmailPerfectYourProfile(user, organisation, record, this.i18n);
        this.scheduleJobWithTiming('sendEmailPerfectYourProfile', {userId: user._id, orgId: organisation._id}, job.attrs.data.timingIndex+1);
      }

      this.removeJob(job).then(() => done());
    });


    /**
     * @description Onboard workflow: STEP 4 : Invite coworkers
     * @param userId User id
     * @param orgId Organisation id
     * @param recordId Record id
     */
    this.agenda.define('sendEmailInviteYourCoworkers', async (job, done) => {
      let user = await User.findOne({ _id: job.attrs.data.userId });
      let organisation = await Organisation.findOne({_id : job.attrs.data.orgId});
      let record = await Record.findOne({_id: job.attrs.data.recordId});

      await AgendaController.sendEmailInviteYourCoworkers(user, organisation, record, this.i18n);
      this.removeJob(job).then(() => done());
    });


    this.scheduleJobWithTiming = function (jobName, data, timingIndex) {
      let job = this.agenda.create(jobName, {timingIndex: timingIndex || 0,  ...data});
      job.schedule('in '+this.getScheduleTiming(timingIndex || 0));
      console.log("__________ " + jobName + 'in ' + this.getScheduleTiming(timingIndex || 0));
      job.save();
    };


    this.scheduleJob = function(jobName, data, scheduledTime) {
      let job = this.agenda.create(jobName, data);
      job.schedule('in '+scheduledTime);
      job.save();
    }

// OLD PART BELOW

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

    this.getScheduleTiming = function (timingIndex) {
      let index = Math.min(timingIndex, this.SCHEDULE_TIMING.length - 1);
      return this.SCHEDULE_TIMING[index];
    }

  }.bind(this));
  return this;
})();

module.exports = Agenda;