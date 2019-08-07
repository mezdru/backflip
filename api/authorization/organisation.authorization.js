var Organisation = require('../../models/organisation');
var User = require('../../models/user');

let check = (req, res, next) => {
	req.organisationId = req.body.orgId || (req.query && req.query.organisation ? req.query.organisation : null) || (req.params ? req.params.id : null);

	if (!req.organisationId) {
		let body = req.body;
		let bodyKeys = Object.keys(body);
		bodyKeys.forEach(key => {
			if (body[key].organisation) {
				req.organisationId = body[key].organisation;
			}
		});
	}

	if (!req.organisationId && !req.user.superadmin)
		return res.status(422).json({ message: 'Missing parameter, could not retrieve organisation Id.' });

	if (!req.user || (req.user.email && req.user.email.value && !req.user.email.validated))
		return res.status(403).json({ message: 'Email not validated', email: req.user.email.value });

	Organisation.findOne({ '_id': req.organisationId })
		.populate('featuredWingsFamily', '_id tag type name name_translated picture intro')
		.then(organisation => {
			if (!organisation && !req.user.superadmin) return res.status(404).json({ message: 'Organisation not found' });

			// If req.user isn't authorized user && isn't a Client
			if (!req.user || ((req.user instanceof User) && !req.user.superadmin && !req.user.belongsToOrganisation(organisation._id)))
				return res.status(403).json({ message: 'You haven\'t access to this Organisation.' });

			req.organisation = organisation;
			return next();
		}).catch(err => {
			console.log(err);
			return res.status(500).json({ message: 'Internal error', errors: [err] });
		});
}

module.exports = check;