var User = require('../models/user');

exports.getSingleUser = async (req, res, next) => {
  User.findOne({_id: req.params.id || req.user._id})
  .then(linkedinUser => {

      if(!linkedinUser) {
        req.backflip = {message: 'User not found', status: 404};
      } else {
        req.backflip = {message: 'User found', status: 200, data: linkedinUser, owner: linkedinUser.user};
      }

      return next();

  }).catch(err => {return next(err)});
}

exports.getMe = async (req, res, next) => {
  req.backflip = {message: 'User fetch with success', status: 200, data: req.user, owner: req.user._id};
  return next();
}

exports.updateSingleUser = async (req, res, next) => {
  if(!req.body.user) {
    req.backflip = {message: 'Missing body parameter: user', status: 422};
    return next();
  }

  if(!req.body.user.locale) {
    req.backflip = {message: 'Missing parameter property: locale. You can only update this property for now.', status: 422};
    return next();
  }

  User.findOneAndUpdate({_id: req.params.id}, {$set: {locale: req.body.user.locale}}, {new: true})
  .then(userUpdated => {
    if(!userUpdated) {
      req.backflip = {message: 'User not found', status: 404};
    } else {
      req.backflip = {message: 'User (locale property) updated with success', status: 200, data: userUpdated};
    }
    return next();
  }).catch(err => next(err));
}

exports.updateOrgAndRecord = async (req, res, next) => {
  if(!req.body.orgAndRecord || ( !req.query.organisation && !req.body.orgAndRecord.organisation)) {
    req.backflip = {message: 'Missing parameter: orgAndRecord', status: 422};
    return next();
  }

  let organisationId = req.body.orgAndRecord.organisation || req.query.organisation;
  let currentOrgAndRecord = req.user.getOrgAndRecord(organisationId);

  if(!currentOrgAndRecord) {
    req.backflip = {message: 'User is not linked to this organisation.', status: 404};
    return next();
  }

  if(!currentOrgAndRecord.welcomed && req.body.orgAndRecord.welcomed) {
    User.findOne({_id: req.user._id})
    .populate('orgsAndRecords.record', '_id name tag')
    .populate('orgsAndRecords.organisation', '_id name tag cover logo canInvite')
    .then((user) => {
      user.welcomeToOrganisation(organisationId, (err, userUpdated) => {
        if(err) {
          req.backflip = {message: 'User is not linked to this organisation.', status: 404};
          return next();
        }

        let orgAndRecordPopulate = user.getOrgAndRecord(organisationId);
        if(orgAndRecordPopulate.record) {
          Record.findOneAndUpdate({_id: orgAndRecordPopulate.record._id}, {$set: {hidden: false}} );
          EmailUser.sendConfirmationInscriptionEmail(user, orgAndRecordPopulate.organisation, orgAndRecordPopulate.record, res);
          EmailUser.sendEmailToInvitationCodeCreator(orgAndRecordPopulate.organisation, user, orgAndRecordPopulate.record, res);

          if(orgAndRecordPopulate.organisation.canInvite) {
            var Agenda = require('../models/agenda_scheduler');
            Agenda.scheduleSendInvitationCta(user, orgAndRecord.organisation, orgAndRecord.record);
          }
        }

        req.backflip = {message: 'User updated with success', status: 200, data: userUpdated};
        return next();

      });
    }).catch(err => next(err));
  }

  req.backflip = {message: 'You can not update this field.', status: 422};
  return next();
}