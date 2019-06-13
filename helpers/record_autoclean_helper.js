let request = require('request');
let Record = require('../models/record');
let LinkHelper = require('../helpers/link_helper');
const readline = require('readline').createInterface({
  input: process.stdin,
  output: process.stdout
})

/**
 */
class RecordAutocleanHelper {

  constructor() {
    this.recordsAll = [];
    this.allOrgId = '5a8be48b2cc7a600149ff57d';
  }

  async run() {
    await this.fetchRecordall();

    await this.asyncForEach(this.recordsAll, async (recordAll) => {
      let duplicateRecords = await this.findDuplicateRecords(recordAll);
      await this.asyncForEach(duplicateRecords, async (dupRecord) => {
        if (!dupRecord._id.equals(recordAll._id) && !dupRecord.organisation.equals(this.allOrgId))
          await this.askAndMerge(recordAll, dupRecord);
      });
    });

    console.log('END');
    readline.close();
  }

  async asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
      await callback(array[index], index, array);
    }
  }

  async fetchRecordall() {
    await Record.find({ organisation: this.allOrgId })
      .then(records => {
        this.recordsAll = records;
      }).catch(e => { console.log(e); this.recordsAll = [] });
  }

  async findDuplicateRecords(record) {
    return await Record.find({ $or: [{ tag: record.tag }, { name: record.name }] })
    .populate('hashtags', '_id tag type name name_translated picture')
    .populate('within', '_id tag type name name_translated picture')
  }

  askAndMerge(recordTo, recordFrom) {
    return new Promise((resolve, reject) => {
      readline.question('Do you want to merge this record : ' +
        JSON.stringify({ _id: recordFrom._id, tag: recordFrom.tag, name: recordFrom.name, name_translated: recordFrom.name_translated, emoji: (recordFrom.picture ? recordFrom.picture.emoji : null) }) +
        ' to this one : ' +
        JSON.stringify({ _id: recordTo._id, tag: recordTo.tag, name: recordTo.name, name_translated: recordTo.name_translated, emoji: (recordTo.picture ? recordTo.picture.emoji : null) }) +
        ' ?', (name) => {

          if (name.charAt(0).toUpperCase() === 'Y') {
            console.log('Will merge these records.');
            this.merge(recordTo, recordFrom)
              .then(() => { resolve() });
          } else {
            resolve();
          }
        });
    });
  }

  merge(recordTo, recordFrom) {
    return new Promise(async (resolve, reject) => {
      let recordsUsingFromRecord = await Record.find({ hashtags: recordFrom._id })
        .populate('hashtags', '_id tag type name name_translated picture')
        .populate('within', '_id tag type name name_translated picture')
        .then(recs => { return recs });

      console.log();
      console.log('These records are using the recordFrom: ');

      await this.asyncForEach(recordsUsingFromRecord, async (record) => {
        console.log(record._id);
        var indexOfFromRecord = record.hashtags.findIndex(hashtag => hashtag.tag === recordFrom.tag);

        record.hashtags[indexOfFromRecord] = recordTo;
        console.log('>>> Old Record replaced in hashtags.');

        await Record.updateOne({ _id: record._id }, { $set: { hashtags: record.hashtags } }, { new: true });
        console.log('>>> Record using recordFrom updated.')
        console.log('--- --- --- --- ---');
      });

      // If recordFrom contains hashtags (featuredWings, etc.) we should populate recordTo hashtags.
      if(recordFrom.hashtags.length > 0) {
        console.log('Concat <from> hashtags to <to> hashtags.');
        recordTo.hashtags = recordTo.hashtags.concat(recordFrom.hashtags);
        await recordTo.save();
      }

      await recordFrom.delete(null, function (err) {
        if (err) console.log(err);
        console.log(recordFrom.tag + ' (' + recordFrom._id + ') removed with success.');
        console.log();
        resolve();
      });
    })

  }


}

module.exports = new RecordAutocleanHelper();