// Superadmin only
exports.superadminOnly = async (req, res, next) => {
  if(req.user.superadmin) return next();
  return response403(res);
}

// Superadmin OR Client with matching scope
exports.superadminOrClient = async (req, res, next) => {
  if(req.user.superadmin) return next();
  if(req.user.clientId && req.user.scope.find(scopeElt => scopeElt === req.backflipAuth.resource.model)) return next();
  return response403(res);
}

// User who owns the resource only
exports.resUserOwnOnly = async (req, res, next) => {
  var resData = req.backflipAuth;

  if(req.user.superadmin || (resData.owner && resData.owner.equals(req.user._id)))
    return res.status(resData.status).json({message: resData.message, data: resData.data})

  return response403(res);
}

exports.resWithData = async (req, res, next) => {
  var resData = req.backflipAuth;
  return res.status(resData.status || 200).json({message: resData.message, data: resData.data})
}

exports.userOwnsRecordOnly = async (req, res, next) => {
  if(req.user.superadmin) return next();
  if(req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord => orgAndRecord.organisation.equals(req.organisation._id));
    if(orgAndRecord.admin) return next();
    if(orgAndRecord.record.equals(req.params.id)) return next();
  }

  return response403(res);
}

// Admin of the organisation only
exports.adminOnly = async (req, res, next) => {
  if(req.user.superadmin) return next();

  if(req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord => orgAndRecord.organisation.equals(req.organisation._id));
    if(orgAndRecord.admin) return next();
  }

  return response403(res);
}

let response403 = (res) => {
  return res.status(403).json({message: 'You have not access to this resource.'});
}