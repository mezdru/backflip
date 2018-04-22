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

Selectize.define('create_on_enter', function () {
    if (this.settings.mode !== 'multi')
        return;
    var self = this;
    this.onKeyUp = (function (e) {
        var original = self.onKeyUp;
        return function (e) {
            if (e.keyCode === 13 && this.$control_input.val().trim() !== '') {
                self.createItem(this.$control_input.val());
            }
            return original.apply(this, arguments);
        };
    })();
});


$(document).ready(function () {

  var ALGOLIA_APPID = 'RSXBUBL0PB';
  var ALGOLIA_SEARCH_APIKEY = algoliaPublicKey.value;
  var algolia = algoliasearch(ALGOLIA_APPID, ALGOLIA_SEARCH_APIKEY);
  var world = algolia.initIndex('world');

  // DOM and Templates binding
  var $searchInput = $('#search input');
  var $hashtags = $('#hashtag-suggestions');
  var $modalLayer = $('#modal-layer');
  var hashtagsTemplate = Hogan.compile($('#hashtags-template').text());

  // Selectize
  var selectizeHashtags = '';
  var $selectize = $searchInput.selectize({
    valueField: 'tag',
    labelField: 'tag',
    loadThrottle: null,
    maxOptions: 5,
    highlight: false,
    plugins: ['drag_drop', 'remove_button', 'soft_clear_options', 'has_item', 'create_on_enter'],
    persist: false,
    create: function(input) {
      if(input.charAt(0) !== '#') input = '#' + input;
      return {
        'value':input,
        'tag':input,
        'name':input.replace('#',''),
        type:'hashtag',
        $score:1
      };
    },
    openOnFocus: false,
    createOnBlur: true,
    closeAfterSelect: true,
    hideSelected: true,
    load: function(query, callback) {
        world.search({
          query: query,
          attributesToRetrieve: ['type','name', 'tag','picture'],
          restrictSearchableAttributes: ['name', 'tag'],
          facetFilters: ['type:hashtag'],
          hitsPerPage: 5
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
            getPictureHtml(option) +
            '<span>' +
            highlightedName +
            '</span>' +
            '</div>';
        },
        item: function(item, escape) {
          return '<div class="cloud-element hashtag">' +
              '<span>' +
                escape(item.tag) +
              '</span>' +
            '</div>';
        },
        option_create: function(data) {
          if (data.input.charAt(0) !== '#') data.input = '#' + data.input;
          return '<div class="aa-suggestion create-hashtag">' +
          '<span class="tag"><em>' +
          data.input +
          '</em></span>' +
          '<span>' +
          newHashtagSentence +
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
      search();
    },
    onDropdownOpen($dropdown) {
      $modalLayer.addClass('show');
    },
    onDropdownClose($dropdown) {
      $modalLayer.removeClass('show');
    }
  })[0].selectize;

  // Initial search
  search();

  // SEARCH ALL
  // ==========
  var query, facetFilters, page;

  function search() {
    page = 0;
    query = $selectize.$control_input.val();
    facetFilters = [[],'type:hashtag'];
    $selectize.items.forEach((item) => {
      facetFilters[0].push('hashtags.tag:' + item);
    });
    searchForSuggestions();
  }

  function searchForSuggestions() {
    world.searchForFacetValues({
      facetName: 'hashtags.tag',
      facetQuery: '',
      query: query,
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
      if ($.inArray(hit.value, $selectize.items) === -1 && hit.count > 1) {
        availableHits.push(hit);
      }
    }
    if (availableHits.length) {
      $hashtags.html(hashtagsTemplate.render({hashtags: availableHits}));
    }
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
  $selectize.$control_input.keydown(function(event){
    if(event.keyCode == 13) {
      event.preventDefault();
      return false;
    }
  });
  // HORIZONTAL SCROLLERS
  $(document).on('mousedown', '.scroll-right', goRight);
  $(document).on('mousedown', '.scroll-left', goLeft);

});
