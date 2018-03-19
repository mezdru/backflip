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

Selectize.define( 'has_item', function( options ) {
    var self = this;

    this.hasItem = ( function(value) {

        return function(value) {
          for (var i = 0; i < self.items.length; i++) {
            if (self.items[i] === value) return true;
          }
          return false;
      };
    } )();
} );

Selectize.define( 'soft_clear_options', function( options ) {
    this.softClearOptions = ( function() {
        return function() {
          for (var value in this.options) {
            if (!this.hasItem(value)) this.removeOption(value, true);
          }
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
    plugins: ['remove_button', 'preserve_on_blur', 'soft_clear_options', 'has_item'],
    persist: false,
    create: false,
    openOnFocus: false,
    createOnBlur: false,
    closeAfterSelect: true,
    hideSelected: true,
    onBlur: function () {
      toggleIconEmptyInput();
    },
    load: function(query, callback) {
        this.softClearOptions();
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
        option: function(option, escape) {
            return '<div class="aa-suggestion">' +
            getHashtagPictureHtml(option) +
            '<span>' +
            escape(option.name || option.tag) +
            '</span>' +
            '</div>';
        },
        item: function(item, escape) {
          console.log(item);
          return '<div class="cloud-element hashtag">' +
              '<span>' +
                escape(item.name || item.tag) +
              '</span>' +
            '</div>';
        }
    },
    score: function() {
      return function() {
        return 1;
      };
    },
    onChange: function (value) {
      selectizeHashtags = value;
      toggleIconEmptyInput();
      search();
    },
    onType(str) {
      console.log('here');
      toggleIconEmptyInput();
      search();
    }
  })[0].selectize;

  // Initial search
  search();

  // SEARCH ALL
  // ==========

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

  // EVENTS BINDING
  // ==============
  $selectize.$control_input.on('keyup', function () {
    toggleIconEmptyInput();
    search();
  });
  $(document).on('click', '.hashtag', function (e) {
    e.preventDefault();
    $selectize.addOption({
      tag: $(this).data('tag'),
      name: $(this).data('name'),
    });
    $selectize.addItem($(this).data('tag'), false);
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
