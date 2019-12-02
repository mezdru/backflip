let SkillsProposition = require('../models/skillsProposition');

exports.createSingleSkillsProposition = async (req, res, next) => {
  let skillsProposition = req.body.skillsProposition;

  if(!skillsProposition) {
    req.backflip = {status: 422, message: 'Missing body parameter: skillsProposition <Object>'};
    return next();
  }

  skillsProposition.owner = req.user._id;

  SkillsProposition.createOne(skillsProposition)
  .then(skillsPropositionObject => {
    req.backflip = {status: 200, message: 'Skills proposition created with success.', data: skillsPropositionObject};
    return next();
  }).catch(e => {
    console.log(e);
    return next(e);
  });
}

exports.getSingleSkillsProposition = async (req, res, next) => {

  let sp = await SkillsProposition.findById(req.params.id).catch(e => null);

  if (!sp) {
    req.backflip = { message: 'Skills proposition not found', status: 404 };
  } else {
    req.backflip = {
      message: 'Skills proposition found',
      status: 200,
      data: sp,
      organisation: sp.organisation
    };
  }
  return next();
}