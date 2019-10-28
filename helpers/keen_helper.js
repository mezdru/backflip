"use strict";
let KeenAnalysis = require('keen-analysis');
let KeenTracking = require('keen-tracking');
let Organisation = require('../models/organisation');
const clientKeen = new KeenAnalysis({
  projectId: process.env.KEEN_PROJECT_ID,
  masterKey: process.env.KEEN_MASTER_KEY,
});

/**
 */
class KeenHelper {

  async recordEvent(eventFamily, object, orgId) {
    let keenKeyObject = await this.findOrCreateAccessKey(orgId, 'writes', false).catch(e => {console.log(e); return null;});
    if(!keenKeyObject || !keenKeyObject.key) return null;

    const clientKeenTracking = new KeenTracking({
      projectId: process.env.KEEN_PROJECT_ID,
      writeKey: keenKeyObject.key
    });

    return await clientKeenTracking.recordEvent(eventFamily, {
      item: object
    }).catch(e => {console.log(e); return null;});
  }

  async findOrCreateAccessKey(orgId, type, isPublic) {
    let org = (isPublic ?
      await Organisation.findOne({_id: orgId, public: isPublic}).catch(e => null) :
      await Organisation.findOne({_id: orgId}).catch(e => null));

    if (!org) return null;
  
    org = JSON.parse(JSON.stringify(org));
  
    let keyObjectArray = await clientKeen
      .get({
        url: clientKeen.url('projectId', `keys?name=${(org._id+':'+type)}`),
        api_key: clientKeen.masterKey(),
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
      keyObject = await clientKeen
        .post({
          url: clientKeen.url('projectId', 'keys'),
          api_key: clientKeen.masterKey(),
          params: {
            name: (org._id+':'+type),
            isActive: true,
            permitted: [type],
            options: options
          }
        }).catch(e => { console.log(e); return null; });
    }

    return keyObject;
  }
}

module.exports = new KeenHelper();