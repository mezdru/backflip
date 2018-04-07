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
  var $showMore = $('#show-more');
  var $modalLayer = $('#modal-layer');
  var hashtagsTemplate = Hogan.compile($('#hashtags-template').text());
  var hitsTemplate = Hogan.compile($('#hits-template').text());
  var nooneTemplate = Hogan.compile($('#noone-template').text());

  // Selectize
  var selectizeHashtags = '';
  var $selectize = $searchInput.selectize({
    valueField: 'tag',
    labelField: 'tag',
    loadThrottle: null,
    maxOptions: 3,
    highlight: false,
    plugins: ['remove_button', 'preserve_on_blur', 'soft_clear_options', 'has_item'],
    persist: false,
    create: false,
    openOnFocus: false,
    createOnBlur: false,
    closeAfterSelect: true,
    hideSelected: true,
    load: function(query, callback) {
        world.search({
          query: query,
          attributesToRetrieve: ['type','name', 'tag','picture'],
          restrictSearchableAttributes: ['name', 'tag'],
          hitsPerPage: 3
        },
        function(err, content) {
          if (err) {
            console.error(err);
          }
          if (content.hits && content.hits.length) {
            this.softClearOptions();
          }
          callback(content.hits);
        }.bind(this));
    },
    render: {
        option: function(option) {
            let highlightedName = option._highlightResult ? (option._highlightResult.name.value || option._highlightResult.tag.value) : option.tag;
            let highlightedTag = option._highlightResult ? option._highlightResult.tag.value : option.tag;
            return '<div class="aa-suggestion ' + option.type + '">' +
            '<span class="tag">' +
            highlightedTag +
            '</span>' +
            getPictureHtml(option, true) +
            '<span>' +
            highlightedName +
            '</span>' +
            '</div>';
        },
        item: function(item, escape) {
          if (!item.type) switch (item.tag.charAt(0)) {
            case '@': item.type = 'person'; break;
            case '#': item.type = 'hashtag'; break;
            default: item.type = 'unknown'; break;
          }
          return '<div class="cloud-element ' + item.type + '">' +
              '<span>' +
                escape(item.tag) +
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
  var query, tags, facetFilters, tagFilters, page;

  function search() {
    page = 0;
    query = $selectize.$control_input.val();
    tags = $selectize.$input.val();
    facetFilters = getParameterByName('hashtags') ? [['type:hashtag','type:person']] : ['type:person'];
    tagFilters = '';
    $selectize.items.forEach((item) => {
      if(item.charAt(0) === '#')
        facetFilters.push('hashtags.tag:' + item);
      else if(item.charAt(0) === '@')
        tagFilters = (tagFilters ? tagFilters + ' OR ' : '' ) + 'tag:' + item;
      else {
        query = (query ? query + ',' : '' ) + item;
      }
    });

    searchForHits();
    searchForSuggestions();
  }

  function searchForHits() {
    world.search({
      query: query,
      facetFilters: facetFilters,
      filters: tagFilters,
      hitsPerPage: 10,
      page: page
    }, function(err, content) {
      if (err) throw new Error(err);
      renderHits(content);
    });
  }

  function searchForSuggestions() {
    world.searchForFacetValues({
      facetName: 'hashtags.tag',
      facetQuery: '',
      query: query,
      facetFilters: facetFilters,
      filters: tagFilters,
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
      if ($.inArray(hit.value, $selectize.items) === -1 && hit.count > 1) {
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
    if (content.hits.length === 0) {
      $showMore.css("display", "none");
      return $hits.html(nooneTemplate.render(content));
    }
    content.hits.forEach(hit => transformItem(hit, $selectize.items));
    if (page === 0) {
      $hits.empty();
      window.scrollTo(0,0);
    }
    if (content.nbPages > content.page + 1) $showMore.css("display", "block");
    else $showMore.css("display", "none");
    $hits.append(hitsTemplate.render(content));
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
    toggleIconEmptyInput();
  });
  $showMore.on('click', function (e) {
    page ++;
    searchForHits();
  });
  // HORIZONTAL SCROLLERS
  $(document).on('mousedown', '.scroll-right', goRight);
  $(document).on('mousedown', '.scroll-left', goLeft);

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
