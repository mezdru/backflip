var Record = require("../../models/record");
var SkillsProposition = require("../../models/skillsProposition");

// Superadmin only
exports.superadminOnly = async (req, res, next) => {
  if (req.user.superadmin) return next();
  return res403(res);
};

// Superadmin OR Client with matching scope
exports.superadminOrClient = async (req, res, next) => {
  if (req.user.superadmin) return next();
  if (
    req.user.clientId &&
    req.user.scope &&
    req.user.scope.find(scopeElt => scopeElt === req.backflip.resource.model)
  )
    return next();
  return res403(res);
};

exports.resUserAccessOrg = async (req, res, next) => {
  var resData = req.backflip;

  if (
    req.user.getOrgAndRecord(resData.organisation._id || resData.organisation)
  ) {
    return res
      .status(resData.status)
      .json({ message: resData.message, data: resData.data });
  }

  return res403(res);
};

// User who owns the resource only
exports.resUserOwnOrAdmin = async (req, res, next) => {
  var resData = req.backflip;

  if (
    req.user.superadmin ||
    (resData.owner && resData.owner.equals(req.user._id))
  )
    return res
      .status(resData.status)
      .json({ message: resData.message, data: resData.data });

  if (resData.organisation) {
    let orgAndRecord = req.user.orgsAndRecords.find(oar =>
      oar.organisation.equals(resData.organisation)
    );
    if (
      orgAndRecord &&
      resData.data &&
      (orgAndRecord.admin || orgAndRecord.record.equals(resData.data))
    )
      return res
        .status(resData.status)
        .json({ message: resData.message, data: resData.data });
  }

  return res403(res);
};

exports.resWithData = async (req, res, next) => {
  var resData = req.backflip;
  return res.status(resData.status || 200).json({
    message: resData.message,
    data: resData.data,
    executionTime: resData.executionTime
  });
};

exports.helpRequestUserRecordCheck = async (req, res, next) => {
  if (req.user.superadmin) return next();

  let recordId = req.body.helpRequest
    ? req.body.helpRequest.sender
    : req.body.skillsProposition
    ? req.body.skillsProposition.sender
    : null;
  let record = await Record.findOne({ _id: recordId }).catch(e => next(e));

  if (!record)
    return res
      .status(422)
      .json({ message: "You should provide a valid sender (record id)" });

  if (req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord =>
      orgAndRecord.organisation.equals(record.organisation)
    );
    if (orgAndRecord.admin || orgAndRecord.record.equals(recordId))
      return next();
  }

  return res403(res);
};

exports.userIsSkillsPropositionRecipient = async (req, res, next) => {
  if (req.user.superadmin) return next();

  let sp = await SkillsProposition.findById(req.params.id);

  if (req.user.getOrgAndRecordByRecord(sp.recipient)) return next();

  return res403(res);
};

exports.userOwnsRecordOrAdmin = async (req, res, next) => {
  if (req.user.superadmin) return next();

  let record = await Record.findOne({ _id: req.params.id }).catch(e => next(e));

  if (!record) return res404(res);

  if (req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord =>
      orgAndRecord.organisation.equals(record.organisation)
    );

    if (
      orgAndRecord.admin ||
      (orgAndRecord.record && orgAndRecord.record.equals(req.params.id)) ||
      (orgAndRecord.secondaryRecords &&
        orgAndRecord.secondaryRecords.some(elt => elt.equals(req.params.id))) ||
      (orgAndRecord.events &&
        orgAndRecord.events.some(elt => elt.equals(req.params.id)))
    )
      return next();
  }

  return res403(res);
};

exports.currentUser = async (req, res, next) => {
  if (req.user.superadmin) return next();
  if (req.user._id.equals(req.params.id)) return next();
  return res403(res);
};

// Admin of the organisation only
exports.adminOnly = async (req, res, next) => {
  if (req.user.superadmin) return next();

  if (req.user.orgsAndRecords) {
    var orgAndRecord = req.user.orgsAndRecords.find(orgAndRecord =>
      orgAndRecord.organisation.equals(req.organisation._id)
    );
    if (orgAndRecord.admin) return next();
  }

  return res403(res);
};

let res403 = res => {
  return res
    .status(403)
    .json({ message: "You have not access to this resource." });
};

let res404 = res => {
  return res.status(404).json({ message: "Resource not found." });
};
