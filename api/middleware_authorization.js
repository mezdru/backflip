var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation');
var Record = require('../models/record');

/**
 * @description We have to find the organisation Id.
 *              We have several ways to do it :
 *              - orgId is provide as URL parameter
 *              - orgId is provide as body parameter
 *              - recordId is provide as URL paramter, so we use the record to get the organisation Id.
 */

 /**
  * @description If an Id is in the URL, try to find the orgId with it.
  */
router.all('/:id', (req, res, next) => {
    if(req.baseUrl === '/api/profiles'){
        Record.findOne({'_id': req.params.id})
        .then(record => {
            if(!record) return res.status(404).json({message: 'Record not found'});
            if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(record.organisation)) ) 
                return res.status(403).json({message: 'You haven\'t access to this Organisation.'});
                req.organisationId = record.organisation;
                return next();
        }).catch(err => {
            return res.status(500).json({message: 'Internal error', errors: [err]});
        });

    }else if(req.baseUrl === '/api/organisations'){
        req.organisationId = req.params.id;
        next();

    }else{
        next();
    }
});

/**
 * @description Last chance to find orgId as body parameter, and perform authorization
 */
router.use(function(req, res, next) {

    if(!req.organisationId) req.organisationId = req.body.orgId;
    if(!req.organisationId) return res.status(422).json({message: 'Missing parameter, could not retrieve organisation Id.'});

    Organisation.findOne({'_id': req.organisationId})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found'});
        if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) ) 
            return res.status(403).json({message: 'You haven\'t access to this Organisation.'});

        req.organisation = organisation;
        return next();
    }).catch(err => {
        return res.status(500).json({message: 'Internal error', errors: [err]});
    });
});

module.exports = router;