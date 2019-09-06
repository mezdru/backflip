var Organisation = require('../../models/organisation');
var User = require('../../models/user');

let findOrganisationInBody = (body) => {
	let bodyKeys = Object.keys(body);
	let organisation = null;
	bodyKeys.forEach(key => {
		if (body[key].organisation) organisation = body[key].organisation;
	});
	return organisation;
}

let check = async (req, res, next) => {
	req.organisationId = req.body.orgId || (req.query && req.query.organisation ? req.query.organisation : null) || (req.params ? req.params.id : null);

	if (!req.organisationId) req.organisationId = findOrganisationInBody(req.body);

	if (!req.organisationId && !req.user.superadmin)
		return res.status(422).json({ message: 'Missing parameter, could not retrieve organisation Id.' });

	if (!req.user || (req.user.email && req.user.email.value && !req.user.email.validated))
		return res.status(403).json({ message: 'Email not validated', email: req.user.email.value });

	let organisation = await Organisation.findOne({_id: req.organisationId}).populate('featuredWingsFamily', '_id tag type name name_translated picture intro')
													.catch(err => {
														console.log(err);
														return res.status(500).json({ message: 'Internal error', errors: [err] });
													});
	
	if (!organisation && !req.user.superadmin) return res.status(404).json({ message: 'Organisation not found' });

	// If req.user isn't authorized user && isn't a Client
	if (!req.user || ((req.user instanceof User) && !req.user.superadmin && !req.user.belongsToOrganisation(organisation._id)))
	return res.status(403).json({ message: 'You haven\'t access to this Organisation.' });

	req.organisation = organisation;
	return next();
}

module.exports = check;