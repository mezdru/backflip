/*
/ lenom MVP JS
/ Copyright Clément Dietschy 2016
*/

function transformDescription(item) {

	// Building an equivalence table
	// substr = @tag to replace
	// replaceBy = the html to replace with
	item.equivalence = [];
	for (let key in item.within) {
		item.equivalence.push({'substr': '@'+item.within[key].short_name, 'replaceBy': makeReplacement(key, item)});
	}

	description = item._highlightResult.description.value

	//Cleaning the highlights <em> <\em>
	description = description.replace(new RegExp(/@[\w<>\/]*/gi), replacer);

	//Wrapping the long version with span
	let lastChar = description.length-1;
	let position = Math.min(lastChar, 50);
	position = description.indexOf(' ', position);
	description = [description.slice(0, position), '<span class="desc-long">', description.slice(position), '</span>'].join('');

	// Going through the equivalence table and replacing all occurences in the Highlighted description
	for (let key in item.equivalence) {
		description = description.replace(item.equivalence[key].substr, item.equivalence[key].replaceBy);
	}

	item._highlightResult.description.value = description;
}

function makeReplacement(key, item) {
		let cssClass = "team";
		if (item._highlightResult.within[key].short_name.fullyHighlighted == true) {
			cssClass += " highlight";
		}
		return `<a href="index.html?q=@${item.within[key].short_name}" class="${cssClass}">${item._highlightResult.within[key].name.value}</a>`;
}

function replacer(match) {
	return match.replace(new RegExp(/<\/?em>/gi), '');
}
