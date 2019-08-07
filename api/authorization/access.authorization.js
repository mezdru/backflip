var Record = require('../../models/record');

// Superadmin only
exports.superadminOnly = async (req, res, next) => {
  if(req.user.superadmin) return next();
  return res403(res);
}

// Superadmin OR Client with matching scope
exports.superadminOrClient = async (req, res, next) => {
  if(req.user.superadmin) return next();
  if(req.user.clientId && req.user.scope.find(scopeElt => scopeElt === req.backflip.resource.model)) return next();
  return res403(res);
}

// User who owns the resource only
exports.resUserOwnOrAdmin = async (req, res, next) => {
  var resData = req.backflip;

  if(req.user.superadmin || (resData.owner && resData.owner.equals(req.user._id)))
    return res.status(resData.status).json({message: resData.message, data: resData.data});

  if(resData.organisation) {
    let orgAndRecord = req.user.orgsAndRecords.find(oar => oar.organisation.equals(resData.organisation));
    if(orgAndRecord && (orgAndRecord.admin || orgAndRecord.record === data._id) )
      return res.status(resData.status).json({message: resData.message, data: resData.data});
  }

  return res403(res);
}

exports.resWithData = async (req, res, next) => {
  var resData = req.backflip;
  return res.status(resData.status || 200).json({message: resData.message, data: resData.data})
}

exports.userOwnsRecordOrAdmin = async (req, res, next) => {
  if(req.user.superadmin) return next();

  let record = await Record.findOne({_id: req.params.id}).catch(e => next(e));

  if(!record) return res404(res);

  if(req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord => orgAndRecord.organisation.equals(record.organisation));
    if(orgAndRecord.admin || orgAndRecord.record.equals(req.params.id)) return next();
  }

  return res403(res);
}

exports.currentUser = async (req, res, next) => {
  if(req.user.superadmin) return next();
  if(req.user._id.equals(req.params.id)) return next();
  return res403(res);
}

// Admin of the organisation only
exports.adminOnly = async (req, res, next) => {
  if(req.user.superadmin) return next();

  if(req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord => orgAndRecord.organisation.equals(req.organisation._id));
    if(orgAndRecord.admin) return next();
  }

  return res403(res);
}

let res403 = (res) => {
  return res.status(403).json({message: 'You have not access to this resource.'});
}

let res404 = (res) => {
  return res.status(404).json({message: 'Resource not found.'});
}