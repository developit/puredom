/**	@namespace CSS selector engine internals.
 *	@name puredom.selectorEngine
 */
(function(puredom) {
	/**	@exports exports as puredom.selectorEngine */
	var exports = {
			enableSelectorStats : false
		},
		cache = {},
		cacheEnabled = false,
		nodeNameReg = /^((?:[a-z][a-z0-9\_\-]*)|\*)?/gi,
		removePaddingReg = /^\s*(.*?)\s*$/gm,
		removeCommaPaddingReg = /\s*?\,\s*?/gm,
		selectors;

	/** CSS selectors implemented as filters
	*		@tests:
	*			// Should set all checkboxes to "checked" that are descendants of fieldsets having the given className:
	*		puredom('fieldset[class~=inputtype_checkbox]>input').value(true);
	*			// Should enable in-query logging via a :log() pseudo-class:
	*		puredom.selectorEngine.addSelectorFilter(/^\:log\(\)/gim, function(m,n,c){console.log(n);});
	*			// Usage for the above, should show resultSet after filtering to labels, before filtering to spans descendants:
	*		puredom('label:log() > span');
	*	@ignore
	*/
	selectors = [
		/** #id
		*	@ignore
		*/
		{
			title : 'ID selector {#id}',
			//regex : /^\#([^#.:\[<>\{+\|\s]*)/gim,
			regex : /^#[_a-zA-Z0-9-]*/gm,
			/**	@ignore */
			filter : function(matches, results, config) {
				var b = (config.searchBaseNode && config.searchBaseNode.getElementById) ? config.searchBaseNode : document;
				return [b.getElementById(matches[0].substring(1))];
			}
		},

		/** .class
		*	@ignore
		*/
		{
			title : 'Class selector {.className}',
			regex : /^\.([^#.:\[<>\{+\|\s]+)/gim,
			/**	@ignore */
			filter : function(matches, results, config) {
				var i, className,
					klass = ' '+matches[1]+' ';
				for (i=results.length; i--; ) {
					className = results[i] && results[i].className;
					if (!className || (' ' + className + ' ').indexOf(klass)===-1) {
						results.splice(i, 1);
					}
				}
			}
		},

		/** Attribute selectors
		*	[a=b]		absolute attribute match
		*	[a^=b]		left() match
		*	[a$=b]		right() match
		*	[a~=b]		inner match
		*	@ignore
		*/
		{
			title : 'Attribute selector {[name=value] & variants}',
			regex : /^\[([^\^\$\~=]+)(?:([\^\$\~=]+)(['"]?)([^\]]*))?\3\]/g,
			/**	@ignore */
			filter : function(rawMatches, results, config) {
				var i, matches, isMatch, attrValue, pos;
				if (rawMatches && rawMatches[1]) {
					matches = {
						attribute : rawMatches[1]
					};
					if (rawMatches[2] && rawMatches[4]) {
						matches.type = rawMatches[2];
						matches.attrValue = rawMatches[4] || '';
					}
					for (i=results.length; i--; ) {
						isMatch = false;
						if (matches.attribute==='checked') {
							if (matches.attrValue==='true' || matches.attrValue==='false') {
								attrValue = results[i].checked?'true':'false';
							}
							else {
								attrValue = results[i].checked?'checked':null;
							}
						}
						else if (matches.attribute==='selected') {
							if (matches.attrValue==='true' || matches.attrValue==='false') {
								attrValue = results[i].selected?'true':'false';
							}
							else {
								attrValue = results[i].selected?'selected':null;
							}
						}
						else {
							attrValue = results[i] && results[i].getAttribute(matches.attribute+'');
						}
						matches.attrPresent = puredom.typeOf(attrValue)==='string';
						matches.attrSet = attrValue && attrValue.length>0;
						if (matches.attrValue) {
							pos = matches.attrPresent ? attrValue.indexOf(matches.attrValue) : -1;
						}
						switch (matches.type || '') {
							case '=':
								isMatch = attrValue===matches.attrValue;
								break;
							case '^=':
								isMatch = pos===0;
								break;
							case '$=':
								isMatch = matches.attrSet && attrValue.substring(attrValue.length-matches.attrValue.length)===matches.attrValue;
								break;
							case '~=':
								isMatch = pos>-1;
								break;
							default:
								isMatch = !matches.attrValue && matches.attrPresent;
						}

						// remove from the result set if not a match:
						if (!isMatch) {
							results.splice(i, 1);
						}
					}
				}
			}
		},

		/** > Descendant selector
		*	@tests:
		*			// Should return <head> and <body>:
		*		puredom.el(' > ');
		*			// Should log DIV > A a number of times, but nothing else:
		*		puredom.el('div > a').each(function(e){console.log(e.parent().prop('nodeName') + ' > ' + e.prop('nodeName'));});
		*			// Should log DIV > XXXXX:
		*		puredom.el('div > ').each(function(e){console.log(e.parent().prop('nodeName') + ' > ' + e.prop('nodeName'));});
		*	@ignore
		*/
		{
			title : 'Descendant selector {>}',
			regex : /^\s*\>\s*((?:[a-z][a-z0-9\:\_\-]*)|\*)?/gi,
			/**	@ignore */
			filter : function(matches, results, config) {
				var originalResults = [].concat(results),
					nodeName = (matches[1] || '*').toLowerCase(),
					x, i, children, childN;
				results.splice(0, results.length);
				// If the descendent selector is used first, use searchBaseNode as the parent
				if (!config.isFiltered && config.first) {
					// we're operating on the document root. That's fine, but it deserves a warning.
					puredom.log('Descendant selector called on an unfiltered result set.  Operating on descendants of the document.');
				}
				if (!config.isFiltered || config.first) {
					originalResults = [config.searchBaseNode];
				}
				for (x=0; x<originalResults.length; x++) {
					children = originalResults[x].childNodes;
					for (i=0; i<children.length; i++) {
						childN = (children[i].nodeName + '').toLowerCase();
						if (childN===nodeName || (nodeName==='*' && childN.charAt(0)!=='#' && (children[i].nodeType===1 || children[i].nodeType===9))) {
							results.push(children[i]);
						}
					}
				}
			}
		},

		/** :nth-child aliases, like :first-child
		*	@ignore
		*/
		{
			title : 'nth-child aliases, like :first-child',
			regex : /^\:(first|last|only)\-(child|of\-type)/gm,
			/**	@ignore */
			filter : function(matches, results, config) {
				var map = {
						'first-child'	: ':nth-child(0n+1)',
						'first-of-type'	: ':nth-of-type(0n+1)',
						'last-child'	: ':nth-last-child(0n+1)',
						'last-of-type'	: ':nth-last-of-type(0n+1)'
						// only-child can't really be done here, unless nth-child gets a bit more complex
					},
					i, selector, mappedSelector, submatches;
				for (i=selectors.length; i--; ) {
					if (selectors[i].isNthChildSelector===true) {
						selector = selectors[i];
						break;
					}
				}

				if (map.hasOwnProperty(matches[1]+'-'+matches[2]) && selector) {
					mappedSelector = map[matches[1]+'-'+matches[2]];
					selector.regex.lastIndex = 0;
					submatches = selector.regex.exec(mappedSelector);
					return selector.filter(submatches, results, config);
				}
				else {
					puredom.log('Unknown nth-child alias "'+matches[1]+'-'+matches[2]+'"');
				}
			}
		},

		/** :nth-child() selector
		*	@tests:
		*			// Should return third element in the body
		*		puredom.el(' :nth-child(n*2)');
		*	@ignore
		*/
		{
			isNthChildSelector : true,
			title : 'nth-child selector {:nth-child(n+2) & variants}',
			regex : /^\:(nth(?:\-last)?(?:\-of\-type|\-child))\((?:(\-?[0-9]*n(?:[+-][0-9]+)?)|([0-9]+)|([a-z]+))\)/gm,
			/**	@ignore */
			filter : function(matches, results, config) {
				var originalResults,
					x, i, d, p, t,
					type,
					child, childIndex,
					// for expr:
					a, b, n,
					ofType = matches[1].indexOf('-of-type')!==-1,
					named = {
						odd : [2,1],
						even : [2]
					};

				originalResults = results.splice(0, results.length);

				if (matches[1].indexOf('-last')!==-1) {
					originalResults.reverse();
				}

				if (matches[2]) {		// explicit an+b
					p = matches[2].split('n');
					if (p[0].replace('-','').length===0) {
						p[0] = p[0] + '1';
					}
					a = Math.round(p[0].replace('+','')) || 0;
					b = Math.round(p[1].replace('+','')) || 0;
				}
				else if (matches[3]) {	// (implied 1n) + b
					a = 0;
					b = Math.round(matches[3]) || 0;
				}
				else if (matches[4]) {	// named sets: odd, even
					p = matches[4].toLowerCase();
					if (named.hasOwnProperty(p)) {
						a = named[p][0] || 0;
						b = named[p][1] || 0;
					}
					else {
						puredom.log('Unknown named nth-child expression "'+r[4]+'"');
					}
				}

				if (a+b<=0) {
					return;
				}
				if (a===b) {
					b = 0;
				}


				for (x=0; x<originalResults.length; x++) {
					children = (originalResults[x].parentNode || {}).childNodes;
					type = (originalResults[x].nodeName+'').toLowerCase();
					isMatch = false;
					if (children) {
						childIndex = 0;
						for (i=0; i<children.length; i++) {
							child = children[i];
							t = ofType ? (child.nodeName+'').toLowerCase()===type : ((child.nodeName+'').substring(0,1)!=='#' || child.nodeType===1 || child.nodeType===9);
							if (t) {
								childIndex += 1;
								if (child===originalResults[x]) {
									if (a>0) {
										isMatch = (childIndex%a - b)===0;
									}
									else {
										isMatch = childIndex === b;
									}
									if (isMatch) {
										break;
									}
								}
							}
						}
					}
					if (isMatch) {
						results.push(originalResults[x]);
					}
				}
			}
		},

		/** Nested element pseudo-pseudo-selector, with built-in nodeName filtering
		*	@ignore
		*/
		{
			title : 'within_internal selector { }',
			regex : /^\s+((?:[a-z][a-z0-9\:\_\-]*)|\*)?/gi,
			/**	@ignore */
			filter : function(matches, results, config) {
				var originalResults = [].concat(results),
					nodeName = matches[1] || '*',
					x;
				results.splice(0, results.length);
				for (x=0; x<originalResults.length; x++) {
					Array.prototype.splice.apply(results, [results.length-1,0].concat(puredom.toArray(originalResults[x].getElementsByTagName(nodeName))));
				}
			}
		}
	];


	/** The selector engine's interface. Returns an {Array} of elements matching the passed CSS selector query
	 *	@param {String} search			A CSS selector, or multiple CSS selectors separated by a comma
	 *	@param {Object} [options]		Optional hash of one-time triggers for the engine:
	 *	@param {HTMLElement} [options.within=document]		Look for matches within the given element only
	 *	@param {Boolean} [options.includeInvisibles=false]	Return #comment nodes, etc
	 *	@param {Boolean} [options.logging=false]			Enable logging for this query
	 *	@param {Boolean} [options.useCached=false]			Return a cached result if available
	 *	@param {Boolean} [options.cache=false]				Cache the result
	 *	@private
	 */
	exports.query = function(search, options) {
		var baseNode = exports.baseNode || (exports.baseNode = document && document.documentElement || document),
			currentResults,
			nodes,
			nodeName,
			originalSearch = search,
			nativeSearch,
			handlerConfig,
			filterResponse,
			searchParsed,
			isMatch,
			matches,
			hasMatch,
			constrainedToNode,
			parseIterations = 0,
			doLogging = false,
			useCustomImplementation = !puredom.support.querySelectorAll,
			time = Date.now(),
			perSelectorSearchTime,
			perSelectorFilterTime,
			i, x;

		// Sanitize input and options:
		search = (search + '').replace(removePaddingReg, '$1');
		options = puredom.extend({}, options || {});
		if (options.logging===true) {
			doLogging = true;
		}

		// Check for cache enabled and return cached value if it exists:
		if (cacheEnabled && options.useCache===true && cache[search]) {
			return cache[search];
		}

		// Allow queries to be constrained to a given base node:
		if (options.within) {
			baseNode = options.within;
		}

		if (baseNode && baseNode.length && !baseNode.nodeName && baseNode.indexOf && baseNode[0]) {
			baseNode = baseNode[0];
		}



		// Comma-separated statements are dealt with in isolation, joined and returned:
		if (search.indexOf(',')>-1) {
			search = search.split(',');
			// Get ready to store the combined result sets:
			nodes = [];
			for (x=search.length; x--; ) {
				search[x] = search[x].replace(removePaddingReg,'$1');
				if (search[x].length>0) {
					// Re-run the engine for each independent selector chain:
					matches = exports.query(search[x], puredom.extend({}, options, {
						logging : false,
						internalLogging : doLogging,
						internal : true
					}));
					// Combine results from each statement into one array:
					if (matches) {
						for (i=0; i<matches.length; i++) {
							if (nodes.indexOf(matches[i])===-1) {
								nodes.push(matches[i]);
							}
						}
						//nodes = nodes.concat(matches);
					}
				}
			}
			if (doLogging) {
				puredom.log('query=',originalSearch, ', result=',node);
			}
			// Return the combined results:
			time = Date.now() - time;
			if (time>100) {
				puredom.log('Slow Selector Warning: "'+originalSearch+'" took ' + time + 'ms to complete.');
			}
			return nodes;
		}


		/** -------------------------
		*	Selector engine internals
		*/

		// ID's bypass querySelectorAll and the custom engine so the expected document.getElementById()
		// functionality is preserved (only returns one element, the last with that ID).
		if (search.match(/^#[^\s\[\]\(\)\:\*\.\,<>#]+$/gim)) {
			currentResults = [
				(baseNode.getElementById ? baseNode : document).getElementById(search.substring(1))
			];
			return currentResults;
			// skip parse:
			//useCustomImplementation = false;
		}


		nodeName = search.match(nodeNameReg);
		nodeName = (nodeName && nodeName[0] || '').toLowerCase();
		search = search.substring(nodeName.length);
		// NOTE: trim() is intentionally NOT called on search here. We *want* to know if there
		// is preceeding whitespace, because that consitutes a "within" pseudo-pseudo-selector!
		// ^ does that make sense?

		searchParsed = search;

		// querySelectorAll doesn't support searches beginning with the child selector. For those, use the custom engine.
		if (originalSearch.charAt(0)==='>') {
			useCustomImplementation = true;
		}

		if (puredom.support.querySelectorAll && useCustomImplementation!==true) {
			currentResults = nativeQuerySelectorAll(originalSearch, baseNode);
			if (currentResults===false) {
				currentResults = [];
				useCustomImplementation = true;
			}
		}



		if (useCustomImplementation) {
			if (search.substring(0,1)==='#') {
				currentResults = [];
			}
			else if ((!nodeName || nodeName==='*') && document.all && !window.opera && (baseNode===document || baseNode===document.documentElement)) {
				currentResults = puredom.toArray(baseNode.all || document.all);
				constrainedToNode = false;
			}
			else {
				currentResults = puredom.toArray(baseNode.getElementsByTagName(nodeName || '*'));
				constrainedToNode = true;
			}

			// A pass-by-reference handlerConfig for filters will be needed for :not() support:
			handlerConfig = {
				searchBaseNode : baseNode,
				negated : false,
				first : true,
				isFiltered : constrainedToNode || !!(nodeName && nodeName!=='*')
			};


			// Filter until there are no more selectors left in the statement:
			while (searchParsed.length>0) {
				parseIterations += 1;
				hasMatch = false;
				for (i=0; i<selectors.length; i++) {
					if (exports.enableSelectorStats===true) {
						perSelectorSearchTime = Date.now();
					}

					// Prepare and get matches from the selectorFilter's regular expression:
					resetRegex(selectors[i].regex);
					matches = selectors[i].regex.exec(searchParsed);

					if (exports.enableSelectorStats===true) {
						perSelectorSearchTime = Date.now() - perSelectorSearchTime;
					}

					if (matches) {
						// Match found, this must be the right selector filter:
						hasMatch = true;
						if (doLogging) {
							puredom.log((selectors[i].title || selectors[i].regex) + ' ==>> matched:"'+ searchParsed.substring(0,matches[0].length) + '" ==>> remaining:"'+ searchParsed.substring(matches[0].length) + '" ||debug>> (submatches:'+ matches.slice(1).join(',') + ')');
						}

						if (exports.enableSelectorStats===true) {
							perSelectorFilterTime = Date.now();
						}

						// Allow the selector filter to filter the result set:
						filterResponse = selectors[i].filter(matches, currentResults, handlerConfig);
						if (filterResponse && puredom.isArray(filterResponse)) {
							currentResults = filterResponse;
						}

						if (exports.enableSelectorStats===true) {
							perSelectorFilterTime = Date.now() - perSelectorFilterTime;
						}

						// Remove the matched selector from the front of the statement:
						searchParsed = searchParsed.substring(matches[0].length);

						// We're no longer on the first match:
						handlerConfig.first = false;

						// At least one filter has now been applied:
						handlerConfig.isFiltered = true;
					}

					if (exports.enableSelectorStats===true) {
						selectors[i].matchTimes.push(perSelectorSearchTime);
						if (hasMatch) {
							selectors[i].filterTimes.push(perSelectorFilterTime);
						}
					}

					// Drop out of the loop early if the selector is fully parsed (optimization):
					if (searchParsed.length===0) {
						break;
					}
				}

				// If no selector filters matched the statement, bail out. Otherwise causes an infinite loop.
				if (!hasMatch) {
					throw(new Error('puredom.selectorEngine :: Unknown CSS selector near: ' + searchParsed.substring(0,20), 'puredom.js', 2689));
				}
			}
		}


		if (options.includeInvisibles!==true) {
			for (i=currentResults.length; i--; ) {
				if (currentResults[i] && (currentResults[i].nodeName+'').charAt(0)==='#') {
					currentResults.splice(i, 1);
				}
			}
		}

		if (doLogging) {
			puredom.log('query=',originalSearch, ', result=',currentResults);
		}

		// Cache the results if enabled & requested:
		if (cacheEnabled && options.cache===true) {
			cache[search] = currentResults;
		}

		if (options.internal!==true && doLogging===true) {
			time = Date.now() - time;
			if (time>10) {
				puredom.log('Slow Selector Warning: "'+originalSearch+'" took ' + time + 'ms to complete. '+parseIterations+' parse iterations.');
			}
		}

		// Return the matched result set.  Can be empty, but is always an Array.
		return currentResults;
	};


	/** @public */
	exports.matches = function(el, selector, base) {
		return exports.query(selector, base ? { within:base } : null).indexOf(el)>-1;
	};

	exports.matchesSelector = function(base, el, selector) {
		return exports.matches(el, selector, base);
	};


	/**	@public */
	exports.enableCache = function(enabled) {
		cacheEnabled = enabled!==false;
		if (!cacheEnabled) {
			cache = {};
		}
	};

	/**	@public */
	exports.disableCache = function() {
		cacheEnabled = false;
		cache = {};
	};

	/**	@public */
	exports.clearCache = function() {
		cache = {};
	};

	/** Add a custom CSS selector filter.
	*	@public
	*/
	exports.addSelectorFilter = function(selectorFilter) {
		selectorFilter = normalizeSelectorFilter.apply(this, arguments);
		if (selectorFilter) {
			selectors.push(selectorFilter);
			return true;
		}
		return false;
	};

	/** Remove a custom CSS selector filter.
	*	@public
	*/
	exports.removeSelectorFilter = function(selectorFilter) {
		var x, p, isMatch;
		selectorFilter = normalizeSelectorFilter.apply(this, arguments);
		if (selectorFilter) {
			for (x=selectors.length; x--; ) {
				isMatch = true;
				for (p in selectors[x]) {
					if (selectors[x].hasOwnProperty(p) && selectors[x][p]!==selectorFilter[p]) {
						isMatch = false;
						break;
					}
				}
				if (isMatch) {
					selectors.splice(x, 1);
					break;
				}
			}
		}
		return isMatch===true;
	};

	if (exports.enableSelectorStats===true) {
		/**	@ignore */
		(function() {
			for (var i=0; i<selectors.length; i++) {
				selectors[i].matchTimes = [];
				selectors[i].filterTimes = [];
			}
		}());

		/**	Get selector timing statistics.
		*	@public
		*/
		exports.selectorStats = function() {
			var stats = {
					title : "--- Selector Statistics: ---",
					selectors : []
				},
				stat, i, sel, j, time, totalTime;
			for (i=0; i<selectors.length; i++) {
				sel = selectors[i];
				stat = {};
				stat.title = sel.title;
				totalTime = 0;
				if (sel.matchTimes.length>0) {
					time = 0;
					for (j=0; j<sel.matchTimes.length; j++) {
						time += sel.matchTimes[j];
					}
					totalTime += time;
					stat.matching = Math.round(time/sel.matchTimes.length) + "ms";
				}
				if (sel.filterTimes.length>0) {
					time = 0;
					for (j=0; j<sel.filterTimes.length; j++) {
						time += sel.filterTimes[j];
					}
					totalTime += time;
					stat.filtering = Math.round(time/sel.filterTimes.length) + "ms";
				}
				stat.own_time = totalTime + "ms";
				stat.calls = sel.matchTimes.length;
				stats.selectors.push(stat);
			}
			return stats;
		};
	}
	else {
		/**	@ignore */
		exports.selectorStats = function() {
			return "disabled";
		};
	}


	/** Resets a RegExp for repeated usage.
	*	@private
	*/
	function resetRegex(regex) {
		regex.lastIndex = 0;
	}


	/**	@ignore */
	function nativeQuerySelectorAll(selector, within) {
		var results;
		within = within || exports.baseNode;
		selector = selector.replace(/(\[[^\[\]= ]+=)([^\[\]"']+)(\])/gim,'$1"$2"$3');
		try {
			results = within.querySelectorAll(selector);
			if (results) {
				results = puredom.toArray(results);
			}
		} catch (err) {
			puredom.log('Native querySelectorAll failed for selector: '+selector+', error:'+err.message);
		}
		return results || false;
	}


	/**	@private */
	function normalizeSelectorFilter(selectorFilter) {
		if (arguments.length===2) {
			selectorFilter = {
				regex : arguments[0],
				filter : arguments[1]
			};
		}
		if (selectorFilter && selectorFilter.regex && selectorFilter.filter) {
			return selectorFilter;
		}
		return false;
	}

	puredom.getElement = puredom.selectorEngine = exports;
	return exports;
}(puredom));
