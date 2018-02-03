var ALGOLIA_APPID = 'RSXBUBL0PB';
var ALGOLIA_SEARCH_APIKEY = algoliaPublicKey.value;
var ALGOLIA_INDEX_NAME = 'world';
var NB_RESULTS_DISPLAYED = 5;

var algoliaClient = new algoliasearch(ALGOLIA_APPID, ALGOLIA_SEARCH_APIKEY);
var index = algoliaClient.initIndex(ALGOLIA_INDEX_NAME);
var lastQuery = '';
$('.desc-input').textcomplete([
  {
    // #3 - Regular expression used to trigger the autocomplete dropdown
    match: /[#]([^\s@#\,\.\!\?\;\(\)]*)$/,
    // #4 - Function called at every new keystroke
    search: function(query, callback) {
      lastQuery = query;
      index.search(lastQuery, { hitsPerPage: NB_RESULTS_DISPLAYED, filters:'(type:team OR type:hashtag)' })
        .then(function searchSuccess(content) {
          if (content.query === lastQuery) {
            callback(content.hits);
          }
        })
        .catch(function searchFailure(err) {
          console.error(err);
        });
    },
    index: 1,
    // #5 - Template used to display each result obtained by the Algolia API
    template: function (hit) {
      // Returns the highlighted version of the name attribute
      return  hit._highlightResult.name.value + ' <span class="record-tag">' + hit._highlightResult.tag.value + '</span>';
    },
    // #6 - Template used to display the selected result in the textarea
    replace: function (hit) {
      return hit.tag + ' ';
    }
  }
]);
