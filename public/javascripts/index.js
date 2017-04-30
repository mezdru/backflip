/**
* @Author: Clément Dietschy <bedhed>
* @Date:   10-12-2016
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
* @Last modified by:   clement
* @Last modified time: 06-04-2017 01:48
* @Copyright: Clément Dietschy 2017
*/

/*
/ @todo infinit scroll https://www.algolia.com/doc/guides/search/infinite-scroll
/ @todo rename and split file
/ @todo rename item into record
*/

// The length of the Description Snippet depends on the screen width.
// @todo make it responsive dynamically (or not?)
var descriptionSnippetLength = 8;
var extraLinkLimit = 5;
if (window.matchMedia('(min-width: 720px)').matches) {
		descriptionSnippetLength = 28;
		extraLinkLimit = 10;
}

var search = instantsearch({
	appId: 'RSXBUBL0PB',
	apiKey: algoliaPublicKey.value,
	indexName: 'world',
	urlSync: true,
	searchParameters: {
		attributesToSnippet: [
    	"description:"+descriptionSnippetLength
  	]
	}
});

transformItem = function (item) {
	transformImagePath(item);
	transformDescriptions(item);
	transformLinks(item);
	addCanEdit(item);
	addCanDelete(item);
	return item;
};

function transformImagePath(item) {
	if (item.picture && item.picture.url) {
			item.picture.url = item.picture.url;
	} else if (item.picture && item.picture.path) {
		item.picture.url = "/images" + item.picture.path;
		//@todo remove this last if once the refacto URI > URL is done
	} else if (item.picture && item.picture.uri) {
		item.picture.url = item.picture.uri;
	} else {
		switch (item.type) {
			case 'team' : item.picture = { url: "/images/placeholder_team.png"}; break;
			case 'hashtag' : item.picture = { url: "/images/placeholder_hashtag.png"}; break;
			default: case 'person' : item.picture = { url: "/images/placeholder_person.png"}; break;
		}
	}
}

function transformDescriptions(item) {
	if (item._snippetResult) item._snippetResult.description.value = transformString(item._snippetResult.description.value, item.within);
	if (item._highlightResult) item._highlightResult.description.value = transformString(item._highlightResult.description.value, item.within);
}

function transformString(input, within) {
		var regex = /([@#][\w-<>\/]+)/g;
		return input.replace(regex, function(match, offset, string) {
			var cleanMatch = match.replace(/<\/?em>/g, '');
			return `<a title="${getTitle(cleanMatch, within)}" onclick="setSearch('${cleanMatch}')">${match}</a>`;
		});
}

function getTitle(tag, within) {
		if (!within) return tag;
		record = within.find(record => record.tag == tag);
		if (!record) return tag;
		return record.name;
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

function addCanEdit(item) {
	if (isMyOrg && (item.type != 'person' || isAdmin || myRecordId == item.objectID)) {
		item.canEdit = true;
	}
}

function addCanDelete(item) {
	if (isAdmin) {
		item.canDelete = true;
	}
}

transformStructureItem = function (item) {
	item.count --;
	return item;
};

transformTypeItem = function(item) {
	let icon = 'fa-at';
	switch (item.name) {
		case 'person': icon = 'fa-user-circle-o'; break;
		case 'hashtag': icon = 'fa-hashtag'; break;
	}
	item.highlighted = `<i class="fa ${icon}" aria-hidden="true"></i><span class="toggle-text">${item.highlighted}s</span>`;
	return item;
};

search.addWidget(
	instantsearch.widgets.searchBox({
		container: '#search',
		placeholder: 'Search for Persons, @Teams, #hashtags...',
		wrapInput: false,
		autofocus: false,
		cssClasses: {
			input: 'search-input'
		}
    })
);

search.addWidget(
  instantsearch.widgets.infiniteHits({
    container: '#search-results',
    hitsPerPage: 50,
    templates: {
      item: getTemplate('hit'),
      empty: getTemplate('noone')
    },
    transformData: transformItem
  })
);

search.addWidget(
  instantsearch.widgets.hierarchicalMenu({
    container: '#structure',
    attributes: ['structure.0', 'structure.1', 'structure.2'],
		//sortBy: ['count', 'name:asc'],
    templates: {
      header: 'Teams'
    },
		transformData: transformStructureItem
  })
);

search.addWidget(
  instantsearch.widgets.refinementList({
    container: '#within',
    attributeName: 'within.tag',
    operator: 'and',
    limit: 5,
		searchForFacetValues: {
			placeholder: 'Search',
		},
		templates: {
      header: '<i class="fa fa-chevron-down" aria-hidden="true"></i> More filters'
    },
		collapsible: {
			collapsed: true
		}
  })
);

search.addWidget(
  instantsearch.widgets.refinementList({
    container: '#types',
    attributeName: 'type',
    operator: 'or',
    limit: 4,
		transformData: transformTypeItem
  })
);

search.addWidget(
  instantsearch.widgets.clearAll({
    container: '#clear-all',
    templates: {
      link: 'Reset Search'
    }
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
	search.helper.setQuery(query).search();
	window.scrollTo(0,0);
}

function refresh() {
  window.location.reload(true);
}

search.start();

// We force refresh every 6 hours to get new api key & get updates
window.setTimeout(refresh , 21600000);
