/**
* @Author: Clément Dietschy <bedhed>
* @Date:   10-12-2016
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 17-03-2017
* @Copyright: Clément Dietschy 2017
*/

/*
/ @todo infinit scroll https://www.algolia.com/doc/guides/search/infinite-scroll
*/

var search = instantsearch({
	appId: 'RSXBUBL0PB',
	apiKey: algoliaPublicKey.value,
	indexName: 'world',
	urlSync: true
});

transformAllItems = function(result) {
	for (let key in result.hits) {
		transformItem(result.hits[key]);
	}
	return result;
};

transformItem = function (item) {
	item.anniversary = new Date(item.anniversary).toLocaleDateString();
	transformImagePath(item);
	transformDescription(item);

	return item;
};

function transformImagePath(item) {
	if (!item.image_path) {
		item.image_path = "assets/placeholder.png";
		item.type += " invisible";
	} else if (item.type == 'person') {
		item.image_path = "https://image.tmdb.org/t/p/w185" + item.image_path;
	} else if (item.type == 'team') {
		item.image_path = "images" + item.image_path;
	}
}

search.addWidget(
	instantsearch.widgets.searchBox({
		container: '#search-box',
		placeholder: 'Search',
		wrapInput: false,
		autofocus: false,
		cssClasses: {
			input: 'search-input'
		}
    })
);

search.addWidget(
  instantsearch.widgets.hits({
    container: '#search-results',
    hitsPerPage: 16,
    templates: {
      allItems: getTemplate('hit'),
      empty: getTemplate('noone')
    },
    transformData: {
          allItems: transformAllItems
		}
  })
);

search.addWidget(
  instantsearch.widgets.pagination({
    container: '#pagination-container',
    maxPages: 20,
    // default is to scroll to 'body', here we disable this behavior
		showFirstLast: false,
  })
);



function getTemplate(templateName) {
  return document.getElementById(templateName + '-template').innerHTML;
}

function refresh() {
  window.location.reload(true);
}

search.start();

// We force refresh every 6 hours to get new api key & get updates
window.setTimeout(refresh , 21600000);
