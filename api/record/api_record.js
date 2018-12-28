var express = require('express');
var router = express.Router();
var auth = require('../middleware_authentification');
var authorization = require('../mid_authorization_profile');
let Record = require('../../models/record');
let Organisation = require('../../models/organisation');
let validate_record  = require('../validate_record');

/**
 * @api {get} /api/profiles/:profileId Get Record
 * @apiName GetRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} profileId Id of the Record (person or hashtag)
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Record fetch with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.get('/:profileId', auth, authorization, function(req, res, next) {
    Record.findOne({'_id' : req.params.profileId, 'organisation': req.organisation._id})
    .populate('hashtags', '_id tag type name name_translated picture')
    .populate('within', '_id tag type name name_translated picture')
    .then(record => {
        if(!record) return res.status(404).json({message: 'Record not found.'});
        return res.status(200).json({message: 'Record fetch with success.', record: record});
    }).catch((err) => {return next(err);});
});

/**
 * @api {post} /api/profiles/ Post new Record
 * @apiName PostRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {Record} Record to post
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Record fetch with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.post('/', auth, authorization, validate_record, function(req, res, next) {
    let record = req.body.record;
    if(!record) return res.status(422).json({message: 'Missing parameter'});

    Record.makeFromTagAsync(record.tag, req.organisation._id)
    .then(recordSaved => {
        record.tag = recordSaved.tag; // tag can be modify
        record.name = record.name || recordSaved.name;
        Record.findOneAndUpdate({'_id': recordSaved._id}, {$set: record}, {new: true})
        .populate('hashtags', '_id tag type name name_translated picture')
        .populate('within', '_id tag type name name_translated picture')
        .then(recordUpdated => {
            return res.status(200).json({message: 'Record saved.', record: recordUpdated});
        }).catch((err) => {return next(err);});
        
    }).catch(err => {
        return res.status(400).json({message: 'An error occurred during object saving.', err: [err.message]});
    });
});

/**
 * @api {put} /api/profiles/:profileId Update Record
 * @apiName PutRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {Record} Record to update
 * @apiParam {String} profileId Id of the Record (person or hashtag)
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Record fetch with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.put('/:profileId', auth, authorization, validate_record, function(req, res, next) {
    let recordToUpdate = req.body.record;
    if(!recordToUpdate) return res.status(422).json({message: 'Missing parameter'});
            
    Record.findOneAndUpdate({'_id' : req.params.profileId, 'organisation': req.organisation._id}, {$set: recordToUpdate}, {new: true})
    .populate('hashtags', '_id tag type name name_translated picture')
    .populate('within', '_id tag type name name_translated picture')
    .then(recordUpdated => {
        if(!recordUpdated) return res.status(404).json({message: 'Record not found.'});
        return res.status(200).json({message: 'Record updated with success.', record: recordUpdated});
    }).catch((err) => {return next(err);});    
});

/**
 * @api {delete} /api/profiles/:profileId Delete Record
 * @apiName DeleteRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} profileId Id of the Record (person or hashtag)
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Record fetch with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation. OR You can't delete this profile.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.delete('/:profileId', auth, authorization, function(req, res, next) {
    Record.findOne({'_id': req.params.profileId, 'organisation': req.organisation._id})
    .then(record => {
        if(!record) return res.status(404).json({message: 'Record not found.'});

        // An user only can deleted his profile.
        if(req.user.getOrgAndRecord(req.organisation._id).record._id.equals(record._id) || req.user.isSuperAdmin()){
            Record.deleteOne({'_id': record._id})
            .then(()=> {
                return res.status(200).json({message: 'Record deleted with success.', record: record});
            }).catch((err) => {return next(err);});
        }else{
            return res.status(403).json({message: 'You can\'t delete this profile.'});
        }  
    }).catch((err) => {return next(err);});
});

router.use(function(err, req, res, next){
    if(err) return res.status(500).json({message: 'Internal error', errors: [err.message]});
    return res.status(500).json({message: 'Unexpected error'});
});

module.exports = router;