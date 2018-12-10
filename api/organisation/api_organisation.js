var express = require('express');
var router = express.Router();
var Organisation = require('../../models/organisation');
var auth = require('../middleware_auth');
var algoliaOrganisation = require('../../models/algolia/algolia_organisation');
let authorization = require('../middleware_authorization');
var User = require('../../models/user');
var validate_organisation = require('../validate_organisation');

/**
 * @api {get} /api/organisations/:orgTag/forpublic Get minors data of an Organisation
 * @apiName GetOrganisationForPublic
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiParam {String} orgTag Tag of the Organisation
 * 
 * @apiSuccess {String} message Organisation fetch with success.
 * @apiSuccess {Organisation} organisation Organisation object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (400 Bad Request) BadRequest Missing parameters
 * @apiError (404 Not Found) OrganisationNotFound Organisation not found.
 */
router.get('/:orgTag/forpublic', function(req, res, next) {
    Organisation.findOne({'tag' : req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        return res.status(200).json({
                                        message: 'Organisation fetch with success.', 
                                        organisation:   {
                                                            _id: organisation._id,
                                                            tag: organisation.tag, 
                                                            name: organisation.name, 
                                                            logo: organisation.logo.url,
                                                            public: organisation.public
                                                        }
                                    });
    }).catch((err) => {return next(err);});
});

/**
 * @api {get} /api/organisations/:orgId Get Organisation
 * @apiName GetOrganisation
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} orgId Id of the Organisation
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Organisation fetch with success.
 * @apiSuccess {Organisation} organisation Organisation object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) OrganisationNotFound Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.get('/:orgId', auth, authorization,  (req, res, next)=>{
    return res.status(200).json({message: 'Organisation fetch with success.', organisation: req.organisation});
});

/**
 * @api {put} /api/organisations/:orgId Update Organisation
 * @apiName PutOrganisation
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {Organisation} Organisation to update
 * @apiParam {String} orgId Id of the Organisation
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Organisation fetch with success.
 * @apiSuccess {Organisation} organisation Organisation object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) OrganisationNotFound Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.put('/:orgId', auth, authorization, validate_organisation, (req, res, next)=>{
    if( !(req.user.isAdminToOrganisation(req.organisation._id) || req.user.isSuperAdmin()) )
        return res.status(403).json({message: 'You have not the authorization to modify this Organisation.'});
    
    if(!req.user.isSuperAdmin()){
        delete req.body.organisation.premium;
        delete req.body.organisation.public;
    }

    Organisation.findOneAndUpdate({'_id': req.organisation._id}, {$set: req.body.organisation}, {new: true})
    .then(organisationUpdated => {
        if(!organisationUpdated) return res.status(404).json({message: 'Organisation not found.'});
        return res.status(200).json({message: 'Organisation updated with success.', record: organisationUpdated});
    }).catch((err) => {return next(err);});  
});

/**
 * @api {delete} /api/organisations/:orgId Delete Organisation
 * @apiName DeleteOrganisation
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} orgId Id of the Organisation
 * @apiParam {String} orgId Id of the Organisation (Body parameter)
 *  
 * @apiSuccess {String} message Organisation deleted with success.
 * @apiSuccess {Organisation} organisation Organisation object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) OrganisationNotFound Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You have not the authorization to delete this Organisation.
 * @apiError (422 Missing Parameter) Missing parameter
 */
router.delete('/:orgId', auth, authorization, (req, res,next)=>{
    if( !req.user.isSuperAdmin() )
        return res.status(403).json({message: 'You have not the authorization to delete this Organisation.'});

    Organisation.deleteOne({'_id': req.organisation._id})
    .then(()=> {
        return res.status(200).json({message: 'Organisation deleted with success.', organisation: req.organisation});
    }).catch((err) => {return next(err);});
});

/**
 * @api {post} /api/organisations/ Post new Organisation
 * @apiName PostOrganisation
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {Organisation} organisation Organisation to post
 *  
 * @apiSuccess {String} message Organisation fetch with success.
 * @apiSuccess {Organisation} organisation Organisation object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) RecordNotFound Record not found. OR Organisation not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid.
 * @apiError (422 Missing Parameter) Missing parameter
 * @apiError (409 Already Exists) Conflict Organisation already exists.
 */
router.post('/', auth, validate_organisation, (req, res, next)=>{
    let organisation = new Organisation(req.body.organisation);
    if(!organisation) return res.status(422).json({message: 'Missing body parameter : organisation'});
    organisation.creator = req.user._id;
    if(!req.user.isSuperAdmin()){
        delete req.body.organisation.premium;
        delete req.body.organisation.public;
    }

    organisation.save(function(err, organisationSaved){
        if(err) {
            if (err.code === 11000) {
                return res.status(409).json({message: 'An Organisation with the same tag already exists.'});
            }
            return next(err);
        }
        req.user.makeAdminToOrganisation(organisationSaved);

        User.findOneAndUpdate({'_id': req.user._id}, {$set: {'orgsAndRecords':req.user.orgsAndRecords}}, {new: true})
        .then(userUpdated => {
            return res.status(200).json({message: 'Organisation created with success.', organisation: organisationSaved});
        }).catch(err => {
            return next(err);
        })
    });
});

/**
 * @api {get} /api/organisations/algolia/public Get algolia public key of a public organisation
 * @apiName GetAlgoliaPublicKeyOfPublicOrg
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiParam {String} orgId Id of the Organisation
 * 
 * @apiSuccess {String} message Algolia public key fetch with success.
 * @apiSuccess {Object} public_key Key object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) OrganisationNotFound Organisation public not found.
 */
router.get('/algolia/public', function(req, res, next){
    Organisation.findOne({'_id' : req.body.orgId, 'public': true})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation public not found.'});
        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        return res.status(200).json({message:'Algolia public key found with success.', public_key: publicKey});
    }).catch((err) => {return next(err);});
});

/**
 * @api {get} /api/organisation/algolia/private Get algolia public key of a private organisation
 * @apiName GetAlgoliaPublicKey
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} orgId Id of the Organisation
 *  
 * @apiSuccess {String} message Algolia public key fetch with success.
 * @apiSuccess {Object} public_key Key object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) Organisation public not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 */
router.get('/algolia/private', auth, authorization, function(req, res, next){
    let publicKey = algoliaOrganisation.makePublicKey(req.organisation._id);
    return res.status(200).json({message:'Algolia public key found with success.', public_key: publicKey});
});

router.use(function(err, req, res, next){
    if(err) return res.status(500).json({message: 'Internal error', errors: [err.message]});
    return res.status(500).json({message: 'Unexpected error'});
});

module.exports = router;