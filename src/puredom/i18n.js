/**	When called as a function, acts as an alias of {@link puredom.i18n.localize}.
 *	@namespace Internationalization extension for puredom.
 *	@function
 */
puredom.i18n = (function() {
	/**	@exports i18n as puredom.i18n */
	var langs = {},
		i18n;
	
	/**	@ignore */
	i18n = function() {
		return i18n.localize.apply(this,arguments);
	};
	
	/**	Get the locale definition corresponding to the given language code.
	 *	@param {String} langCode		A language code to retrieve the definition for.
	 *	@returns {Object} locale, or <code>false</code> on error.
	 */
	i18n.getLang = function(langCode) {
		langCode = langCode.toLowerCase().replace(/[^a-z0-9]/gim,'');
		for (var x in langs) {
			if (langs.hasOwnProperty(x) && (x+'').toLowerCase().replace(/[^a-z0-9]/gim,'')===langCode) {
				return langs[x];
			}
		}
		return false;
	};
	
	/**	Check if a locale definition is registered for the given language code.
	 *	@param {String} langCode		A language code to check for.
	 *	@returns {Boolean} exists
	 */
	i18n.hasLang = function(langCode) {
		return !!i18n.getLang(langCode);
	};
	
	/**	Set the global locale.
	 *	@param {String} langCode		The new language code to apply globally.
	 *	@returns {this}
	 */
	i18n.setLang = function(langCode) {
		if (i18n.hasLang(langCode)) {
			i18n.locale = i18n.lang = langCode;
		}
		return this;
	};
	
	/**	Apply the global locale definition to a selection ({@link puredom.NodeSelection}).<br />
	 *	Looks for <code>data-i18n-id</code> attributes, and updates their owner nodes' contents with the corresponding String from the global locale definition.
	 *	@param {puredom.NodeSelection} selection		A selection to apply the global locale definition to.
	 */
	i18n.localizeDOM = function(nodeSelection) {
		nodeSelection.query('[data-i18n-id]').each(function(node) {
			var key = (node.attr('data-i18n-id') || '') + '',
				type = node.nodeName(),
				current,
				localized;
			if (key && key.length>0) {
				localized = i18n.localize(key, null, '');
				if (localized && localized!==key && localized!=='') {
					switch (type) {
						case "select":
						case "input":
						case "textarea":
							current = node.value();
							if (current!==localized) {
								node.value(localized);
							}
							break;
						
						default:
							current = node.html();
							if (current!==localized) {
								node.html(localized);
							}
							break;
					}
				}
			}
		});
	};
	
	/**	Localize a variable.
	 *	@param {Any} value						A value to localize.  Ex: a Date, Number or String
	 *	@param {String} [langCode=i18n.locale]	An alternative language code to use.
	 *	@param {String} [defaultValue]			A fallback value to use if no localized value can be generated.
	 *	@param {Object} [options]				Configuration object.
	 */
	i18n.localize = function(value, lang, defaultValue, options) {
		var type = puredom.typeOf(value),
			originalValue = value,
			dateFormat, def, localizedValue, t, i;
		options = options || {};
		lang = (lang || i18n.lang || i18n.locale || 'en').toUpperCase();
		if (langs.hasOwnProperty(lang)) {
			def = langs[lang];
		}
		else if (lang.indexOf('-')>-1) {
			lang = lang.substring(0, lang.indexOf('-'));
			if (langs.hasOwnProperty(lang)) {
				def = langs[lang];
			}
		}
		
		if (def && value!==null && value!==undefined) {
			if (type==='string') {
				value = value.replace(/\{([^{}]+)\}/gim,'$1');
			}
			def = {
				labels : def.labels || {},
				formats : def.formats || {}
			};
			if (type==='string' && !value.match(/^(labels|formats)\./gim)) {
				value = 'labels.' + value;
			}
			if (type==='date' || value.constructor===Date) {
				dateFormat = def.formats[options.datetype || 'date'];
				//console.log(options.datetype, dateFormat);
				localizedValue = dateFormat && puredom.date.format(value, dateFormat) || value.toLocaleString();
			}
			else if (type==='number') {
				if (def.formats.thousands_separator) {
					localizedValue = '';
					t = value+'';
					while (t.length > 0) {
						localizedValue = t.substring(Math.max(0,t.length-3)) + localizedValue;
						if (t.length>3) {
							localizedValue = def.formats.thousands_separator + localizedValue;
						}
						t = t.substring(0, Math.max(0,t.length-3));
					}
				}
			}
			else if (type==='boolean') {
				localizedValue = (value===true ? def.formats.booleanTrue : def.formats.booleanFalse) || (value+'');
			}
			else {
				localizedValue = puredom.delve(def, value+'');
			}
		}
		
		if (localizedValue) {
			return localizedValue;
		}
		else if (defaultValue!==null && defaultValue!==undefined) {
			return defaultValue;
		}
		return originalValue;
	};
	
	/**	Add a locale definition.
	 *	@param {String} langCode		A language code
	 *	@param {Object} definition		A key-value JSON object that defines labels and formats
	 *	@returns {this}
	 */
	i18n.addLang = function(langCode, definition) {
		langCode = (langCode+'').toUpperCase();
		// if the JSON object is just a list, it is treated as a static label lookup:
		if (!definition.labels) {
			definition = {
				labels : definition
			};
		}
		langs[langCode] = definition;
		return this;
	};
	
	// Register this as a plugin for nodeselections
	/**	Localize the selection.
	 *	@name puredom.NodeSelection#localize
	 *	@function
	 */
	puredom.addNodeSelectionPlugin('localize', function() {
		i18n.localizeDOM(this);
		return this;
	});
	
	return i18n;
}());
