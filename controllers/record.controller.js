var Record = require('../models/record');
var Link = require('../models/link_schema');
var slug = require('slug');
var uppercamelcase = require('uppercamelcase');

exports.getRecords = async (req, res, next) => {
  Record.find({ ...req.query })
    .populate('hashtags', '_id tag type name name_translated picture')
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
  Record.findOneById(req.params.id)
    .then(record => {
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
    }).catch(err => {
      if (err.name = 'CastError') {
        req.backflip = { message: 'Record id is not valid.', status: 422 };
        return next();
      }
      return next(err)
    });
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

  Record.makeFromTagAsync(record.tag, req.organisation._id, record.hidden)
    .then(recordSaved => {
      record.tag = recordSaved.tag; // tag can be modify
      record.name = record.name || recordSaved.name;
      Record.findOneAndUpdate({ '_id': recordSaved._id }, { $set: record }, { new: true })
        .then(recordUpdated => {
          Record.findOneById(recordUpdated._id)
            .then(recordPopulated => {
              req.backflip = { message: 'Record created with success', data: recordPopulated, status: 200 };
              return next();
            });
        }).catch(err => next(err));
    }).catch(err => {
      if (err.code === 11000 && record.type === 'hashtag') {
        req.backflip = { message: 'Record already exists in this organisation.', status: 409 };
        return next();
      }
      return next(err);
    });
}

exports.updateSingleRecord = async (req, res, next) => {
  if(!req.body.record) {
    req.backflip = {message: 'Missing body parameter: record', status: 422};
    return next();
  }

  Record.findOneAndUpdate({_id: req.params.id}, {$set: req.body.record}, {new: true})
  .then(recordUpdated => {
    if (!recordUpdated) {
      req.backflip = {message: 'Record not found', status: 404};
      return next();
    }

    Record.findOneById(recordUpdated._id)
    .then(recordUpdated => {
      if (req.body.record.picture && req.body.record.picture.url) {
        recordUpdated.addPictureByUrlAsync(req.body.record.picture.url)
          .then(pictureField => {
            recordUpdated.picture = pictureField.picture;
            recordUpdated.save().then((recordUpdatedBis) => {
              req.backflip = {message: 'Record updated with success', status: 200, data: recordUpdatedBis};
              return next();
            }).catch((err) => { return next(err); });
          })
      } else {
        req.backflip = {message: 'Record updated with success', status: 200, data: recordUpdated};
        return next();
      }
    });

  }).catch(err => next(err));
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
  if(!req.body.link) {
    req.backflip = {message: 'Missing body parameter: link', status: 422};
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
  if(!req.body.link) {
    req.backflip = {message: 'Missing body parameter: link', status: 422};
    return next();
  }

  let record = await Record.findOneById(req.params.id).catch(err => next(err));
  let links = record.links || [];
  let linkIndexToUpdate = links.findIndex(link => link._id.equals(req.params.subId));
  let linkToUpdate = links[linkIndexToUpdate];

  if(!linkToUpdate) {
    req.backflip = {message: 'Link not found.', status: 404};
    return next();
  }

  // manual upsert ..........
  links[linkIndexToUpdate] = {
    _id: linkToUpdate._id,
    value: req.body.link.value || linkToUpdate.value || null,
    username: req.body.link.username || linkToUpdate.username ||  null,
    url: req.body.link.url || linkToUpdate.url || null,
    display: req.body.link.display || linkToUpdate.display || null,
    type: linkToUpdate.type
  };

  Record.findOneAndUpdate({_id: record._id}, {$set: {links: links} }, {new: true})
  .then(recordSaved => {
    req.backflip = {message: 'Link updated with success.', status: 200, data: recordSaved.links[linkIndexToUpdate]};
    return next();
  }).catch(err => next(err));
}

exports.deleteSingleLink = async (req, res, next) => {

}