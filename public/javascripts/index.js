/**
* @Author: Clément Dietschy <bedhed>
* @Date:   16-03-2017
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   bedhed
* @Last modified time: 16-03-2017
* @Copyright: Clément Dietschy 2017
*/

/*
/ Lenom MVP JS
/ Copyright Clément Dietschy 2016
/ @todo infinit scroll https://www.algolia.com/doc/guides/search/infinite-scroll
*/

var search = instantsearch({
	appId: 'RSXBUBL0PB',
	apiKey: '81dd855e265e9afa99ca2688e4689ed2',
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
		item.image_path = "assets/thumbs" + item.image_path;
	}
}

search.addWidget(
	instantsearch.widgets.searchBox({
		container: '#search-box',
		placeholder: 'Search',
		wrapInput: false,
		autofocus:false,
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

search.start();
