var express = require('express');
var router = express.Router();
var Organisation = require('../../models/organisation');
var auth = require('../middleware_auth');
var algoliaOrganisation = require('../../models/algolia/algolia_organisation');

/**
 * @api {get} /api/organisation/:orgTag Get minors data of an Organisation
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
router.get('/:orgTag', function(req, res, next) {
    Organisation.findOne({'tag' : req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found.'});
        return res.status(200).json({
                                        message: 'Organisation fetch with success.', 
                                        organisation:   {
                                                            tag: organisation.tag, 
                                                            name: organisation.name, 
                                                            logo: organisation.logo.url
                                                        }
                                    });
    }).catch((err) => {return next(err);});
});

/**
 * @api {get} /api/organisation/algolia/public/:orgTag Get algolia public key of a public organisation
 * @apiName GetAlgoliaPublicKeyOfPublicOrg
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiParam {String} orgTag Tag of the Organisation
 * 
 * @apiSuccess {String} message Algolia public key fetch with success.
 * @apiSuccess {Object} public_key Key object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) OrganisationNotFound Organisation public not found.
 */
router.get('/algolia/public/:orgTag', function(req, res, next){
    Organisation.findOne({'tag' : req.params.orgTag, 'public': true})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation public not found.'});
        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        return res.status(200).json({message:'Algolia public key found with success.', public_key: publicKey});
    }).catch((err) => {return next(err);});
});

/**
 * @api {get} /api/organisation/algolia/private/:orgTag Get algolia public key of a private organisation
 * @apiName GetAlgoliaPublicKey
 * @apiGroup Organisation
 * @apiVersion 0.9.0
 * 
 * @apiHeader {String} Authorization User 'Bearer access_token'
 * @apiParam {String} orgTag Tag of the Organisation
 *  
 * @apiSuccess {String} message Algolia public key fetch with success.
 * @apiSuccess {Object} public_key Key object
 * 
 * @apiError (500 Internal Server Error) InternalError Internal error
 * @apiError (404 Not Found) Organisation public not found.
 * @apiError (401 Unauthorized) InvalidGrant Invalid resource owner credentials.
 * @apiError (403 Unauthorized) Unauthorized Client id or secret invalid. OR You haven't access to this Organisation.
 */
router.get('/algolia/private/:orgTag', auth, function(req, res, next){
    Organisation.findOne({'tag' : req.params.orgTag})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation public not found.'});
        if(!req.user.belongsToOrganisation(organisation._id)) return res.status(403).json({message: 'You haven\'t access to this Organisation.'})

        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        return res.status(200).json({message:'Algolia public key found with success.', public_key: publicKey});
    }).catch((err) => {return next(err);});
});

router.use(function(err, req, res, next){
    if(err) return res.status(500).json({message: 'Internal error', errors: [err.message]});
    return res.status(500).json({message: 'Unexpected error'});
});

module.exports = router;