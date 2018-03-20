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
  var world = algolia.initIndex('world');

  // DOM and Templates binding
  var $searchInput = $('#search input');
  var $searchInputIcon = $('#search-input-icon');
  var $subheader = $('#subheader');
  var $hashtags = $('#hashtag-suggestions');
  var $hits = $('#search-results');
  var $modalLayer = $('#modal-layer');
  var hashtagsTemplate = Hogan.compile($('#hashtags-template').text());
  var hitsTemplate = Hogan.compile($('#hits-template').text());
  var nooneTemplate = Hogan.compile($('#noone-template').text());

  // Selectize
  var selectizeHashtags = '';
  var $selectize = $searchInput.selectize({
    valueField: 'tag',
    labelField: 'name',
    loadThrottle: null,
    searchField: 'name',
    maxOptions: 5,
    highlight: false,
    plugins: ['remove_button', 'preserve_on_blur', 'soft_clear_options', 'has_item'],
    persist: false,
    create: false,
    addPrecedence: true,
    openOnFocus: false,
    createOnBlur: false,
    closeAfterSelect: true,
    hideSelected: true,
    load: function(query, callback) {
        this.softClearOptions();
        world.search({
          query: query,
          hitsPerPage: 5
        },
        function(err, content) {
          if (err) {
            console.error(err);
          }
          callback(content.hits);
        });
    },
    render: {
        option: function(option) {
            let highlighted = option._highlightResult ? (option._highlightResult.name.value || option._highlightResult.tag.value) : option.tag;
            return '<div class="aa-suggestion">' +
            getHashtagPictureHtml(option) +
            '<span>' +
            highlighted +
            '</span>' +
            '</div>';
        },
        item: function(item, escape) {
          return '<div class="cloud-element ' + item.type + '">' +
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
      toggleIconEmptyInput();
      search();
    },
    onType(str) {
      toggleIconEmptyInput();
    },
    onDropdownOpen($dropdown) {
      toggleIconEmptyInput();
      $modalLayer.addClass('show');
    },
    onDropdownClose($dropdown) {
      $modalLayer.removeClass('show');
      search();
    }
  })[0].selectize;

  // Initial search
  toggleIconEmptyInput();
  search();

  // SEARCH ALL
  // ==========

  function search() {
    var facetKey = 'hashtags';
    var query = $selectize.$control_input.val();
    var tags = $selectize.$input.val();
    var facetFilters = ['type:person'];
    $selectize.items.forEach((item) => {
      if(item.charAt(0) === '#')
        facetFilters.push(facetKey + '.tag:' + item);
      else
        query = query + ',' + item;
    });

    world.search({
      query: query,
      facetFilters: facetFilters,
      hitsPerPage: 30
    }, function(err, content) {
      if (err) throw new Error(err);
      renderHits(content);
  });

    world.searchForFacetValues({
      facetName: facetKey + '.tag',
      facetQuery: '',
      facetFilters: facetFilters,
    }, function(err, content) {
      if (err) throw new Error(err);
      renderHashtags(content.facetHits);
  });
  }

  // RENDER HASHTAGS + RESULTS
  // =========================
  function renderHashtags(hits) {
    availableHits = [];
    for (var i = 0; i < hits.length; ++i) {
      var hit = hits[i];
      if ($.inArray(hit.value, $selectize.items) === -1) {
        availableHits.push(hit);
      }
    }
    if (availableHits.length) {
      $hashtags.html(hashtagsTemplate.render({hashtags: availableHits}));
      $subheader.css("display", "block");
    } else {
      $subheader.css("display", "none");
    }
  }

  function renderHits(content) {
    if (content.hits.length === 0)
      return $hits.html(nooneTemplate.render(content));
    content.hits.forEach(transformItem);
    $hits.html(hitsTemplate.render(content));
  }

  // EVENTS BINDING
  // ==============
  $(document).on('click', '.hashtag', function (e) {
    e.preventDefault();
    $selectize.addOption({
      tag: $(this).data('tag'),
      name: $(this).data('name'),
      type: 'hashtag'
    });
    $selectize.addItem($(this).data('tag'), false);
  });
  $searchInputIcon.on('click', function (e) {
    e.preventDefault();
    $selectize.clear(false);
    $selectize.$control_input.val('');
    search();
    toggleIconEmptyInput();
  });

  // HELPERS
  // =======
  function toggleIconEmptyInput() {
    var query = $selectize.$control_input.val() + $selectize.$input.val();
    if (query.trim() === '') {
      $searchInputIcon.addClass('fa-search');
      $searchInputIcon.removeClass('fa-times');
    } else {
      $searchInputIcon.removeClass('fa-search');
      $searchInputIcon.addClass('fa-times');
    }
  }
});
