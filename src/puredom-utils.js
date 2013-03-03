/** @ignore */
window.puredom = window.puredom || {};

(function() {
	
	var util = /** @lends puredom */ {
		
		/** When called as a function, <code>puredom.text()</code> acts as an alias of {@link puredom.text.filter}.
		 *	@namespace A collection of text utilities and a way to apply them as filters.
		 *	@function
		 *	@name puredom.text
		 *	@param {String} str		The string to modify
		 *	@param {String|Array}	A pipe-separated String or Array, where each value is a filter. Arguments to a filter can be passed using a colon followed by a CSV of the arguments.
		 *	@returns {String} The modified string
		 */
		text : (function() {
			/** @exports base as puredom.text */
			
			/** @public A collection of text utilities and a way to apply them as filters. <br />
			 *	<strong>Note:</strong> puredom.text() is a convenient shortcut for this method.
			 *	@param {String} str		The string to modify
			 *	@param {String|Array}	A pipe-separated String or Array, where each value is a filter. Arguments to a filter can be passed using a colon followed by a CSV of the arguments.
			 *	@returns {String} The modified string
			 *	@function
			 */
			var base = function(){
					return base.filter.apply(this, arguments);
				},
				regexes = {
					htmlEntities : /[&<>"]/gim,
					ucWords : /(^|\s)[a-z]/gim,
					ucFirst : /^[a-z]/gim,
					nl2br : /\r?\n/g,
					numbersOnly : /[^0-9.\-]/gim,
					trim : /^\s*?(.*?)\s*?$/gim
				};
			
			/** Modify a string using a filter to apply any functions available in {@link puredom#text}.
			 *	@param {String} str				The string to modify
			 *	@param {String|Array} filters	A bar-separated string or {Array}, where each value is a filter. Arguments to a filter can be passed using a colon followed by a CSV of the arguments.
			 *	@returns {String} The modified string
			 *	@example
			 * puredom.text.filter(" <hi there!> ", 'trim|ucWords|htmlEntities') === "&lt;Hi There!&gt;";
			 * puredom.text("This string might be too long!", 'truncate:10,byWord') === "This string...";
			 */
			base.filter = function(str, filters) {
				var x, filter, ind, args, i;
				if (puredom.typeOf(filters)!=='array') {
					filters = ((filters||'') + '').split('|');
				}
				if (arguments.length>2) {
					for (x=2; x<arguments.length; x++) {
						if (puredom.typeOf(arguments[x])==='array') {
							filters = filters.concat(arguments[x]);
						}
						else {
							filters.push(arguments[x]);
						}
					}
				}
				for (x=0; x<filters.length; x++) {
					filter = filters[x];
					args = [str];
					ind = filter.indexOf(':');
					if (ind>-1) {
						filter = filter.substring(0, ind);
						args = args.concat(filters[x].substring(ind+1).split(','));
					}
					for (i in base) {
						if ((i+'').toLowerCase()===filter.toLowerCase()) {
							str = base[i].apply(base, args);
							break;
						}
					}
				}
				return str;
			};
			
			/**	URL-encode a string. (using encodeURIComponent)
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.escape = function(str) {
				return encodeURIComponent(str);
			},
			
			/**	URL-decode a string. (using decodeURIComponent)
			 *	@public
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.unescape = function(str) {
				return decodeURIComponent(str);
			},
			
			/**	Convert special characters to their HTML-encoded equivalents.
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.htmlEntities = function(str) {
				var map = {
					'&' : '&amp;',
					'<' : '&lt;',
					'>' : '&gt;',
					'"' : '&quot;'
				};
				return (str+'').replace(regexes.htmlEntities, function(s) {
					return map[s];
				});
			};
			
			/**	Convert the first character of each word to uppercase.
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.ucWords = function(str) {
				return (str+'').toLowerCase().replace(regexes.ucWords, function(s) {
					return s.toUpperCase();
				});
			};
			
			/**	Convert the first character of the first word to uppercase.
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.ucFirst = function(str) {
				return (str+'').toLowerCase().replace(regexes.ucFirst, function(s) {
					return s.toUpperCase();
				});
			};
			
			/**	Convert newline characters to HTML <br /> elements.
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.nl2br = function(str) {
				return (str+'').replace(regexes.nl2br, '<br />');
			};
			
			/**	Strip all non-numeric characters from a string.
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.numbersOnly = function(str) {
				return (str+'').replace(regexes.numbersOnly, '');
			};
			
			/** Truncate a string, optionally on word boundaries. <br />
			 *	Optionally adds a textual truncation indicator (eg: "...").
			 *	@param {String} str 					The string to truncate
			 *	@param {Number} [maxLen=80]				Maximum string length, in characters.
			 *	@param {Boolean|String} [byWord=false]	Don't truncate in the middle of words. Resultant string may be shorter if set to true.
			 *	@param {String} [indicatorChars="..."]	Custom indicator characters if truncation occurs. Defaults to "...".
			 *	@returns {String} The truncated string
			 */
			base.truncate = function(str, maxLen, byWord, indicatorChars) {
				var trimmed = false,
					origStr = str+'';
				str = origStr;
				maxLen = parseInt(maxLen,10) || 80;
				byWord = byWord===true || byWord==='true' || byWord==='byWord';
				indicatorChars = indicatorChars || '...';
				if (str.length>maxLen) {
					if (byWord) {
						str = str.substring(0, maxLen);
						if (!origStr.charAt(maxLen).match(/\s/)) {
							str = str.replace(/\s[^\s]*$/,'');
						}
					}
					else {
						str = str.substring(0, maxLen-indicatorChars.length);
					}
					trimmed = true;
				}
				if (trimmed) {
					str += indicatorChars;
				}
				return str;
			};
			
			/** Fast JS trim implementation across all browsers. <br />
			 *	<em>Note: Research credit goes to http://blog.stevenlevithan.com/archives/faster-trim-javascript</em>
			 *	@param {String} str		The string to modify
			 *	@returns {String} The modified string
			 */
			base.trim = function(str) {
				//return str.replace(regexes.trim, '$1');
				var ws = /\s/, i;
				str = str.replace(/^\s\s*/, '');
				i = str.length;
				while (ws.test(str.charAt(--i)));
				return str.slice(0, i + 1);
			};
			
			
			/** Default/fallback text. <br />
			 *	Used by templates to provide fallback values for empty fields.
			 *	@param {String} str		The string to modify
			 *	@param {String} text	Default text if str is empty.
			 *	@returns {String} The modified string
			 */
			base['default'] = function(str, text) {
				str = base.trim(str);
				return str ? str : text;
			};
			
			
			/** Format a date using whatever i18n module is registered with puredom. <br />
			 *	<em><strong>Note:</strong> Requires a conversion function to be registered as puredom.i18n() in order to convert dates.</em>
			 *	@requires puredom.i18n
			 *	@param {String} str				The string to modify
			 *	@param {String} [type=date]		A date type to pass to i18n. Defaults to "date".
			 *	@returns {String} The formatted date string
			 */
			base.dateformat = function(str, type) {
				var i18n = puredom.i18n,
					d = puredom.date,
					date;
				if (d && d.create) {
					date = d.create(str);
				}
				if (!date || (date+'').indexOf('Invalid')>-1) {
					date = new Date(str);
					if (!date || (date+'').indexOf('Invalid')>-1) {
						date = new Date();
						date.setTime(Math.round(str));
					}
				}
				if (type && type.indexOf('%')>-1) {
					if (d && d.format) {
						str = d.format(date, type);
					}
				}
				else if (i18n) {
					str = i18n(date, null, null, {
						datetype : type || 'date'
					}) || (date+'');
				}
				return str;
			};
			
			
			return base;
		}()),
		
		
		
		/**	Convert an object to a sequence of URL-encoded key-value parameters.
		 *		This function is the same as {@link puredom.querystring.stringify}, except that
		 *		it prepends a '?' to the result by default. (ie: startDelimiter is '?' by default)
		 *	@name puredom.parameterize
		 *	@param {Object} obj		The object to serialize
		 *	@param config			Configuration overrides. See {@link puredom.querystring.stringify}
		 *	@see puredom.querystring.stringify
		 *	@deprecated
		 *	@private
		 *	@returns {String} The generated querystring
		 */
		parameterize : function(obj, customConfig) {
			var t = [],
				key, value, x, type,
				config = puredom.extend({
					delimiter		: '&',
					startDelimiter	: '?',
					assignment		: '=',
					typeHandlers	: null
				}, customConfig);
			
			for (key in obj) {
				if (obj.hasOwnProperty(key)) {
					value = obj[key];
					type = this.typeOf(value);
					if (config.typeHandlers && config.typeHandlers.hasOwnProperty(type)) {
						t.push( config.delimiter + encodeURIComponent(key) + "=" + encodeURIComponent(config.typeHandlers[type](value)) );
					}
					else if (type==='array' && config.disableArrayParams!==true) {
						for (x=0; x<value.length; x++) {
							t.push( config.delimiter + encodeURIComponent(key) + "[]=" + encodeURIComponent(value[x]) );
						}
					}
					else {
						switch (type) {
							case 'boolean':
								value = value ? 'true' : 'false';
								break;
							case 'null':
							case 'undefined':
								value = '';
								break;
							case 'object':
								if (config.useJsonForObjects!==false) {
									// nested objects get serialized as JSON by default:
									value = this.json(value);
								}
								else {
									// alternatively, they can be serialized by double-encoding:
									value = this.parameterize(value);
								}
								break;
						}
						t.push(encodeURIComponent(key) + "=" + encodeURIComponent(value));
					}
				}
			}
			t = t.join(config.delimiter || '&');
			t = (config.startDelimiter || '') + t;
			return t;
		},
		
		
		
		/** @namespace Handles querystring encoding and decoding.
		 *	@name puredom.querystring
		 */
		querystring : {
			/** @lends puredom.querystring */
			
			/** Parse a querystring and return an {Object} with the key-value pairs as its properties.
			 *	<em>Note: Preceeding '?' and '&' characters will be stripped. Empty parameters will be returned as empty strings.</em>
			 *	@param {String} querystring		The querystring to parse.
			 *	@returns {Object} The key-value parameters as an object.
			 */
			parse : function(str) {
				var parts, i, j, p={};
				if (str.substring(0,1)==='?') {
					str = str.substring(1);
				}
				parts = str.split('&');
				for (i=0; i<parts.length; i++) {
					if (parts[i]) {
						j = parts[i].indexOf('=');
						p[decodeURIComponent(parts[i].substring(0,j))] = j<0 ? '' : decodeURIComponent(parts[i].substring(j+1));
					}
				}
				return p;
			},
			
			/** Convert an object into a querystring, optionally with custom separator/delimiter characters.
			 *	<em>Note: Nested objects are serialized as double-encoded querystring parameters by default. To use JSON for nested objects, set the "useJsonForObjects" flag to true.</em>
			 *	Available options:
			 *		{Boolean} useJsonForObjects		Use JSON to serialize nested objects? (uses double-encoding by default)
			 *		{Boolean} disableArrayParams	Disable PHP-style "array parameters? ex: p[]=foo&p[]=bar
			 *		{Object} typeHandlers			Specify custom serializers for each data type by setting type:handler. Handlers accept the original data and return the serialized parameter value, *not* URL-encoded.
			 *		{String} assignment				The key-value separator. Defaults to "=".
			 *		{String} delimiter				The group separator. Defaults to "&".
			 *		{String} startDelimiter			A character to insert at the beginning of the string. Defaults to none.
			 *	@param {Object} parameters		A key-value map of parameters to serialize.
			 *	@param {Object} [options]		A hashmap of configuration options.
			 */
			stringify : function(parameters, options) {
				options = puredom.extend({ startDelimiter:'' }, options || {});
				return puredom.parameterize(parameters, options);
			},
			build : function(){return puredom.querystring.stringify.apply(puredom.querystring,arguments);}
		},
		
		
		
		/**	@namespace Handles storage and retrieval of cookies.
		 *	@name puredom.cookies
		 */
		cookies : (function(){
			var cache = {};
			
			return /** @lends puredom.cookies */ {
				
				/**	Set a cookie with name *key* to value *value*
				 *	@exports set as puredom.cookies.set
				 *	@param {String} key		The key for storage
				 *	@param {String} value	A value to store
				 *	@param {Number} days	The cookie lifetime in number of days.
				 */
				set : function (key, value, days, domain, path, secure) {
					var expires = '',
						cookie = '',
						date;
					path = typeof(path)==='string' ? path : '';
					if (days) {
						date = new Date();
						date.setTime(date.getTime() + days*24*60*60*1000);
						expires = "; expires="+date.toGMTString();
					}
					if(cache.hasOwnProperty(key) && cache[key].expires) {
						expires = "; expires="+cache[key].expires.toGMTString();
					}
					cookie = key + "=" + encodeURIComponent(value) + expires + "; path=/"+path.replace(/^\//,'');
					if (typeof(domain)==='string' && domain.length>0) {
						cookie += '; domain=' + domain.replace(/[\;\,]/,'');
					}
					if (secure===true) {
						cookie += '; secure';
					}
					//puredom.log('puredom.cookies.set() :: ' + cookie);
					document.cookie = cookie;
					cache[key] = {
						value : value,
						expires : date
					};
				},
				
				/**	Get a cookie. Pulls values from cache when possible.
				 *	@exports get as puredom.cookies.get
				 *	@param {String} key					The key to lookup
				 *	@param {Boolean} [useCached=true]	Use cached value if present
				 *	@returns {String} value				The value, or <code>null</code> if the lookup failed.
				 */
				get : function (key, useCached) {
					if(cache.hasOwnProperty(key) && useCached!==true) {
						return cache[key].value;
					}
					var c, i, ca = document.cookie.split(';');
					for (i=0; i<ca.length; i++) {
						c = ca[i].replace(/^\s+/gim,'');
						if (c.indexOf(key+"=")===0) {
							return decodeURIComponent(c.substring(key.length+1,c.length));
						}
					}
					return null;
				},
				/**	Remove a cookie and any cached values
				 *	@param {String} key		The key to remove
				 */
				remove	: function (key) {
					this.set(key, "", -1);
					delete cache[key];
				},
				/**	Remove all cookies and cached values */
				purge	: function () {
					for (var x in cache) {
						if(cache.hasOwnProperty(x)) {
							this.remove(x);
							delete cache[x];
						}
					}
				},
				/** Alias of {@link puredom.cookies.get}
				 *	@see puredom.cookies.get
				 *	@private
				 */
				read : function() {
					return this.get.apply(this,arguments);
				},
				/** Alias of {@link puredom.cookies.set}
				 *	@see puredom.cookies.set
				 *	@private
				 */
				write : function() {
					return this.set.apply(this,arguments);
				}
			};
		}()),
		
		
		/**	@ignore */
		Cache : (function() {
			/** @class In-memeory cache class with a twist! <br />
			 *	Set and get work like a normal cache.
			 *	Creates a new Cache instance.
			 *	@name puredom.Cache
			 */
			function Cache() {
				if (this.constructor!==arguments.callee && this.constructor!==Cache) {
					return new Cache();
				}
				this.data = {};
			}
			
			puredom.extend(Cache.prototype, /** @lends puredom.Cache# */ {
				
				/** The default *type* used for namespacing keys is "_default" */
				defaultType : '_default',
				
				/** Purge all entries from the cache */
				purge : function() {
					this.data = {};
				},
				
				/** Get a cached value with optional type. 
				 *	@param {String} [type]		A type prefix.
				 *	@param {String|Number} id	The cache entry ID
				 *	@param {Function} callback	A callback, gets passed the cached value once retrieved.
				 */
				get : function(type, id, cb) {
					var d;
					if (arguments.length===2) {
						id = type;
						cb = id;
						type = null;
					}
					type = (type || this.defaultType)+'';
					id = id+'';
					d = this.data.hasOwnProperty(type) && this.data[type][id] || false;
					if (cb) {
						if (d) {
							cb(d);
						}
						return !!d;
					}
					return d;
				},
				
				/** Get a cached value with optional type. 
				 *	@param {String} [type]		A type prefix.
				 *	@param {String|Number} id	The cache entry ID
				 *	@param value				Any value to cache.
				 */
				set : function(type, id, val) {
					if (arguments.length===2) {
						id = type;
						val = id;
						type = null;
					}
					type = (type || this.defaultType)+'';
					id = id+'';
					if (!this.data[type]) {
						this.data[type] = {};
					}
					this.data[type][id] = val;
				},
				
				/** Proxy a callback function for automatically caching asynchronous responses.
				 *	@param {String} [type]		A type prefix.
				 *	@param {String|Number} id	The cache entry ID
				 *	@param {Function} callback	The callback function to inject c
				 *	@param {Number} paramIndex	Which callback parameter to cache (0-based).
				 *	@returns {Function} The proxied callback function, with the cache set injected.
				 */
				proxySet : function(type, id, callback, paramIndex) {
					var self = this;	//, cb;
					//cb = function() {
					return function() {
						self.set(type, id, arguments[paramIndex || 0]);
						if (callback) {
							callback.apply(callback, arguments);
						}
						//self = cb = type = id = callback = paramIndex = null;
					};
					//return cb;
				},
				
				/** Iterate over all the cache entries.
				 *	@param {Function} iterator	Gets passed each entry.
				 */
				each : function(iterator) {
					return puredom.foreach(this.data, iterator);
				}
			});
			return Cache;
		}()),
		
		
		
		/** @namespace Parse and generate JSON.
		 *	When called as a function, <code>puredom.json()</code> automatically converts between JSON-Strings and Objects.
		 *	@function
		 *	@name puredom.json
		 *	@param {String|Object|Array} what		If a String is passed, it is parsed as JSON. Otherwise, returns JSON-encoded value of <code>what</code>.
		 *	@returns {String|Object|Array} jsonStringOrJsonResult
		 */
		json : (function() {
			/** @exports json as puredom.json */
			
			/**	@private */
			var json = function(what) {
				if (puredom.typeOf(what)==="string") {
					return json.parse(what);
				}
				return json.stringify(what);
			};
			
			/** Serialize a JavaScript object structure to a JSON string.<br />
			 *	<em>Note: Circular references cause this function to fail.</em>
			 *	@param what			Any object of any type.
			 *	@returns {String} The JSON-encoded string
			 */
			json.stringify = function(what) {
				var result;
				try {
					result = JSON.stringify(what);
				}catch(err) {
					puredom.log("puredom.json:: Stringify failed: " + err + " | " + what);
				}
				return result;
			};
			
			/** Parse JSON from a {String} and return the resulting object.
			 *	@param {String} json	A string containing JSON.
			 *	@returns {Object|Array|String|Number} jsonResult
			 *	@example
			 *		var obj = puredom.json.parse('{"items":[{"title":"Example"}]}');
			 */
			json.parse = function(what) {
				var result;
				if (typeof(what)==='string' && what.length>0) {
					try {
						result = JSON.parse(what);
					}catch(err) {
						puredom.log("puredom.json:: Parse failed: " + err + " | " + what);
					}
				}
				return result;
			};
			
			/**	Alias of {@link puredom.json.stringify}
			 *	@function
			 *	@deprecated
			 *	@private
			 */
			json.serialize = json.stringify;
			
			/**	Alias of {@link puredom.json.parse}
			 *	@function
			 *	@deprecated
			 *	@private
			 */
			json.unserialize = json.parse;
			
			return json;
		}()),
		
		
		
		/** @namespace Parse and generate XML.
		 *	@name puredom.xml
		 */
		xml : /** @lends puredom.xml */ {
			
			/** Parse XML from a string and return the resulting {Document}.
			 *	@param {String} xmlString		The XML to parse
			 *	@returns {Document} The XML document.
			 *	@example
			 *		var doc = puredom.xml.parse('<items><item><title>Example</title></item></items>');
			 */
			parse : function(xmlString) {
				var xmlDoc;
				if (window.DOMParser) {
					xmlDoc = new window.DOMParser().parseFromString(xmlString, "text/xml");
				}
				else {
					// Internet Explorer
					xmlDoc = new window.ActiveXObject("Microsoft.XMLDOM");
					xmlDoc.async = "false";
					xmlDoc.loadXML(xmlString);
				}
				return xmlDoc;
			}
		}
		
	};
	
	// copy into puredom
	for (var x in util) {
		if (util.hasOwnProperty(x)) {
			puredom[x] = util[x];
		}
	}
	util = null;
}());