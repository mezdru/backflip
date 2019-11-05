var User = require('../models/user');
var Record = require('../models/record');
var EmailUser = require('../models/email/email_user');

exports.getUsersInOrg = async (req, res, next) => {

  if(!req.organisation) {
    req.backflip = {status: 422, message: "No organisation provided"};
    return next();
  }

  let users = await User.find({ 'orgsAndRecords.organisation': req.organisation._id })
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
      linkedinUser: user.linkedinUser,
      googleUser: user.googleUser,
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

  if (!currentOrgAndRecord.welcomed && req.body.orgAndRecord.welcomed) {
    User.findOne({ _id: req.query.id || req.user._id })
      .populate('orgsAndRecords.record', '_id name tag')
      .populate('orgsAndRecords.organisation', '_id name tag cover logo canInvite')
      .then((user) => {
        user.welcomeToOrganisation(organisationId, (err, userUpdated) => {
          if (err) {
            req.backflip = { message: 'User is not linked to this organisation.', status: 404 };
            return next();
          }

          let orgAndRecordPopulate = user.getOrgAndRecord(organisationId);
          if (orgAndRecordPopulate.record) {
            Record.findOneAndUpdate({ _id: orgAndRecordPopulate.record._id }, { $set: { hidden: false } });
            EmailUser.sendConfirmationInscriptionEmail(user, orgAndRecordPopulate.organisation, orgAndRecordPopulate.record, res);
            EmailUser.sendEmailToInvitationCodeCreator(orgAndRecordPopulate.organisation, user, orgAndRecordPopulate.record, res);

            if (orgAndRecordPopulate.organisation.canInvite) {
              var Agenda = require('../models/agenda_scheduler');
              Agenda.scheduleSendInvitationCta(user, orgAndRecordPopulate.organisation, orgAndRecordPopulate.record);
            }
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