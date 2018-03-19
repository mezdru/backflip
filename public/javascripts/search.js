Selectize.define( 'preserve_on_blur', function( options ) {
    var self = this;

    options.text = options.text || function(option) {
        return option[this.settings.labelField];
    };

    this.onBlur = ( function( e ) {
        var original = self.onBlur;

        return function( e ) {
            // Capture the current input value
            var $input = this.$control_input;
            var inputValue = $input.val();

            // Do the default actions
            original.apply( this, e );

            // Set the value back
            this.setTextboxValue( inputValue );
        };
    } )();
} );

Selectize.define( 'soft_clear_options', function( options ) {
    var self = this;

    this.softClearOptions = ( function() {
        var original = self.onBlur;

        return function( e ) {
            // Capture the current input value
            var $input = this.$control_input;
            var inputValue = $input.val();

            // Do the default actions
            original.apply( this, e );

            // Set the value back
            this.setTextboxValue( inputValue );
        };
    } )();
} );

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
    valueField: 'tag',
    labelField: 'name',
    searchField: 'name',
    maxOptions: 3,
    highlight: false,
    plugins: ['remove_button', 'preserve_on_blur'],
    persist: false,
    create: true,
    openOnFocus: false,
    createOnBlur: false,
    closeAfterSelect: true,
    hideSelected: true,
    onBlur: function () {
      toggleIconEmptyInput();
    },
    load: function(query, callback) {
        clearOptions();
        algolia.search([{
          indexName: 'world',
          query: query,
          params: {
            hitsPerPage: 3
          }
        }],
        function(err, content) {
          if (err) {
            console.error(err);
          }
          callback(content.results[0].hits);
        });
    },
    render: {
        option: function(item, escape) {
            return '<div class="aa-suggestion">' +
            getHashtagPictureHtml(item) +
            '<span>' +
            escape(item.name || item.tag) +
            '</span>' +
            '</div>';
        }
    },
    onChange: function (value) {
      selectizeHashtags = value;
      search();
    },
    onOptionAdd: function(value, data) {
      //console.log(value);
    },
    onItemAdd(value, $item) {
      //console.log(value);
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
        query: '',
        params: {
          facetFilters: 'type:hashtag',
          hitsPerPage: 5
        }
      },
      {
        indexName: 'world',
        query: query + ' ' + tags,
        params: {
          facetFilters: 'type:person',
          hitsPerPage: 30
        }
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
    content.hits.forEach(transformItem);
    $hits.html(hitsTemplate.render(content));
  }

  function clearOptions() {
    $selectize.options.forEach(function(option) {
      if ($selectize.items.hasOwnProperty())
    });
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
