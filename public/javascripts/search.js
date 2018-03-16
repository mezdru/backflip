/* global $, Hogan, algoliasearch */

$(document).ready(function () {

  var ALGOLIA_APPID = 'RSXBUBL0PB';
  var ALGOLIA_SEARCH_APIKEY = algoliaPublicKey.value;
  var algolia = algoliasearch(ALGOLIA_APPID, ALGOLIA_SEARCH_APIKEY);

  // DOM and Templates binding
  var $searchInput = $('#search input');
  var $searchInputIcon = $('#search-input-icon');
  var $hashtags = $('#hashtags');
  var $hits = $('#search-results');
  var hashtagsTemplate = Hogan.compile($('#hashtags-template').text());
  var hitsTemplate = Hogan.compile($('#hits-template').text());

  // Selectize
  var selectizeHashtags = '';
  var $selectize = $searchInput.selectize({
    plugins: ['remove_button'],
    choices: null,
    delimiter: ',',
    persist: false,
    create: true,
    onBlur: function () {
      toggleIconEmptyInput();
    },
    onChange: function (value) {
      selectizeHashtags = value;
      search();
    }
  })[0].selectize;

  // Initial search
  search();

  // SEARCH ALL
  // ==========
  $selectize.$control_input.on('keyup', function () {
    toggleIconEmptyInput();
    search();
  });
  function search() {
    var query = $selectize.$control_input.val();
    var tags = selectizeHashtags;

    var queries = [
      {
        indexName: 'world',
        query: query,
        params: {
          facetFilters: 'type:hashtag'
        }
      },
      {
        indexName: 'world',
        query: query + ' ' + tags,
        params: {
          facetFilters: 'type:person'
        },
        transformData: transformItem
      }
    ];
    algolia.search(queries, searchCallback);
  }

  // RENDER HASHTAGS + RESULTS
  // =========================
  function searchCallback(err, content) {
    if (err) {
      throw new Error(err);
    }

    renderHashtags(content.results[0].hits);
    renderHits(content.results[1]);
  }

  function renderHashtags(hits) {
    var uniqueTags = selectizeHashtags.split(',');
    var values = [];
    var i;
    // Hits of dribbble_tags index
    for (i = 0; i < hits.length; ++i) {
      var hit = hits[i];
      if ($.inArray(hit.name, uniqueTags) === -1) {
        values.push({name: hit.name, tag: hit.tag});
        uniqueTags.push(hit.name);
      }
    }
    $hashtags.html(hashtagsTemplate.render({values: values.slice(0, 20)}));
  }

  function renderHits(content) {
    console.log(content.hits[0]);
    content.hits.forEach(transformItem);
    $hits.html(hitsTemplate.render(content));
  }

  // EVENTS BINDING
  // ==============
  $(document).on('click', '.hashtag', function (e) {
    e.preventDefault();
    $selectize.createItem($(this).data('value'), function () {});
    search();
  });
  $searchInputIcon.on('click', function (e) {
    e.preventDefault();
    $selectize.clear(false);
    $searchInput.val('').keyup().focus();
  });

  // HELPERS
  // =======
  function toggleIconEmptyInput() {
    var query = $selectize.$control_input.val() + selectizeHashtags;
    $searchInputIcon.toggleClass('empty', query.trim() !== '');
  }
});
