var express = require('express');
var router = express.Router();
var auth = require('../middleware_auth');
let Record = require('../../models/record');
let Organisation = require('../../models/organisation');

/**
 * @api {get} /api/record/:recordTag/organisation/:orgTag Get record by tag
 * @apiName GetRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} recordTag Tag of the Record (person or hashtag)
 * @apiParam {String} orgTag Tag of the Organisation
 *  
 * @apiSuccess {String} message Record fetch with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 */
router.get('/:recordTag/organisation/:orgTag', auth, function(req, res, next) {
    Organisation.findOne({'tag': req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        if(!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) return res.status(403).json({message: 'You haven\'t access to this Organisation.'})

        Record.findOne({'tag' : req.params.recordTag, 'organisation': organisation._id})
        .populate('hashtags', '_id tag type name picture')
        .populate('within', '_id tag type name picture')
        .then(record => {
            if(!record) return res.status(404).json({message: 'Record not found.'});
            return res.status(200).json({message: 'Record fetch with success.', record: record});
        }).catch((err) => {return next(err);});

    }).catch((err) => {return next(err);});
});

/**
 * @api {put} /api/record/:recordTag/organisation/:orgTag Update record
 * @apiName UpdateRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} recordTag Tag of the Record (person or hashtag)
 * @apiParam {String} orgTag Tag of the Organisation
 *  
 * @apiSuccess {String} message Record updated with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 */
// @todo check record in input
router.put('/:recordTag/organisation/:orgTag', auth, function(req, res, next) {
    Organisation.findOne({'tag': req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        if(!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) return res.status(403).json({message: 'You haven\'t access to this Organisation.'})

            let recordToUpdate = req.body.record;
            
            Record.findOneAndUpdate({'tag' : req.params.recordTag, 'organisation': organisation._id}, {$set: recordToUpdate}, {new: true})
            .then(recordUpdated => {
                if(!recordUpdated) return res.status(404).json({message: 'Record not found.'});
                return res.status(200).json({message: 'Record updated with success.', record: recordUpdated});
            }).catch((err) => {return next(err);});

    }).catch((err) => {return next(err);});
});

/**
 * @api {post} /api/record/organisation/:orgTag Post record
 * @apiName PostRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {Record} Record to post
 *  
 * @apiSuccess {String} message Record saved with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 * @apiError (400 Bad Request) BadRequest An error occurred during object saving. OR Missing parameters
 */
// @todo check fields of record before save ?
router.post('/organisation/:orgTag', auth, function(req, res, next) {
    let record = req.body.record;
    if(!record.tag) return res.status(400).json({message: 'Missing parameters'});
    
    Organisation.findOne({'tag': req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        if(!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) return res.status(403).json({message: 'You haven\'t access to this Organisation.'});

        Record.makeFromTagAsync(record.tag, organisation._id)
        .then(recordSaved => {
            Record.findOneAndUpdate({'_id': recordSaved._id}, {$set: record}, {new: true})
            .then(recordUpdated => {
                return res.status(200).json({message: 'Record saved.', record: recordUpdated});
            }).catch((err) => {return next(err);});
            
        }).catch(err => {
            return res.status(400).json({message: 'An error occurred during object saving.', err: [err.message]});
        });

    }).catch((err) => {return next(err);});
});

/**
 * @api {get} /api/record/organisation/:orgTag/me Get my record in organisation
 * @apiName GetMyRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} orgTag Tag of the Organisation
 *  
 * @apiSuccess {String} message Record fetch with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 */
router.get('/organisation/:orgTag/me', auth, function(req, res , next) {
    Organisation.findOne({'tag': req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        if(!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) return res.status(403).json({message: 'You haven\'t access to this Organisation.'});

        Record.findOne(req.user.getOrgAndRecord(organisation._id).record._id)
        .populate('hashtags', '_id tag type name picture')
        .populate('within', '_id tag type name picture')
        .then(record => {
            if(!record) return res.status(404).json({message: 'Record not found.'});
            return res.status(200).json({message: 'Record fetch with success.', record: record});
        }).catch((err) => {return next(err);});

    }).catch((err) => {return next(err);});    
});

/**
 * @api {delete} /api/record/organisation/:orgTag/me Remove my record in organisation
 * @apiName RemoveMyRecord
 * @apiGroup Record
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} orgTag Tag of the Organisation
 *  
 * @apiSuccess {String} message Record removed with success.
 * @apiSuccess {Record} record Record object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 */
router.delete('/organisation/:orgTag/me', auth, function(req, res , next) {
    Organisation.findOne({'tag': req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        if(!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) return res.status(403).json({message: 'You haven\'t access to this Organisation.'});

        Record.findOne(req.user.getOrgAndRecord(organisation._id).record._id)
        .then(record => {
            if(!record) return res.status(404).json({message: 'Record not found.'});

            Record.remove({'_id': record._id})
            .then(()=> {
                return res.status(200).json({message: 'Record removed with success.', record: record});
            }).catch((err) => {return next(err);});
            
        }).catch((err) => {return next(err);});

    }).catch((err) => {return next(err);});    
});

router.use(function(err, req, res, next){
    if(err) return res.status(500).json({message: 'Internal error', errors: [err.message]});
    return res.status(500).json({message: 'Unknown error'});
});


module.exports = router;