/* jshint esversion: 5 */

/*
/ @todo infinit scroll https://www.algolia.com/doc/guides/search/infinite-scroll
/ @todo rename and split file
/ @todo rename item into record
*/

var search = instantsearch({
	appId: 'RSXBUBL0PB',
	apiKey: algoliaPublicKey.value,
	indexName: 'world',
	urlSync: true,
	searchParameters: {
		attributesToSnippet: [
    	"description:"+introSnippetLength,
    	"intro:"+introSnippetLength
		],
		facetFilters: getParameterByName('hashtags') ? [['type:hashtag','type:person']] : ['type:person']
	}
});

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
