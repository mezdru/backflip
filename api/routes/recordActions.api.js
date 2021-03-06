var express = require('express');
var router = express.Router();
let Record = require('../../models/record');
var LinkHelper = require('../../helpers/link_helper');
var uppercamelcase = require('uppercamelcase');
var slug = require('slug');
var passport = require('passport');
require('../passport/strategy');

/**
 * @description Sync all records of Wingzy to Algolia
 */
router.get('/superadmin/sync/algolia/all', passport.authenticate('bearer', { session: false }), (req, res, next) => {
  if (!req.user.isSuperAdmin()) return res.status(403).json({ message: 'This is a restricted route.' });
  var recordsUpdated = 0;

  Record.find()
    .populate('hashtags', '_id tag type name name_translated picture description autoAddWithChild')
    .populate('within', '_id tag type name name_translated picture')
    .then(async records => {

      await asyncForEach(records, async (record) => {
        recordsUpdated++;
        record.save();
      });

      return res.status(200).json({ message: 'Records sync with Algolia.', recordsUpdated: recordsUpdated });

    }).catch((e) => { return next(e); });

});

// Insert or Update an array of Record.
// @todo Write API doc
// /api/profiles/bulk
router.post('/bulk', passport.authenticate('bearer', { session: false }), async (req, res, next) => {
  if (!req.user.isSuperAdmin()) return res.status(403).json({ message: 'This is a restricted route.' });
  if (!req.body.records) return res.status(422).json({ message: 'Missing body parameter : records {Array}' });

  let records = req.body.records

  if (typeof records === "string") records = JSON.parse(records);

  let recordsUpdated = [];
  let recordsCreated = [];
  let errors = [];

  await asyncForEach(records, async (incomingRecord) => {
    let incomingRecordId = incomingRecord._id;
    delete incomingRecord._id;

    if (incomingRecordId) {
      console.log('API - PROFILES - BULK : Update record with id : ' + incomingRecordId);
      let updatedRecord = await updateRecord(incomingRecordId, incomingRecord).catch(e => { errors.push({ error: e, data: incomingRecord }); return null; });
      if (updatedRecord) recordsUpdated.push(updatedRecord);
    } else {
      console.log('API - PROFILES - BULK : Create record with tag / name : ' + incomingRecord.tag + ' / ' + incomingRecord.name);
      let createdRecord = await createRecord(incomingRecord).catch(e => { errors.push({ error: e, data: incomingRecord }); return null; });
      if (createdRecord) recordsCreated.push(createdRecord);
    }
  });

  return res.status(200).json({ message: 'Request done.', updated: recordsUpdated, created: recordsCreated, errors: errors });
});

// Count Wings occurrence
router.get('/superadmin/wings/:wingsId/count', passport.authenticate('bearer', { session: false }), function (req, res, next) {
  if (!req.user.isSuperAdmin()) return res.status(403).json({ message: 'This is a restricted route.' });
  if (!req.params.wingsId) return res.status(422).json({ message: 'Missing parameter.' });

  Record.find({ hashtags: req.params.wingsId, type: 'person' })
    .then(records => {
      return res.status(200).json({ message: 'Request made with success.', occurrence: records.length });
    }).catch((err) => { return next(err); });
});

module.exports = router;

// @todo the following methods have nothing to do here

/**
 * @description Array of TAGs or IDs or Record Object 
 * @param {*} array 
 */
let cleanHashtags = async (array, organisationId) => {
  let cleanedArray = [];
  if (!array || array.length === 0) return Promise.resolve([]);

  await asyncForEach(array, async (hashtag) => {
    let toPush = null;
    toPush = await Record.findOne({ _id: hashtag._id || hashtag, organisation: [Record.getTheAllOrganisationId(), organisationId] }).catch(e => {return null;});
    if(!toPush) toPush = await Record.findByTagAsync(hashtag, organisationId).catch(e => {return null;});

    if(!toPush) toPush = await createRecord({organisation: organisationId, ...hashtag}).catch(e => null);

    if (toPush && !cleanedArray.find(elt => JSON.stringify(elt) === JSON.stringify(toPush)))
      cleanedArray.push(toPush)
  }).catch(e => console.log(e));

  return cleanedArray;
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

let updateRecord = async (recordId, incomingRecord) => {
  let currentRecord = await Record.findOne({ _id: recordId });

  // format links & mix links data
  if (incomingRecord.links && incomingRecord.links.length > 0) {
    let currentRecordLinks = currentRecord.links;
    currentRecord.links = [];
    currentRecord.makeLinks(mixLinks(currentRecordLinks, incomingRecord.links));
    incomingRecord.links = currentRecord.links;
  }

  // Handle picture & save
  if (incomingRecord.picture && incomingRecord.picture.url) {
    await new Promise((res, rej) => {
      currentRecord.addPictureByUrl(incomingRecord.picture.url, function (err, data) {
        if (err) {
          console.log(err);
          rej(err);
        }
        else res();
      });
    });
    incomingRecord.picture = currentRecord.picture;
  }

  // Handle hashtags
  let hashtags = await cleanHashtags(incomingRecord.hashtags, currentRecord.organisation).catch(e => { console.log(e); return null; });
  if (hashtags && hashtags.length > 0) incomingRecord.hashtags = hashtags;
  if ((!hashtags || hashtags.length === 0) && (incomingRecord.hashtags)) await delete incomingRecord.hashtags;

  return Record.findOneAndUpdate({ _id: recordId }, { $set: incomingRecord }, { new: true });
}

let createRecord = async (incomingRecord) => {
  if (incomingRecord.type === 'person')
    incomingRecord.tag = Record.getTagFromEmail(incomingRecord.links.find(link => link.type === 'email').value);
  else if ((incomingRecord.type === 'hashtag') && incomingRecord.name && !incomingRecord.tag)
    incomingRecord.tag = '#' + slug(uppercamelcase(incomingRecord.name));

  let recordAlreadyexisting = await Record.findByTagAsync(incomingRecord.tag, incomingRecord.organisation).catch(e => null);
  if(recordAlreadyexisting) throw new Error('Record already existing');

  let incomingRecordHashtags = incomingRecord.hashtags;
  delete incomingRecord.hashtags;
  let incomingRecordObject = new Record(incomingRecord);

  // format links & mix links data
  if (incomingRecord.links && incomingRecord.links.length > 0) {
    incomingRecordObject.makeLinks(mixLinks([], incomingRecord.links));
  }

  // Handle picture & save
  if (incomingRecordObject.picture && incomingRecordObject.picture.url) {
    await new Promise((res, rej) => {
      incomingRecordObject.addPictureByUrl(incomingRecordObject.picture.url, function (err, data) {
        if (err) {
          console.log(err);
          rej(err);
        }
        else res();
      });
    });
  }

  // Handle hashtags
  let hashtags = await cleanHashtags(incomingRecordHashtags, incomingRecordObject.organisation).catch(e => { console.log(e); return null; });
  if (hashtags && hashtags.length > 0) incomingRecordObject.hashtags = hashtags;
  if ((!hashtags || hashtags.length === 0) && (incomingRecordObject.hashtags)) await delete incomingRecordObject.hashtags;

  return incomingRecordObject.save();
}

let asyncForEach = async (array, callback) => {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}