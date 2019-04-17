var express = require('express');
var router = express.Router();
var Organisation = require('../models/organisation');
var Record = require('../models/record');

router.all('/superadmin/*', (req, res, next) => {
    if(!req.user.isSuperAdmin()) return res.status(403).json({message: 'This is a restricted route.'});
    req.superadminAccess = true;
    return next();
})

//@todo remove with route workplace
router.all('/workplace/:id', (req, res, next) => {
    req.bypassFindById = true;
    return next();
});

router.all(['/tag/:profileTag/organisation/:organisationId', '/user/:userId/organisation/:organisationId'], (req, res, next) => {
    req.bypassFindById = true;
    req.organisationId = req.params.organisationId
    return next();
})

 /**
  * @description If an Id is in the URL, try to find the orgId with it.
  */
router.all(['/:id', '/:id/*'], (req, res, next) => {
    if(req.bypassFindById || req.superadminAccess) return next();
    Record.findOne({'_id': req.params.id})
    .populate('organisation', '_id name tag logo picture cover google email public premium created canInvite')
    .then(record => {
        if(!record) return next();
        if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(record.organisation._id)) ) 
            return res.status(403).json({message: 'You haven\'t access to this Organisation.'});
            req.organisation = record.organisation;
            return next();
    }).catch(err => { return res.status(500).json({message: 'Internal error', errors: [err]});});
});

/**
 * @description No id in the URL, we have to use orgId post parameter.
 */
router.use('', (req, res, next) => {
    if(req.organisation || req.superadminAccess) return next();
    if(!(req.body.orgId || req.organisationId )) return res.status(422).json({message: 'Missing parameter, could not retrieve organisation Id.'});
    if(!req.user || (req.user.email && req.user.email.value && !req.user.email.validated))
      return res.status(403).json({message: 'Email not validated', email: req.user.email.value});

    Organisation.findOne({'_id': req.body.orgId || req.organisationId})
    .then(organisation => {
        if(!organisation) return res.status(404).json({message: 'Organisation not found'});
        if( !req.user || (!req.user.isSuperAdmin() && !req.user.belongsToOrganisation(organisation._id)) ) 
            return res.status(403).json({message: 'You haven\'t access to this Organisation.'});
        req.organisation = organisation;
        return next();
    }).catch(err => { return res.status(500).json({message: 'Internal error', errors: [err]});});
});

module.exports = router;