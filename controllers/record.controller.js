var Record = require('../models/record');
var User = require('../models/user');
var slug = require('slug');
var uppercamelcase = require('uppercamelcase');
var LinkedinUserHelper = require('../helpers/linkedinUser_helper');
var GoogleUserHelper = require('../helpers/googleUser_helper');
var GoogleRecord = require('../models/google/google_record');
var LinkHelper = require('../helpers/link_helper');

exports.getRecords = async (req, res, next) => {
  Record.find({ ...req.query })
    .populate('hashtags', '_id tag type name name_translated picture hashtags')
    .populate('within', '_id tag type name name_translated picture')
    .then(records => {
      if (records.length === 0) {
        req.backflip = { message: 'Records not found', status: 404 };
      } else {
        req.backflip = { message: 'Records found', status: 200, data: records };
      }
      return next();
    }).catch(err => { return next(err) });
}

exports.getSingleRecord = async (req, res, next) => {

  let record = await  Record.findOneById(req.params.id).catch(err => {
                        if (err.name = 'CastError') {
                          req.backflip = { message: 'Record id is not valid.', status: 422 };
                          return next();
                        }
                        return next(err)
                      });

  if (!record) {
    req.backflip = { message: 'Record not found', status: 404 };
  } else {
    req.backflip = {
      message: 'Record found',
      status: 200,
      data: record,
      organisation: record.organisation,
      owner: (req.user.orgsAndRecords.find(oar => oar.record.equals(record._id)) ? req.user._id : null)
    };
  }
  return next();
}

exports.createSingleRecord = async (req, res, next) => {
  let record = req.body.record;

  // Populate tag thanks to the name if no tag
  if (!record.tag && record.name) {
    if (record.type === 'person') {
      record.tag = '@' + slug(uppercamelcase(record.name));
    } else {
      record.tag = '#' + slug(uppercamelcase(record.name));
    }
  }

  let recordSaved = await Record.makeFromTagAsync(record.tag, req.organisation._id, record.hidden)
                          .catch(err => {
                            if (err.code === 11000 && record.type === 'hashtag') {
                              req.backflip = { message: 'Record already exists in this organisation.', status: 409 };
                              return next();
                            }
                            return next(err);
                          });

  record.tag = recordSaved.tag; // tag can be modify
  record.name = record.name || recordSaved.name;
  let recordUpdated = await Record.findOneAndUpdate({ '_id': recordSaved._id }, { $set: record }, { new: true });
  let recordPopulated = await Record.findOneById(recordUpdated._id);
  req.backflip = { message: 'Record created with success', data: recordPopulated, status: 200 };
  return next();
}

exports.updateSingleRecord = async (req, res, next) => {
  if (!req.body.record) {
    req.backflip = { message: 'Missing body parameter: record', status: 422 };
    return next();
  }

  let recordUpdated = await Record.findOneAndUpdate({ _id: req.params.id }, { $set: req.body.record }, { new: true }).catch(e => next(e));

  if (!recordUpdated) {
    req.backflip = { message: 'Record not found', status: 404 };
    return next();
  }

  if(req.body.record.links) {
    recordUpdated.makeLinks(mixLinks([], req.body.record.links));
    await recordUpdated.save();
  }

  recordUpdated = await Record.findOneById(recordUpdated._id);

  if (req.body.record.picture && req.body.record.picture.url) {
    recordUpdated.picture = (await recordUpdated.addPictureByUrlAsync(req.body.record.picture.url)).picture;
    await recordUpdated.save();
    req.backflip = { message: 'Record updated with success', status: 200, data: recordUpdated };
    return next();
  } else {
    req.backflip = { message: 'Record updated with success', status: 200, data: recordUpdated };
    return next();
  }
}

exports.deleteSingleRecord = async (req, res, next) => {
  let record = await Record.findOneById(req.params.id).catch(err => next(err));

  if (!record) {
    req.backflip = { message: 'Record not found', status: 404 };
  } else {
    await Record.deleteOne({ _id: record._id })
      .then(() => {
        req.backflip = { message: 'Record deleted with success', status: 200, data: record };
      }).catch(err => next(err));
  }

  return next();
}

exports.createSingleLink = async (req, res, next) => {
  if (!req.body.link) {
    req.backflip = { message: 'Missing body parameter: link', status: 422 };
    return next();
  }

  let record = await Record.findOneById(req.params.id).catch(err => next(err));

  if (!record) {
    req.backflip = { message: 'Record not found', status: 404 };
  } else {
    record.addLink(req.body.link);
    await record.save()
      .then(() => { req.backflip = { message: 'Record links created with success.', status: 200, data: record } })
      .catch(err => next(err));
  }

  return next();
}

exports.updateSingleLink = async (req, res, next) => {
  if (!req.body.link) {
    req.backflip = { message: 'Missing body parameter: link', status: 422 };
    return next();
  }

  let record = await Record.findOneById(req.params.id).catch(err => next(err));
  let links = record.links || [];
  let linkIndexToUpdate = links.findIndex(link => link._id.equals(req.params.subId));
  let linkToUpdate = links[linkIndexToUpdate];

  if (!linkToUpdate) {
    req.backflip = { message: 'Link not found.', status: 404 };
    return next();
  }

  // manual upsert ..........
  links[linkIndexToUpdate] = {
    _id: linkToUpdate._id,
    value: req.body.link.value || linkToUpdate.value || null,
    username: req.body.link.username || linkToUpdate.username || null,
    url: req.body.link.url || linkToUpdate.url || null,
    display: req.body.link.display || linkToUpdate.display || null,
    type: linkToUpdate.type
  };

  Record.findOneAndUpdate({ _id: record._id }, { $set: { links: links } }, { new: true })
    .then(recordSaved => {
      req.backflip = { message: 'Link updated with success.', status: 200, data: recordSaved.links[linkIndexToUpdate] };
      return next();
    }).catch(err => next(err));
}

exports.deleteSingleLink = async (req, res, next) => {

}

exports.getPopulatedRecord = async (req, res, next) => {
  if (!req.query.user || !req.query.organisation) {
    req.backflip = { message: 'Missing query parameters: user or organisation', status: 422 };
    return next();
  }

  try {
    let currentRecord, currentUser;
    let orgId = req.query.organisation;
    let authorizationHeader = req.headers.authorization;
    let accessToken = (authorizationHeader.split('Bearer ').length > 1 ? authorizationHeader.split('Bearer ')[1] : null);

    // Init working user
    if (!req.user._id.equals(req.query.user)) {
      if (!req.user.isSuperAdmin()) {
        req.backflip = { status: 403, message: 'Unauthorized' };
        return next();
      }
      currentUser = await User.findById(req.query.user).exec();
    } else {
      currentUser = req.user;
    }

    // Try to get record by user
    if (req.user.getRecordIdByOrgId(orgId))
      currentRecord = await new Promise((resolve, reject) => Record.findById(currentUser.getRecordIdByOrgId(orgId), orgId, (err, record) => resolve(record)));

    // Try to get record by email
    if (!currentRecord)
      currentRecord = await new Promise((resolve, reject) => Record.findByEmail(currentUser.loginEmail, orgId, (err, record) => resolve(record)));

    // Try to get record by Google id
    if (!currentRecord && currentUser.google && currentUser.google.id)
      currentRecord = await new Promise((resolve, reject) => GoogleRecord.getByGoogleId(currentUser.google.id, orgId, (err, record) => resolve(record)));

    if (!currentRecord && currentUser.googleUser)
      currentRecord = await new Promise((resolve, reject) => GoogleUserHelper.getGoogleRecord(accessToken, orgId)
        .then(record => resolve(record))
        .catch(error => { console.log('error: ' + JSON.stringify(error)); resolve(null); }));

    // Try to get record by LinkedIn
    if (!currentRecord && currentUser.linkedinUser)
      currentRecord = await new Promise((resolve, reject) => LinkedinUserHelper.getLinkedinRecord(accessToken, orgId)
        .then(record => resolve(record))
        .catch(error => { console.log('error: ' + JSON.stringify(error)); resolve(null); }));

    if (!currentRecord) {
      currentRecord = Record.makeFromEmail(currentUser.loginEmail, orgId);
      await currentRecord.save();
    }

    // Attach record to user
    if (currentRecord) {
      currentUser.attachOrgAndRecord({ _id: orgId }, currentRecord);
      let currentUserId = currentUser._id;
      delete currentUser._id;
      await User.findOneAndUpdate({ _id: currentUserId }, currentUser).then().catch(err => next(err));
      req.backflip = { status: 200, message: 'Record fetch with success.', data: currentRecord };
      return next();
    } else {
      req.backflip = { status: 404, message: 'Record not found.' };
      return next();
    }
  } catch (err) {
    return next(err);
  }
}



/**
 * @description Prepare links array
 */
let mixLinks = (currentLinks, newLinks) => {
  currentLinks = currentLinks || [];
  if (!newLinks || newLinks.length === 0) return currentLinks;

  newLinks.forEach(link => {
    if (link.value && link.type) {
      currentLinks.push(LinkHelper.makeLink(link.value, link.type));
    }
  });

  return currentLinks;
}