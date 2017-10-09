/**
* @Author: Clément Dietschy <bedhed>
* @Date:   10-12-2016
* @Email:  clement@lenom.io
* @Project: Lenom - Backflip
 * @Last modified by:   clement
 * @Last modified time: 30-06-2017 01:08
* @Copyright: Clément Dietschy 2017
*/

/* jshint esversion: 5 */

/*
/ @todo infinit scroll https://www.algolia.com/doc/guides/search/infinite-scroll
/ @todo rename and split file
/ @todo rename item into record
*/

// The length of the Description Snippet depends on the screen width.
// @todo make it responsive dynamically (or not?)
var descriptionSnippetLength = 8;
var extraLinkLimit = 4;
if (window.matchMedia('(min-width: 720px)').matches) {
		descriptionSnippetLength = 24;
		extraLinkLimit = 8;
}

var search = instantsearch({
	appId: 'RSXBUBL0PB',
	apiKey: algoliaPublicKey.value,
	indexName: 'world',
	urlSync: true,
	searchParameters: {
		attributesToSnippet: [
    	"description:"+descriptionSnippetLength
  	],
		disjunctiveFacetsRefinements: {
			type: ['person']
		}
	}
});

transformItem = function (item) {
	transformImagePath(item);
	transformDescriptions(item);
	transformLinks(item);
	transformHighlightedTag(item);
	addType(item);
	addEditUrl(item);
	addDeleteUrl(item);
	addParentTag(item);
	return item;
};

function addParentTag(item) {
	if (item.type == 'team') item.parentTag = item.tag;
	else if (item.within) {
		var parent = item.within.find(function(within) {
			return within.type=='team' && within.tag != item.tag;
		});
		if (parent) item.parentTag = parent.tag;
	}
}

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
			case 'team' : transformIncludes(item); item.picture = { url: "/images/placeholder_team.png"}; break;
			case 'hashtag' : item.picture = { url: "/images/placeholder_hashtag.png"}; break;
			default: case 'person' : item.picture = { url: "/images/placeholder_person.png"}; break;
		}
	}
}

//@todo handle the display of teams
function transformIncludes(item) {
	if (item.type != 'team' || !item.includes || !item.includes.length || !item.includes_count) return;
	item.mozaic = true;
	if (item.includes_count.person > 8) {
		item.mozaic_more = item.includes_count.person + item.includes_count.team + item.includes_count.hashtag - 7;
		item.includes = item.includes.slice(0,7);
	}
	item.includes.forEach(function(item) {
		 transformImagePath(item);
	});
}

function transformDescriptions(item) {
	if (item._snippetResult) item._snippetResult.description.value = transformString(item._snippetResult.description.value, item.within);
	if (item._highlightResult) item._highlightResult.description.value = transformString(item._highlightResult.description.value, item.within);
}

function transformString(input, within) {
		var regex = /([@#][\w-<>\/]+)/g;
		input = input.replace(regex, function(match, offset, string) {
			var cleanMatch = match.replace(/<\/?em>/g, '');
			record = getRecord(cleanMatch, within);
			return '<a title="' + record.name + '" class="link-' + record.type + '" onclick="setSearch(\'' + ( record.type == 'team' ? '' : cleanMatch ) + '\', \'' + ( record.type == 'team' ? cleanMatch : '' ) + '\')">' + match + '</a>';
		});
		return input.replace(/(?:\r\n|\r|\n)/g, '<br />');
}

function getRecord(tag, within) {
	record = within.find(function (record) { return record.tag == tag; });
	if (!record) return {tag: tag, name: tag, type: 'hashtag'};
	return record;
}

function getTitle(tag, within) {
		if (!within) return tag;
		record = within.find(function(record) { return record.tag == tag; });
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


function transformHighlightedTag(item) {
	if (item.type == 'person') {
		item._highlightResult.tag.value = item._highlightResult.tag.value.replace('@','<i class="fa fa-user-circle-o" aria-hidden="true"></i>');
	}
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

function addEditUrl(item) {
	if (isMyOrg && (item.type != 'person' || isAdmin || myRecordId == item.objectID)) {
		item.editUrl = makeUrl(null, 'edit/id/' + item.objectID);
	}
}

function addDeleteUrl(item) {
	if (isAdmin) {
		item.deleteUrl = makeUrl(null, 'admin/record/delete/' + item.objectID);
	}
}

function addType(item) {
	item[item.type] = true;
}

transformTypeItem = function(item) {
	var icon = 'fa-at';
	switch (item.name) {
		case 'person': icon = 'fa-user-circle-o'; break;
		case 'hashtag': icon = 'fa-hashtag'; break;
	}
	item.highlighted = '<i class="fa ' + icon + '" aria-hidden="true"></i><span class="toggle-text">' + item.highlighted + 's</span>';
	return item;
};

search.addWidget(
	instantsearch.widgets.searchBox({
		container: '#search',
		placeholder: 'Search by Name, @Team, #skill...',
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
    hitsPerPage: 30,
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
      header: '<i class="fa fa-tree" aria-hidden="true"></i> Organisation Tree'
    }
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
      header: '<i class="fa fa-chevron-down" aria-hidden="true"></i> More filters',
      noResults: 'No result'
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
  instantsearch.widgets.analytics({
    pushFunction: function(formattedParameters, state, results) {
      window.ga('set', 'page', '/search/query/?query=' + state.query + '&' + formattedParameters + '&numberOfHits=' + results.nbHits);
      window.ga('send', 'pageView');
		}
	})
);

var customClearAllWidget = {
    init: function(args) {
        var helper = args.helper;
        document.getElementById('clear-search').addEventListener('click', function() {
            helper.setQuery('').clearRefinements().search();
						window.scrollTo(0,0);
        });
    },
    render:function(args){
        var helper = args.helper;
        var state = helper.getState();
        //Check refined facets and query. If we dont't have any, hide widget.
        if(state.getRefinedDisjunctiveFacets()==='' && state.getQueryParameter('query')===''){
            document.getElementById('clear-search').style.display = 'none';
            return false;
        }
        document.getElementById('clear-search').style.display = '';
    }
};
search.addWidget(customClearAllWidget);

function setSearch(query, parent, filter) {
	if (query == parent) query = '';
	search.helper.clearRefinements().setQuery(query);

	if (filter) search.helper.toggleRefinement('type', filter);

	if (parent) setHierarchicalRefinement(query, parent);

	search.helper.search();
	window.scrollTo(0,0);
}

function setHierarchicalRefinement(query, parent) {
	var branch = orgTree.find(function(branch) { return branch[branch.length-1] == parent; });
	if (branch) search.helper.toggleRefinement('structure.0', branchToString(branch));
	search.helper.setQuery(parent + ' ' + query);
}

function branchToString(branch) {
	return branch.reduce(function(acc, tag, index, branch) {
		if (index === branch.length-1) return acc + tag;
		return acc + tag + ' > ';
	}, '');
}

function refresh() {
  window.location.reload(true);
}

search.start();

// We force refresh every 1 hour to get new api key & get updates
window.setTimeout(refresh , 3600000);
