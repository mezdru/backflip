let InvitationCodeHelper = require("../helpers/invitationCode_helper");
let ClientAuthHelper = require("../helpers/client_auth_helper");
let User = require("../models/user");

// @todo : This method is a group of several methods. Need split + optimisation
exports.getAmbassadors = async (req, res, next) => {
  let timer1 = new Date();
  let aToken = await ClientAuthHelper.fetchClientAccessToken();
  let invitationCodes = await InvitationCodeHelper.fetchInvitationCodes(
    aToken,
    req.query.organisation
  );
  let iCodeMapped = invitationCodes.map(elt => {
    return { ambassador: elt.creator, count: elt.access.length };
  });
  let output = [];

  iCodeMapped.forEach(iCode => {
    let outputIndex = output.findIndex(
      elt => elt.ambassador === iCode.ambassador
    );

    if (outputIndex > -1) {
      output[outputIndex] = {
        ambassador: iCode.ambassador,
        count: output[outputIndex].count + iCode.count
      };
    } else {
      output.push({ ambassador: iCode.ambassador, count: iCode.count });
    }
  });

  output = output.filter(elt => elt.count > 0);

  output.sort((a, b) => {
    if (a.count < b.count) return 1;
    if (a.count > b.count) return -1;
    return 0;
  });

  const results = output.map(async elt => {
    let ambassPopulated = await User.findOne({ _id: elt.ambassador }).populate(
      "orgsAndRecords.record",
      "_id name links picture intro"
    );

    if(ambassPopulated) {
      let currentOar = ambassPopulated.getOrgAndRecord(req.query.organisation);

      return {
        ambassador: {_id: ambassPopulated._id, email: {value: ambassPopulated.email.value}, orgsAndRecords: [currentOar]},
        count: elt.count
      };
    }
  });

  Promise.all(results)
  .then((completed) => {
    completed = completed.filter(elt => elt && elt.ambassador);
    let executionTime = new Date().getTime() - timer1.getTime();
    req.backflip = { status: 200, message: "Ambassadors fetched.", data: completed, executionTime: executionTime + ' ms' };
    return next();
  });
};
