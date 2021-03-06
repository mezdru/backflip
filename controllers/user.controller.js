var User = require('../models/user');
var Record = require('../models/record');
var EmailUser = require('../models/email/email_user');
var mongoose = require('mongoose');

exports.getUsersInOrg = async (req, res, next) => {

  if (!req.organisation) {
    req.backflip = { status: 422, message: "No organisation provided" };
    return next();
  }

  let users = await User.find({ 'orgsAndRecords.organisation': req.organisation._id })
    .select('hashedPassword _id email googleUser linkedinUser orgsAndRecords locale created last_login last_access')
    .populate('orgsAndRecords.record', '_id tag name picture created updated completedAt')
    .catch(e => []);

  let data = users.map(user => {
    return {
      orgsAndRecords: [user.getOrgAndRecord(req.organisation._id)],
      email: {
        value: user.email.value,
        validated: user.email.validated
      },
      locale: user.locale,
      created: user.created,
      last_login: user.last_login,
      last_access: user.last_access,
      linkedinUser: user.linkedinUser,
      googleUser: user.googleUser,
      emailUser: user.hashedPassword ? true : false,
      _id: user._id
    };
  });

  req.backflip = { message: 'Users found.', status: 200, data: data };
  return next();
}

exports.getSingleUser = async (req, res, next) => {
  User.findOne({ _id: req.params.id || req.user._id })
    .then(linkedinUser => {

      if (!linkedinUser) {
        req.backflip = { message: 'User not found', status: 404 };
      } else {
        req.backflip = { message: 'User found', status: 200, data: linkedinUser, owner: linkedinUser.user };
      }

      return next();

    }).catch(err => { return next(err) });
}

exports.getMe = async (req, res, next) => {

  let me = await User.findOne({ _id: req.user._id })
    .populate('orgsAndRecords.organisation')
    .populate('orgsAndRecords.record')
    .populate('orgsAndRecords.secondaryRecords')
    .populate('orgsAndRecords.events')

  req.backflip = { message: 'User fetch with success', status: 200, data: me, owner: req.user._id };
  return next();
}

exports.updateSingleUser = async (req, res, next) => {
  if (!req.body.user) {
    req.backflip = { message: 'Missing body parameter: user', status: 422 };
    return next();
  }

  if (!req.body.user.locale) {
    req.backflip = { message: 'Missing parameter property: locale. You can only update this property for now.', status: 422 };
    return next();
  }

  User.findOneAndUpdate({ _id: req.params.id }, { $set: { locale: req.body.user.locale } }, { new: true })
    .then(userUpdated => {
      if (!userUpdated) {
        req.backflip = { message: 'User not found', status: 404 };
      } else {
        req.backflip = { message: 'User (locale property) updated with success', status: 200, data: userUpdated };
      }
      return next();
    }).catch(err => next(err));
}

exports.banUser = async (req, res, next) => {
  if (!req.params.id || !req.params.organisationId) {
    req.backflip = { status: 422, message: 'Missing mendatory parameters.' };
    return next();
  }

  let user = await User.findOne({ _id: req.params.id, 'orgsAndRecords.organisation': req.params.organisationId }).catch(e => null);

  if (!user) {
    req.backflip = { status: 422, message: "Can find user for these parameters" };
    return next();
  }

  let orgId = mongoose.Types.ObjectId(req.params.organisationId); // detachOrg needs ObjectID param
  user.detachOrg(orgId, function (err, user) {
    if (err) return next(err);

    req.backflip = { status: 200, message: "User banned from the organisation." };
    return next();
  });
}

exports.updateOrgAndRecord = async (req, res, next) => {
  if (!req.body.orgAndRecord || (!req.query.organisation && !req.body.orgAndRecord.organisation)) {
    req.backflip = { message: 'Missing parameter: orgAndRecord', status: 422 };
    return next();
  }

  let organisationId = req.body.orgAndRecord.organisation || req.query.organisation;
  let currentOrgAndRecord = req.user.getOrgAndRecord(organisationId);

  if (!currentOrgAndRecord) {
    req.backflip = { message: 'User is not linked to this organisation.', status: 404 };
    return next();
  }

  // welcome user in organisation
  if (!currentOrgAndRecord.welcomed && req.body.orgAndRecord.welcomed) {
    User.findOne({ _id: req.query.id || req.user._id })
      .populate('orgsAndRecords.record')
      .populate('orgsAndRecords.organisation')
      .populate('orgsAndRecords.secondaryRecords')
      .populate('orgsAndRecords.events')
      .then((user) => {
        user.welcomeToOrganisation(organisationId, (err, userUpdated) => {
          if (err) {
            req.backflip = { message: 'User is not linked to this organisation.', status: 404 };
            return next();
          }

          let orgAndRecordPopulate = user.getOrgAndRecord(organisationId);
          if (orgAndRecordPopulate.record) {
            Record.findOneAndUpdate({ _id: orgAndRecordPopulate.record._id }, { $set: { hidden: false, welcomed: true, welcomedAt: Date.now()} });
            EmailUser.sendConfirmationInscriptionEmail(user, orgAndRecordPopulate.organisation, orgAndRecordPopulate.record, res);
            EmailUser.sendEmailToInvitationCodeCreator(orgAndRecordPopulate.organisation, user, orgAndRecordPopulate.record, res);

            // onboard workflow : go to perfect profile
            var Agenda = require('../models/agenda_scheduler');
            Agenda.scheduleJobWithTiming('sendEmailPerfectYourProfile', { userId: user._id, orgId: organisationId });
          }

          User.findOne({ _id: userUpdated._id })
            .then(userUpdateNotPopulated => {
              req.backflip = { message: 'User updated with success', status: 200, data: userUpdateNotPopulated };
              return next();
            });

        });
      }).catch(err => next(err));
  } else if (currentOrgAndRecord.welcomed && req.body.orgAndRecord.welcomed) {
    req.backflip = { message: 'Nothing to update.', status: 200, data: req.user };
    return next();
  } else {
    req.backflip = { message: 'You can not update this field.', status: 422 };
    return next();
  }
}