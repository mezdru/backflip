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

var emptySpeed = 200;
var fillSpeed = 100;

$.fn.emptyFaded = function() {
  this.children().each(function() {
    $(this).fadeOut(emptySpeed, 'linear', function() {
      $(this).remove();
    });
  });
};

$.fn.fillFaded = function($new) {
  var container = this;
  $new.each(function(index) {
    var that = this;
    container.append($(that));
    setTimeout(function() {
      $(that).addClass('show');
    }, emptySpeed+(index+1)*fillSpeed);
  });
};

$(document).ready(function () {

  var ALGOLIA_APPID = 'RSXBUBL0PB';
  var ALGOLIA_SEARCH_APIKEY = algoliaPublicKey.value;
  var algolia = algoliasearch(ALGOLIA_APPID, ALGOLIA_SEARCH_APIKEY);
  var world = algolia.initIndex('world');

  // DOM and Templates binding
  var $searchInput = $('#search input');
  var $searchInputIcon = $('#search-input-icon');
  var $subheader = $('#subheader .pure-g');
  var $hashtags = $('#hashtag-suggestions');
  var $hits = $('#search-results');
  var $showMore = $('#show-more');
  var $modalLayer = $('#modal-layer');
  var $premium = $('#premium');
  var hashtagsTemplate = Hogan.compile($('#hashtags-template').text());
  var hitsTemplate = Hogan.compile($('#hits-template').text());
  var nooneTemplate = Hogan.compile($('#noone-template').text());

  // Global variable
  let currentEmailList = [];

  // Selectize
  var selectizeHashtags = '';
  var $selectize = $searchInput.selectize({
    valueField: 'tag',
    labelField: 'tag',
    loadThrottle: null,
    maxOptions: 5,
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
            var highlightedName = option._highlightResult ? (option._highlightResult.name.value || option._highlightResult.tag.value) : option.tag;
            var highlightedTag = option._highlightResult ? option._highlightResult.tag.value : option.tag;
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
      if($selectize.items.length > 1 && $selectize.items[0].charAt(0) === '@') {
        $selectize.removeItem($selectize.items[0], true);
      }
      toggleIconEmptyInput();
      search();
    },
    onType: function (str) {
      toggleIconEmptyInput();
    },
    onLoad: function (data) {
      if(data.length === 0)
        search();
    },
    onDropdownOpen: function($dropdown) {
      toggleIconEmptyInput();
      $modalLayer.addClass('show');
    },
    onDropdownClose: function($dropdown) {
      $modalLayer.removeClass('show');
      search();
    }
  })[0].selectize;

  // Initial search
  toggleIconEmptyInput();
  search();

  // SEARCH ALL
  // ==========
  var query, tags, facetFilters, hashtagsFilters, tagFilters, page;
  let searchHistoricRequestRunning = false;

  function search() {
    page = 0;
    query = $selectize.$control_input.val();
    tags = $selectize.$input.val();
    if (getParameterByName('hashtags')) {
      facetFilters = ['type:hashtag'];
      if (getParameterByName('hashtags') !== 'all') {
        facetFilters = ['type:hashtag', 'organisation:'+getOrgId()];
      }
    } else {
      facetFilters = ['type:person'];
    }
    hashtagsFilters = [];
    tagFilters = '';
    $selectize.items.forEach(function(item) {
      if(item.charAt(0) === '#')
        hashtagsFilters.push('hashtags.tag:' + item);
      else if(item.charAt(0) === '@')
        tagFilters = (tagFilters ? tagFilters + ' OR ' : '' ) + 'tag:' + item;
      else {
        query = (query ? query + ',' : '' ) + item;
      }
      facetFilters = facetFilters.concat(hashtagsFilters);
    });
    if(tags.length > 0 && !searchHistoricRequestRunning){
      searchHistoricRequestRunning = true;
      $.ajax({
        type: 'POST',
        data: JSON.stringify({tags : tags}),
        contentType: 'application/json',
        url: '/searchHistoric' + window.location.search,						
        success: function(data) {
                        searchHistoricRequestRunning = false;      
                    }
      });
    }

    searchForHits();
    searchForSuggestions();
  }

  function searchForHits() {
    world.search({
      query: query,
      facetFilters: facetFilters,
      filters: tagFilters,
      hitsPerPage: 50,
      page: page,
      attributesToSnippet: [
        "intro:"+introSnippetLength,
        "description:"+introSnippetLength
      ]
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
    currentEmailList = [];
    $showMore.fadeOut(fillSpeed);
    if (content.hits.length === 0) {
      return $hits.html(nooneTemplate.render(content)); 
    }
    content.hits.forEach(function(hit) { 
      transformItem(hit, $selectize.items);
      currentEmailList = addHitEmailsToTab(hit, currentEmailList);
    });
    if (page === 0) {
      $hits.emptyFaded();
      if (canInvite) content.hits.splice(3, 0, {invitation:true});
      window.scrollTo(0,0);
    }
    $hits.fillFaded($(hitsTemplate.render(content)));
    if (content.nbPages > content.page + 1) $showMore.delay(1000).fadeIn(fillSpeed);
  }

  // EVENTS BINDING
  // ==============
  $(document).on('click', '.hashtag', function (e) {
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      window.open(makeUrl(null, 'profile/'+$(this).data('tag')), '_blank');
    } else {
      $selectize.addOption({
        tag: $(this).data('tag'),
        name: $(this).data('name'),
        type: 'hashtag'
      });
      $selectize.addItem($(this).data('tag'), false);
    }
  });
  $searchInputIcon.on('click', function (e) {
    e.preventDefault();
    $selectize.clear(true);
    $selectize.$control_input.val('');
    toggleIconEmptyInput();
    search();
  });
  $showMore.on('click', function (e) {
    page ++;
    searchForHits();
  });
  // HORIZONTAL SCROLLERS
  $(document).on('mousedown', '.scroll-right', goRight);
  $(document).on('mousedown', '.scroll-left', goLeft);

  // Display user's email on click after a search
  $(document).on('click', '#copy-emails-feature-action', function(e){
    $('.copy-emails-feature div').css('display', 'block');
    let emails = $('#copy-emails-feature-popup-text');
    emails.val(createEmailsList(currentEmailList));
    emails.select();
    document.execCommand('copy');
  });
  $(document).on('click','#copy-emails-feature-blackBack', function(e){
    $('.copy-emails-feature div').css('display', 'none');
  });
  $(document).on('click','.premium-btn-children-item-disabled', function(e){
    $('.copy-emails-feature div').css('display', 'block');
  });
  $(document).on('click','#copy-emails-feature-blackBack', function(e){
    $('.copy-emails-feature div').css('display', 'none');
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

  function createEmailsList(emails){
    let text = '';
    emails.forEach(function(email){
      if(text === '')
        text += email
      else
        text += '\r\n'+email;
    });
    return text;
  }
  function addHitEmailsToTab(hit, tab){
    hit.links.forEach(function(link){
      if(link.type === 'email'){
        tab.push(link.value);
      }
    });
    return tab;
  }
});
