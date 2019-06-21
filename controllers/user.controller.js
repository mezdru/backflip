var User = require('../models/user');

exports.getUsers = async (req, res, next) => {
  User.find(req.query)
  .then(linkedinUsers => {

    if(linkedinUsers.length === 0) {
      req.backflipAuth = {message: 'Linkedin Users not found', status: 404};
    } else {
      req.backflipAuth = {message: 'Linkedin Users found', status: 200, data: linkedinUsers};
    }

    return next();

  }).catch(err => {return next(err)});
}

exports.getSingleUser = async (req, res, next) => {
  User.findOne({_id: req.params.id, ... req.query})
  .then(linkedinUser => {

      if(!linkedinUser) {
        req.backflipAuth = {message: 'Linkedin User not found', status: 404};
      } else {
        req.backflipAuth = {message: 'Linkedin User found', status: 200, data: linkedinUser, owner: linkedinUser.user};
      }

      return next();

  }).catch(err => {return next(err)});
}

exports.getMe = async (req, res, next) => {
  req.backflip = {message: 'User fetch with success', status: 200, data: req.user, owner: req.user._id};
  return next();
}

exports.updateMeOrgsAndRecords = async (req, res, next) => {

  if(req.body.orgAndRecord.welcomed) {
    User.findOne({_id: req.user._id})
    .populate('orgsAndRecords.record', '_id name tag')
    .populate('orgsAndRecords.organisation', '_id name tag cover logo canInvite')
    .then((user) => {
      user.welcomeToOrganisation(req.query.organisation, (err, userUpdated) => {
        if(err) {
          req.backflip = {message: 'User is not linked to this organisation.', status: 404};
          return next();
        }

        let orgAndRecord = user.getOrgAndRecord(req.params.orgId);
        if(orgAndRecord.record) {
          Record.findOneAndUpdate({_id: orgAndRecord.record._id}, {$set: {hidden: false}} );
          EmailUser.sendConfirmationInscriptionEmail(user, orgAndRecord.organisation, orgAndRecord.record, res);
          EmailUser.sendEmailToInvitationCodeCreator(orgAndRecord.organisation, user, orgAndRecord.record, res);

          if(orgAndRecord.organisation.canInvite) {
            var Agenda = require('../models/agenda_scheduler');
            Agenda.scheduleSendInvitationCta(user, orgAndRecord.organisation, orgAndRecord.record);
          }
        }

        req.backflip = {message: 'User updated with success', status: 200, data: userUpdated};
        return next();

      });
    });
  } else {
    req.backflip = {message: 'This API route isn\'t implemented yet.', status: 500};
    return next();
  }
}