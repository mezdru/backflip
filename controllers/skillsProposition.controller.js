let SkillsProposition = require("../models/skillsProposition");
let EmailHelper = require("../helpers/email_helper");
let User = require("../models/user");
let UrlHelper = require("../helpers/url_helper");

exports.createSingleSkillsProposition = async (req, res, next) => {
  let skillsProposition = req.body.skillsProposition;

  if (!skillsProposition) {
    req.backflip = {
      status: 422,
      message: "Missing body parameter: skillsProposition <Object>"
    };
    return next();
  }

  skillsProposition.owner = req.user._id;

  SkillsProposition.createOne(skillsProposition)
    .then(skillsPropositionObject => {
      req.backflip = {
        status: 200,
        message: "Skills proposition created with success.",
        data: skillsPropositionObject
      };
      return next();
    })
    .catch(e => {
      console.log(e);
      return next(e);
    });
};

exports.getSingleSkillsProposition = async (req, res, next) => {
  let sp = await SkillsProposition.findById(req.params.id).catch(e => null);

  if (!sp) {
    req.backflip = { message: "Skills proposition not found", status: 404 };
  } else {
    req.backflip = {
      message: "Skills proposition found",
      status: 200,
      data: sp,
      organisation: sp.organisation
    };
  }
  return next();
};

exports.updateSingleSkillsProposition = async (req, res, next) => {
  let incomingSpData = req.body.skillsProposition;
  let sp = await SkillsProposition.findById(req.params.id).catch(e => null);
  let spSenderUser = await User.findOne({
    "orgsAndRecords.record": sp.sender._id
  }).catch(e => null);

  if (!sp) {
    req.backflip = { message: "Skills proposition not found", status: 404 };
    return next();
  }

  if (!incomingSpData) {
    req.backflip = {
      message: "Missing body parameter : skillsProposition <Object>",
      status: 422
    };
    return next();
  }

  let spUpdated = await SkillsProposition.findOneAndUpdate(
    { _id: sp._id },
    { $set: { status: incomingSpData.status } },
    { new: true }
  ).catch(e => next(e));

  if (sp.status === "in progress" && spUpdated.status === "accepted") {
    EmailHelper.emailSkillsPropositionAccepted(
      sp.sender.getFirstEmail(),
      sp.sender,
      sp.organisation,
      new UrlHelper(
        sp.organisation.tag,
        sp.recipient.tag,
        null,
        spSenderUser.locale
      ).getUrl(),
      sp.recipient,
      spSenderUser.locale,
      res
    );
  }

  req.backflip = {
    message: "Skills proposition updated with success.",
    data: spUpdated,
    status: 200
  };

  return next();
};
