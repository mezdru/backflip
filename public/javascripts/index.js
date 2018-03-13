/* jshint esversion: 5 */

/*
/ @todo infinit scroll https://www.algolia.com/doc/guides/search/infinite-scroll
/ @todo rename and split file
/ @todo rename item into record
*/

// The length of the Description Snippet depends on the screen width.
// @todo make it responsive dynamically (or not?)
var introSnippetLength = 6;
var extraLinkLimit = 4;
if (window.matchMedia('(min-width: 720px)').matches) {
		introSnippetLength = 15;
		extraLinkLimit = 9;
}

var search = instantsearch({
	appId: 'RSXBUBL0PB',
	apiKey: algoliaPublicKey.value,
	indexName: 'world',
	urlSync: true,
	searchParameters: {
		facetFilters: getParameterByName('hashtags') ? [['type:hashtag','type:person']] : ['type:person']
	}
});

transformItem = function (item) {
	transformImagePath(item);
	transformHashtags(item);
	transformIntro(item);
	transformLinks(item);
	addUrl(item);
	return item;
};

function transformImagePath(item) {
	item.picture = {url: getPictureUrl(item)};
}

function transformIntro(item) {
	if (item._snippetResult && item._snippetResult.intro && item._snippetResult.intro.value) item._snippetResult.intro.value = transformString(item._snippetResult.intro.value, item.hashtags);
	else if (item._snippetResult && item._snippetResult.description && item._snippetResult.description.value ) item._snippetResult.intro = {value: transformString(item._snippetResult.description.value, item.hashtags)};
}

function transformString(input, hashtags) {
		// Does not match person (@) yet
		var regex = /([#][^\s@#\,\.\!\?\;\(\)]+)/g;
		input = input.replace(regex, function(match, offset, string) {
			var cleanMatch = match.replace(/<\/?em>/g, '');
			record = getRecord(cleanMatch, hashtags);
			return '<a title="' + record.name + '" class="link-' + record.type + '" onclick="setSearch(\'' + ( record.type == 'team' ? '' : cleanMatch ) + '\', \'' + ( record.type == 'team' ? cleanMatch : '' ) + '\')">' + match + '</a>';
		});
		return input;
}

function getRecord(tag, hashtags) {
	record = hashtags.find(function (record) { return record.tag == tag; });
	if (!record) return {tag: tag, name: tag, type: 'hashtag'};
	return record;
}

// @todo find somewhere to put & deduplicate the transformLinks (public/js/index.js + views/hbs.js) logic.
function transformLinks(item) {
	item.links = item.links || [];
	item.links.forEach(function (link, index, array) {
		makeLinkDisplay(link);
		makeLinkIcon(link);
		makeLinkUrl(link);
		if (index > extraLinkLimit-1) link.class = 'extraLink';
	});
}

function makeLinkIcon(link) {
	switch (link.type) {
		case 'email':
			link.icon = 'envelope-o';
			break;
		case 'address':
			link.icon = 'map-marker';
			break;
		case 'hyperlink':
			link.icon = 'link';
			break;
		default:
			link.icon = link.type;
			break;
	}
}

function makeLinkDisplay(link) {
	link.display = link.display || link.value;
}

function makeLinkUrl(link) {
	link.url = link.url || link.uri;
	if (!link.url) {
		switch (link.type) {
			case 'email':
				link.url = 'mailto:'+link.value;
				break;
			case 'phone':
				link.url = 'tel:'+link.value;
				break;
			case 'home':
				link.url = 'tel:'+link.value;
				break;
			case 'address':
				link.url = 'http://maps.google.com/?q='+encodeURIComponent(link.value);
				break;
			default:
				link.url = link.value;
				break;
		}
	}
}

function addUrl(item) {
	var path = 'id/'+item.objectID+'/';
	item.url = makeUrl(null, path);
}

transformHashtags = function(item) {
	if (!item.hashtags) item.hashtags = [];
	if (!item.within) item.within = [];
	item.hashtags = item.hashtags.concat(item.within);
	makeHightlighted(item);
	item.hashtags.forEach(function(item) {
		transformImagePath(item);
	});
};

makeHightlighted = function(item) {
	if (!item._highlightResult.hashtags) item._highlightResult.hashtags = [];
	if (!item._highlightResult.within) item._highlightResult.within = [];
	item._highlightResult.hashtags = item._highlightResult.hashtags.concat(item._highlightResult.within);
	item._highlightResult.hashtags.forEach(function(hashtag, index) {
		if (hashtag.tag && hashtag.tag.fullyHighlighted) item.hashtags[index].class = 'highlighted';
	});
};

search.addWidget(
	instantsearch.widgets.searchBox({
		container: '#search',
		placeholder: searchPlaceholder,
		wrapInput: false,
		autofocus: false,
    reset: false,
		magnifier: false,
    loadingIndicator: false,
		cssClasses: {
			input: 'search-input'
		}
    })
);

search.addWidget(
  instantsearch.widgets.infiniteHits({
    container: '#search-results',
    hitsPerPage: 30,
		cssClasses: {
			item: 'pure-g-box'
		},
    templates: {
      item: getTemplate('hit'),
      empty: getTemplate('noone')
    },
    transformData: transformItem,
		showMoreLabel: hitsShowMore
  })
);

search.addWidget(
  instantsearch.widgets.analytics({
    pushFunction: function(formattedParameters, state, results) {
      window.ga('set', 'page', '/search/query/?query=' + state.query + '&' + formattedParameters + '&numberOfHits=' + results.nbHits);
      window.ga('send', 'pageView');
		}
	})
);

function setSearch(query) {
	search.helper.clearRefinements().setQuery(query);
	search.helper.search();
	window.scrollTo(0,0);
}

function refresh() {
  window.location.reload(true);
}

search.start();

// We force refresh every 1 hour to get new api key & get updates
window.setTimeout(refresh , 3600000);
