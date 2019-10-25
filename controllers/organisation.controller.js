var Organisation = require('../models/organisation');
var algoliaOrganisation = require('../models/algolia/algolia_organisation');

exports.getSingleOrganisationForPublic = (req, res, next) => {
  Organisation.findOne({ ...req.query })
    .populate('featuredWingsFamily', '_id name name_translated picture tag intro')
    .then(organisation => {

      if (!organisation) {
        req.backflip = { message: 'Organisation not found', status: 404 };
      } else {
        req.backflip = {
          message: 'Organisation found for public', status: 200, data: {
            _id: organisation._id,
            tag: organisation.tag,
            name: organisation.name,
            logo: organisation.logo,
            cover: organisation.cover,
            public: organisation.public,
            featuredWingsFamily: (organisation.public ? organisation.featuredWingsFamily : []),
            intro: organisation.intro
          }
        };
      }
      return next();
    }).catch(err => next(err));
}

exports.getSingleOrganisation = (req, res, next) => {
  Organisation.findOne({ _id: req.params.id })
    .populate('featuredWingsFamily', '_id name name_translated picture tag intro')
    .then(organisation => {
      if (!organisation) {
        req.backflip = { message: 'Organisation not found', status: 404 };
      } else {
        req.backflip = { message: 'Organisation found', status: 200, data: organisation };
      }
      return next();
    }).catch(err => next(err));
}

exports.getAlgoliaPrivateKey = (req, res, next) => {
  Organisation.findOne({ _id: req.params.id })
    .then(organisation => {
      if (!organisation) {
        req.backflip = { message: 'Organisation not found.', status: 404 };
      } else {
        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        req.backflip = { message: 'Organisation algolia key found', status: 200, data: publicKey };
      }
      return next();
    }).catch(err => next(err));
}

exports.getAlgoliaPublicKey = (req, res, next) => {
  Organisation.findOne({ _id: req.params.id, public: true })
    .then(organisation => {
      if (!organisation) {
        req.backflip = { message: 'Organisation public not found.', status: 404 };
      } else {
        let publicKey = algoliaOrganisation.makePublicKey(organisation._id);
        req.backflip = { message: 'Organisation algolia key found', status: 200, data: publicKey };
      }
      return next();
    }).catch(err => next(err));
}

let KeenAnalysis = require('keen-analysis');
const client = new KeenAnalysis({
  projectId: process.env.KEEN_PROJECT_ID,
  masterKey: process.env.KEEN_MASTER_KEY,
});

exports.getKeenPublicKey = async (req, res, next) => {
  let org = await Organisation.findOne({ _id: req.params.id, public: true });
  await getKeenKey(req, res, next, org, 'writes');
}

exports.getKeenPrivateKey = async (req, res, next) => {
  let org = await Organisation.findOne({ _id: req.params.id });
  await getKeenKey(req, res, next, org, 'writes');
}

exports.getKeenPrivateReadKey = async (req, res, next) => {
  let org = await Organisation.findOne({ _id: req.params.id });
  await getKeenKey(req, res, next, org, 'queries');
}


let getKeenKey = async (req, res, next, org, type) => {
  if (!org) {
    req.backflip = { status: 404, message: "Can't find the organisation." };
    return next();
  }

  org = JSON.parse(JSON.stringify(org));

  let keyObjectArray = await client
    .get({
      url: client.url('projectId', `keys?name=${(org._id+':'+type)}`),
      api_key: client.masterKey(),
    }).catch(e => { console.log(e); return null; });

  let keyObject = (keyObjectArray.length > 0 ? keyObjectArray[0] : null);

  let options = (type === 'queries' ? {
    queries: {
      filters: [
        {
          propertyName: 'organisation._id',
          operator: 'eq',
          propertyValue: (org._id),
        }
      ]
    }
  } : {
    writes: {
      autofill: {
        organisation: {
          _id: org._id,
          tag: org.tag
        }
      }
    }
  })

  if (!keyObject) {
    keyObject = await client
      .post({
        url: client.url('projectId', 'keys'),
        api_key: client.masterKey(),
        params: {
          name: (org._id+':'+type),
          isActive: true,
          permitted: [type],
          options: options
        }
      }).catch(e => { console.log(e); return null; });
  }

  if (!keyObject || !keyObject.key) {
    req.backflip = { status: 422, message: "Can't fetch access key <Writes> for organisation." };
    return next();
  }

  req.backflip = { status: 200, message: "Keen access key <Writes> fetch with success.", data: keyObject.key };
  return next();
}