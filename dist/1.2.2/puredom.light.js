
// Too convenient
if (typeof(Date.now)!=='function') {
	/**	@ignore */
	Date.now = function() {
		return new Date().getTime();
	};
}


(function() {
	/**	@exports self as puredom */
	
	var previousSelf = window.puredom;
	
	/**	When called as a function, acts as an alias of {@link puredom.el}.<br />
	 *	If a <code>Function</code> is passed, it is registered as a DOMReady handler. <br />
	 *	Otherwise, all arguments are passed on to {@link puredom.el}.
	 *	@version 1.2.2
	 *	@namespace Core functionality
	 *	@function
	 *	@param {Function|Any} arg	If a <code>Function</code> is passed, it is registered as a DOMReady handler. Otherwise, all arguments are passed on to {@link puredom.el}
	 *	@name puredom
	 *	@public
	 */
	var self = function(){
			return priv.puredom.apply(priv, arguments);
		}, 
		/**	@private */
		baseSelf = {
			version : '1.2.2',
			templateAttributeName : 'data-tpl-id',
			baseAnimationInterval : 20,
			allowCssTransitions : true,
			easingMethods : {
				'ease' : function(f) {
					return (Math.sin(f*Math.PI - Math.PI/2) + 1) / 2;
				},
				'ease-in-out' : function(f) {
					// note, this is not the correct easing function for ease-in-out
					return (Math.sin(f*Math.PI - Math.PI/2) + 1) / 2;
				},
				'ease-in-out-2' : function(f) {
					return this['ease-in-out'](this['ease-in-out'](f));
				},
				'ease-in-out-3' : function(f) {
					return this['ease-in-out'](this['ease-in-out'](this['ease-in-out'](f)));
				}
			}
		},
		initialized = false,
		vendorCssPrefix,
		vendorCssPrefixJS,
		objConstructor = baseSelf.constructor,
		textContentProperty,
		getSupportedTextContentProperty,
		
		/**	@private */
		priv = {
			oninit : [],
			animationTimes : {
				fast	: 150,
				medium	: 450,
				slow	: 1000
			},
			animationTimeScale : 1,
			registeredEventCount : 0,
			html5elements : 'abbr article aside audio canvas datalist details figcaption figure footer header hgroup mark meter nav output progress section summary time video'.split(' '),
			support : {
				html5 : true,
				querySelectorAll : !!('querySelectorAll' in document),
				filters : false,
				//filters : !!(document.all && document.documentElement && document.documentElement.filters),
				webkitMultitouch : !!("createTouch" in document)
			},
			regex : {
				css3AutoPrefix : /([\s\;\/\*])(transform|transition|perspective|box\-sizing|box\-shadow|border\-radius)\:([^\;]*)(\;|$)/gim,		// |text\-shadow
				css3VendorPrefix : /\b\-(moz|webkit|ms|o|vendor)\-/gim,
				templateFieldToken : /([^\\]?)\{([a-z0-9A-Z\$_\.]+)(\|[^\}]*?)?\}/gm,
				parseObjectNameFromString : /^\[object ([^\s]+)\]$/gim,
				autoDetectHTMLContent : /(<[a-z]|&[a-z#0-9]{1,10};)/gim,
				whitespaceCharacters : /\s/,
				getNumericCSSValue : /[^0-9\.\-]/gm,
				getCSSValueUnits : /([a-z]+|%)$/,
				getNonIntegerCharsSigned : /[^0-9\.\-]/gm,
				getUpperCaseAlphaChars : /[A-Z]/gm
			},
			noop : function(){}
		};
	
	
	if (navigator.userAgent.match(/\b(webkit|applewebkit|chrome|chromium|khtml)\b/gim)) {
		vendorCssPrefix = '-webkit';
		vendorCssPrefixJS = 'Webkit';
	}
	else if (navigator.userAgent.match(/\bopera\b/gim)) {
		vendorCssPrefix = '-o';
		vendorCssPrefixJS = 'O';
	}
	else if (navigator.userAgent.match(/\bgecko\b/gim)) {
		vendorCssPrefix = '-moz';
		vendorCssPrefixJS = 'Moz';
	}
	//else if (navigator.userAgent.match(/\bmsie\b/gim) && parseFloat(navigator.versionNumber)>=9) {
	else if (navigator.userAgent.match(/\bmsie\s*?(8|9|[1-9][0-9]+)\b/gim)) {
		vendorCssPrefix = '-ms';
		vendorCssPrefixJS = 'Ms';
	}
	else if (navigator.userAgent.match(/\bmsie\s*?[4-8]\b/gim)) {
		priv.support.filters = true;
		priv.support.filterProperty = 'filter';
	}
	
	
	/**	@ignore */
	(function(div, i) {
		div = document.createElement('div');
		div.innerHTML = '<nav></nav>';
		priv.support.html5 = div.childNodes.length>0;
		if (!priv.support.html5) {
			priv.html5frag = document.createDocumentFragment();
			for (i=priv.html5elements.length; i--; ) {
				priv.html5frag.createElement(priv.html5elements[i]);
			}
			priv.html5div = document.createElement('div');
			priv.html5frag.appendChild(priv.html5div);
		}
	}());
	
	
	/**	Note: this function removes itself, and should only ever be run once.
	 *	@ignore
	 */
	getSupportedTextContentProperty = function() {
		var d = document.body;
		textContentProperty = (d.textContent!==undefined && "textContent") || (d.innerText && 'innerText') || "innerHTML";
		getSupportedTextContentProperty = null;
		return textContentProperty;
	};
	
	
	
	/** Extend/augment a base object with the properties of one or more additional objects.<br />
	 *	<strong>Note:</strong> all additional arguments are treated as additional Objects to copy properties from.
	 *	@param {Object} base	The object to extend. For cloning, use an object literal.
	 *	@param {Object} props	An Object to copy properties from.
	 *	@param {Object} [...]	Additional arguments also get copied onto base.
	 *	@returns {Object} base
	 *	@example
	 *		var clonedObj = puredom.extend({}, originalObj);
	 *		puredom.extend(MyClass.prototype, prototypeAsHash);
	 */
	self.extend = function(base) {
		var i, j, ext;
		base = base || {};
		for (i=1; i<arguments.length; i++) {
				ext = arguments[i];
				if (ext) {
						for (j in ext) {
								if (ext.hasOwnProperty(j)) {
										base[j] = ext[j];
								}
						}
						// IE never reports toString as an "own property", so manually check if it was copied and fix if required:
						if (typeof ext.toString==='function' && ext.toString!==Object.prototype.toString) {		// ext.toString!==obj.toString && 
							base.toString = ext.toString;
						}
				}
		}
		return base;
	};
	
	
	/** Mixins. Add functionality to an object without modifying it's prototype.<br />
	 *	Alias of {@link puredom.extend extend()}
	 *	@function
	 */
	self.mixin = self.extend;
	
	
	/**	Strip an object of all of its properties.<br />
	 *	<strong>Note:</strong> Sets property values to null, doesn't actually delete them.
	 *	@param {Object} obj					An object to strip all properties from
	 *	@param {Boolean} [andProto=false]	If <code>true</code>, nullifies entire prototype chain.
	 */
	self.strip = function(obj, andProto) {
		for (var i in obj) {
			if (andProto===true || obj.hasOwnProperty(i)) {
				obj[i] = null;			// faster than delete.
			}
		}
	};
	
	
	/** Get a value from within a nested object. "Deep keys" use dot notation.
	 *	@param {Object} obj		The object to delve into.
	 *	@param {String} path	A dot-notated key to find within <code>obj</code>
	 *	@param {Boolean} [discardFirst=false]			If <code>true</code>, the first segment of <code>path</code> will be discarded.
	 *	@param {Boolean} [allowIncompleteMatch=false]	If <code>true</code>, returns the deepest reachable value, even if it is not a full path.
	 */
	self.delve = function(obj, path, discardFirst, allowIncompleteMatch) {
		var i = 0;
		path = path.split('.');
		if (discardFirst===true) {
			path.splice(0, 1);
		}
		while (i<path.length && obj && obj.hasOwnProperty(path[i])) {
			obj = obj[path[i]];
			i += 1;
		}
		if (i>=path.length || (allowIncompleteMatch===true && i>0)) {
			return obj;
		}
	};
	
	
	/**	Flatten a nested Object using underscore-delimited keys. (<code>foo_bar_baz</code>)
	 *	@param {Object} obj		The nested/deep object to flatten
	 *	@returns {Object} flat
	 */
	self.flattenObj = function(obj, prefix, depth, flat) {
		var i, p;
		prefix = prefix || '';
		depth = depth || 0;
		flat = flat || {};
		for (i in obj) {
			if (obj.hasOwnProperty(i)) {
				p = prefix ? (prefix+'_'+i) : i;
				if (self.isScalar(obj[i])) {
					flat[p] = obj[i];
				}
				else {
					self.flattenObj(obj[i], p, depth+1, flat);
				}
			}
		}
		if (!depth) {
			return flat;
		}
	};
	
	
	/** Inject arbitrarily nested template fields into a string of text. <br />
	 *	Fields are referenced like this:  {foo.bar.baz|truncate:300,byWord}<br />
	 *	<em><strong>Note:</strong> keys are CaSe-SeNsItIvE.</em>
	 *	@param {String} text				The text to template
	 *	@param {Object} fields				An object containing (nested) keys for replacement
	 *	@param {Boolean} [allowI18n=true]	Allow Internationalization using the engine referenced by {@link puredom.l18n}?
	 *	@returns {String} The templated text
	 */
	self.template = function(text, fields, allowI18n) {
		var templated,
			i18n;
		if (allowI18n!==false && self.i18n) {
			i18n = self.i18n;
		}
		templated = (text+'').replace(priv.regex.templateFieldToken, function(str, pre, id, filters) {
			var val;
			if (pre!=='\\' && id) {
				val = self.delve(fields, id);
				if (val) {
					if (i18n) {
						val = i18n(val) || val;
					}
					if (filters && filters.substring(0,1)==='|') {
						val = self.text.filter(val, filters.substring(1));
					}
					str = pre + val;
				}
				else {
					str = pre;
				}
			}
			else {
				str = pre;
			}
			return str;
		});
		return templated;
	};
	
	
	/** Simple prototypal inheritance.
	 *	@param {Function} baseClass		The base (child) class.
	 *	@param {Function} superClass	A class to inherit from.
	 *	@returns {Function} baseClass, for convenience
	 *	@example
	 * puredom.inherits(puredom.ControllerManager, puredom.EventEmitter);
	 */
	self.inherits = function(base, superClass) {
		function F(){}
		F.prototype = superClass.prototype;
		var proto = base.prototype;
		base.prototype = new F();
		puredom.extend(base.prototype, proto);
		base.prototype.constructor = base;
		base.prototype.__super = superClass;
	};
	
	
	/** Get the <strong>lowercase</strong> type (constructor name) of an object.<br />
	 *	<em><strong>Important Note:</strong> Unlike many other typeOf implementations, this method returns the name of an Object's constructor, rather than just "object".</em>
	 *	@param {Any} what		An object to analyze
	 *	@returns {String} type
	 *	@example
	 * puredom.typeOf({}) === 'object'
	 * puredom.typeOf([]) === 'array'
	 * puredom.typeOf(new Audio) === 'audio'
	 */
	self.typeOf = function(what) {
		if (what===undefined) {
			return 'undefined';
		}
		else if (what===null) {
			return 'null';
		}
		else if (what) {
			if (what.constructor===objConstructor) {
				return 'object';
			}
			else if (self.isArray(what)) {
				return 'array';
			}
		}
		//return (typeof(what)+"").toLowerCase();
		return Object.prototype.toString.call(what).replace(priv.regex.parseObjectNameFromString,'$1').toLowerCase();
	};
	
	
	/** Determines if the passed object is scalar.
	 *	@param {Any} what		An object to analyze
	 *	@returns {Boolean} isScalar
	 */
	self.isScalar = function(what) {
		var type = self.typeOf(what);
		if (type==='undefined' || type==='null' || type==='number' || type==='string' || type==='boolean') {
			return true;
		}
		return false;
	};
	
	
	/* Index of an element within an array */
	if (!Array.prototype.indexOf || ([self]).indexOf(self)!==0) {
		try {
			/**	@ignore */
			Array.prototype.indexOf = function(what) {
				for (var x=0; x<this.length; x++) {
					if (this[x]===what) {
						return x;
					}
				}
				return -1;
			};
		}catch(arrayIndexErr){}
	}
	
	
	/**	Convert an Array-like object (having a length and numeric properties) into an Array.
	 *	@param {Any} obj		An Array-like object to convert
	 *	@returns {Array} array	The converted <code>Array</code> on success, or the original object <code>obj</code> on failure.
	 */
	self.toArray = function(obj) {
		var arr = [],
			len = obj && obj.length,
			x, p;
		if (len || len===0) {
			for (x=len; x--; ) {
				arr[x] = obj[x];
			}
		}
		else {
			x = 0;
			while (true) {
				if (obj.hasOwnProperty && obj.hasOwnProperty(x)) {
					arr.push(obj[x]);
				}
				else if (obj.hasOwnProperty && obj.hasOwnProperty(x+'')) {
					arr.push(obj[x+'']);
				}
				else {
					break;
				}
				x += 1;
			}
		}
		return arr;
	};
	
	
	/** Determine if the argument is an Array
	 *	@function
	 *	@param {Any} what		An object to analyze
	 *	@returns {Boolean} isArray	<code>true</code> if the object is an <code>Array</code>, otherwise <code>false</code>.
	 */
	self.isArray = Array.isArray ? function(what) {
		return Array.isArray(what);
	} : function(what) {
		return Object.prototype.toString.call(what)==="[object Array]";
	};
	
	
	/** Determine if an object has a direct property with the given name.
	 *	@param {Any} obj		An object to test
	 *	@param {String} prop	A property name to test
	 *	@returns {Boolean} hasOwnProperty
	 */
	self.hasOwnProp = function(obj, prop) {
		return Object.prototype.hasOwnProperty.call(obj, prop);
	};
	
	
	/** Iterate over an object, calling an <code>iterator</code> function on each value.
	 *	@name puredom.forEach
	 *	@function
	 *	@param {Object|Array} obj		An object to iterate over.
	 *	@param {Function} iterator		A function to call for each value. Gets passed <code>(value, key)</code>.
	 *	@returns obj
	 */
	self.forEach = function(obj, iterator) {
		var i, r;
		if (self.isArray(obj)) {
			for (i=0; i<obj.length; i++) {
				r = iterator(obj[i], i);
				if (r===false) {
					break;
				}
			}
		}
		else {
			for (i in obj) {
				if (obj.hasOwnProperty(i)) {
					r = iterator(obj[i], i);
					if (r===false) {
						break;
					}
				}
			}
		}
		return obj;
	};
	
	/**	@ignore */
	self.foreach = self.forEach;
	
	
	/**	Set the innerHTML of an element, with fixes for various browser bugs
	 *	@private
	 *	@param {HTMLElement} el			An element whose content should be set
	 *	@param {String} html			The content to set
	 */
	self.setInnerHTML = function(el, html) {
		var frag, i;
		if (priv.support.html5) {
			el.innerHTML = html || '';
		}
		else {
			el.innerHTML = '';
			priv.html5div.innerHTML = html || '';
			frag = document.createDocumentFragment();
			for (i=priv.html5div.childNodes.length; i--; ) {
				frag.appendChild(priv.html5div.firstChild);
			}
			el.appendChild(frag);
		}
	};
	
	
	/** Create a DOM node from an Object description
	 *	@private
	 *	@param {Object} options			An object that describes how to construct the node
	 *	@param {HTMLElement} [parent]	Optional parent node to inject the newly constructed element into.
	 *	@returns {HTMLElement} node		Returns the created HTML element.
	 */
	self.createElement = function(options, parent) {
		var el, x, i, childFrag, processProp, insertedBefore;
		if (typeof options==='string') {
			childFrag = document.createElement('div');
			childFrag.innerHTML = options;
			for (i=0; i<childFrag.childNodes.length; i++) {
				el = childFrag.childNodes[i];
				if (el.nodeType===1) {
					if (parent) {
						parent.appendChild(el);
					}
				}
			}
			return el;
		}
		options = options || {};
		el = document.createElement(options.type || "div");
		parent = parent || options.parent;
		if (options.insertBefore && options.insertBefore.constructor===self.NodeSelection) {
			options.insertBefore = options.insertBefore._nodes[0];
		}
		if (!parent && options.insertBefore) {
			parent = options.insertBefore.parentNode;
		}
		for (x in options) {
			if (self.hasOwnProp(options, x)) {
				if ((x+"").substring(0,2).toLowerCase()==="on") {
					self.addEvent(el, x.substring(2), options[x]);
				}
				else if (x==="css" || x==="cssText") {
					if (vendorCssPrefix) {
						options[x] = options[x].replace(priv.regex.css3AutoPrefix, '$1'+vendorCssPrefix+'-$2:$3; $2:$3;');
						options[x] = options[x].replace(priv.regex.css3VendorPrefix, '-'+vendorCssPrefix+'-');
						el.style.cssText = options[x];
					}
					else {
						el.style.cssText = options[x];
					}
				}
				else if (x==='html' || x==='innerHTML') {
					self.setInnerHTML(el, options[x]);
				}
				else if (x==="attributes") {
					for (i in options[x]) {
						if (self.hasOwnProp(options[x], i)) {
							el.setAttribute(i, options[x][i]);
						}
					}
				}
				else if (x!=='parent' && x!=='children' && x!=='insertBefore' && x!=='type' && x!=='children' && x!=='html' && x!=='innerHTML') {
					if (document.all) {
						try {
							el[x] = options[x];
						}catch(err){
							self.log(x);
						}
					}
					else {
						el[x] = options[x];
					}
				}
				else {
					//self.log('Skipping "'+x+'" property in create()', options[x]);
				}
			}
		}
		if (parent) {
			if (options.insertBefore) {
				try {
					parent.insertBefore(el, options.insertBefore);
					insertedBefore = true;
				}catch(err) {
					insertedBefore = false;
				}
			}
			if (!insertedBefore) {
				parent.appendChild(el);
			}
		}
		
		if (options.children && self.isArray(options.children)) {
			childFrag = document.createDocumentFragment();
			for (x=0; x<options.children.length; x++) {
				self.createElement(options.children[x], childFrag);
			}
			el.appendChild(childFrag);
		}
		return el;
	};
	
	
	/**	Creates a new selection containing the elements of <code>nodes</code>. <br />
	 *	This class is not generally instantiated directly - instead, use the puredom() 
	 *	function to query for elements or wrap an Array of elements with a selection.
	 *	@class Represents a collection of DOM Elements. <br />
	 *	Puredom methods that work with DOM elements generally return an instance of this.
	 *	@name puredom.NodeSelection
	 *	@param {Array} nodes		An array of raw DOM nodes to wrap in a selection.
	 */
	self.NodeSelection = function NodeSelection(nodes) {
		var x;
		this._results = [];
		this._animations = [];
		if (nodes) {
			if (self.isArray(nodes)) {
				this._nodes = nodes = nodes.slice();
				for (x=nodes.length; x--; ) {
					if (!nodes[x]) {
						nodes.splice(x, 1);
					}
					else if (nodes[x] instanceof NodeSelection) {
						nodes = nodes.concat(nodes.splice(x, 1)[0]._nodes);
					}
				}
			}
			else {
				this._nodes = [nodes];
			}
		}
		else {
			this._nodes = [];
		}
	};

	self.extend(self.NodeSelection.prototype, /** @lends puredom.NodeSelection# */ {
		
		/**	@private */
		_results : [],
		
		/**	@private */
		_nodes : [],
		
		/**	@private */
		_animations : [],
		
		
		/**	Get an Array of String representations of each element in the selection. <br />
		 *	For a more logging-friendly option, see {@link puredom.NodeSelection#describe}.
		 */
		describe : function() {
			var p = [];
			this.each(function(node) {
				var str = '<' + node.nodeName(),
					id = node.prop('id'),
					className = node.prop('className'),
					cn, i, g;
				if (id) {
					str += ' id="' + id + '"';
				}
				if (className) {
					str += ' class="' + className + '"';
				}
				str += '>';
				if (node._nodes[0].childNodes.length===1 && node._nodes[0].childNodes[0].nodeType===3) {
					str += node.text().replace(/(\r|\n)/gim,decodeURIComponent("%E2%86%A9")).replace(/\t/gim,decodeURIComponent("%E2%86%92"));
				}
				else {
					str += '[' + node.children().count() + ' children]';
				}
				str += '</' + node.nodeName() + '>';
				p.push(str);
			});
			return p;
		},
		
		/**	Get a String representation of the selection's current contents. <br />
		 *	For the raw Array description, see {@link puredom.NodeSelection#describe}.
		 */
		toString : function() {
			return this.describe().join(', ');
		},
		
		/**	@private */
		toSource : function() {
			return this._nodes;
		},
		
		/**	Get the result of the previous operation. <br />
		 *	Many puredom methods return the selection they were called on rather than a standard return value.
		 *	This method gets the equivalent return value of the most recent selection method call.
		 *	@param {Number} [reverseIndex=0]		Optionally get an older return value. This value is a 0-based offset.
		 *	@returns {Any} returnValue, or <code>undefined</code> if no value was returned.
		 */
		getResult : function(reverseIndex) {
			reverseIndex = Math.round(reverseIndex) || 0;
			return this._results[this._results.length - reverseIndex - 1];
		},
		
		/**	@private */
		pushResult : function(result) {
			this._results.push(result);
			return this;
		},
		
		/**	Call an iterator function on each element in the selection, wrapping each in a new {@link puredom.NodeSelection}.<br />
		 *	<strong>Note:</strong> Return <code>false</code> from within <code>iterator</code> to break out of the loop.
		 *	@param {Function} iterator	Gets passed <code>(element, index)</code> for each element in the selection. The value of <code>this</code> is the selection itself.
		 *	@returns {this}
		 */
		each : function(action) {
			return this._each(action, true);
		},
		
		/**	Call an iterator function on each <strong>raw DOM node</strong> in the selection.<br />
		 *	<strong>Note:</strong> Return <code>false</code> from within <code>iterator</code> to break out of the loop.
		 *	@param {Function} iterator	Gets passed <code>(node, index)</code> for each element in the selection. The value of <code>this</code> is the selection itself.
		 *	@returns {this}
		 */
		_each : function(action, asSelection, inReverse) {
			var nodes = this._nodes.slice(0,this._nodes.length),
				x, y, node, ret;
			for (x=0; x<nodes.length; x++) {
				y = x;
				if (inReverse===true) {
					y = nodes.length-y-1;
				}
				node = nodes[y];
				if (asSelection===true) {
					node = new self.NodeSelection(node);
				}
				ret = action.call(this, node, y);
				if (ret===false) {
					break;
				}
			}
			return this;
		},
		
		/**	Call a function on the selection in the future.
		 *	@param {Number} millis		The number of milliseconds to wait before calling <code>callback</code>.
		 *	@param {Function} callback	The function to call in <code>millis</code> milliseconds. Gets called on the selection, so the value of <code>this</code> is the selection itself.
		 *	@returns {this}
		 */
		wait : function(millis, callback) {
			var self = this;
			if (callback) {
				setTimeout(function() {
					callback.apply(self);
					self = callback = null;
				}, Math.abs(millis));
			}
			return this;
		},
		
		/**	Get the <strong>lower-case</strong> nodeName of an element.<br />
		 *	<em><strong>Note:</strong> Only returns a UUID for the first element in a selection.</em> <br />
		 *	<strong>Note:</strong> In puredom, the <code>window</code> Object is given a nodeName of "#window".
		 *	@returns {String} nodeName
		 */
		nodeName : function() {
			var node = this._nodes[0],
				nodeName = node && node.nodeName && node.nodeName.toLowerCase();
			if (node===window) {
				return '#window';
			}
			else if (nodeName) {
				return nodeName;
			}
			return null;
		},
		
		/**	Get a globally unique identifier for an element. <br />
		 *	<em><strong>Note:</strong> Only returns a UUID for the first element in a selection.</em>
		 *	@returns {String} uuid
		 */
		uuid : function() {
			return this._nodes[0] && priv.nodeToId(this._nodes[0]) || null;
		},
		
		/**	Get or set the textual content of elements. Omit <code>text</code> to retrieve the textual value instead of setting it.
		 *	@param {String} [text]		If set, replaces the textual content of elements.
		 *	@returns {String} text		The textual contents of the first element in the selection, or the selection itself if <code>text</code> was not set.
		 */
		text : function(text) {
			if (arguments.length===0) {
				return this._nodes[0] && this._nodes[0][textContentProperty || getSupportedTextContentProperty()] || '';
			}
			text = text + "";
			this._each(function(el) {
				el[textContentProperty || getSupportedTextContentProperty()] = text;
			});
			return this;
		},
		
		/**	Set the HTML contents of elements.
		 *	@param {String} [content]			If set, updates the content of the elements. If not set, returns the HTML content of the first element.
		 *	@param {Boolean} [asText=auto]		If <code>true</code>, content will be treated as textual, if <code>false</code> content will be treated as HTML. Defaults to auto-detection of HTML.
		 *	@returns {String} text		The HTML or textual contents of the first element in the selection, or the selection itself if <code>html</code> was not set.
		 */
		html : function(content, asText) {
			if (arguments.length===0) {
				return this._nodes[0] && this._nodes[0].innerHTML || '';
			}
			content = content + "";
			priv.regex.autoDetectHTMLContent.lastIndex = 0;
			if ((priv.regex.autoDetectHTMLContent).test(content) && asText!==true) {
				//self.log("Detected HTML in .html() insertion, using innerHTML...", {content:content});
				//alert('setting HTML: ' + content);
				this._each(function(el) {
					self.setInnerHTML(el, content);
				});
			}
			else {
				//alert('setting PLAIN: ' + content);
				//self.log("Detected plain text in .html() insertion, using textContent or equivalent...", {content:content});
				this._each(function(el) {
					el[textContentProperty || getSupportedTextContentProperty()] = content;
				});
			}
			return this;
		},
		
		/**	Apply CSS to elements.
		 *	@param {String|Object} css				CSS to apply to the elements in the selection. Either a CSS-string, or an Object where the keys are CSS properties and the values are the corresponding values to apply.
		 *	@param {Object} [options]				Options
		 *	@param {Number|String} [options.tween]	Animate the application of the given CSS styles. Numeric values are treated as durations, String values must be a comma-separated value of the format: "duration,easing-method".
		 *	@param {Function} [options.callback]	A function to call once the styles have been applied. If tweening/animating, gets called once the animation has completed.
		 *	@param {Function} callback				Same as <code>options.callback</code>, takes precidence when used.
		 *	@returns {this}
		 */
		css : function(css, options, callback) {
			var type,
				selection = this;
			options = options || {};
			if (typeof options==='string' || typeof options==='number') {
				options = {tween:options};
			}
			if (!callback && options.callback) {
				callback = options.callback;
			}
			if (!callback || !callback.call) {
				callback = priv.noop;
			}
			type = self.typeOf(options.tween);
			if (typeof css==='string') {
				css = priv.parseCSS(css);
			}
			if ((type==='string' && options.tween!=='none') || (type==='number' && options.tween>0)) {
				var tween = (options.tween + '').replace(priv.regex.whitespaceCharacters,'').split(','),
					x,
					cb,
					total = 0,
					completed = 0;
				cb = function(node) {
					completed += 1;
					if (completed>=total) {
						cb = null;
						if (callback) {
							callback.call(selection, selection);		// node
						}
						selection = callback = node = null;
					}
				};
				for (x in css) {
					if (css.hasOwnProperty(x)) {
						total += 1;
						this.animateCss(x, css[x], tween[0], tween[1], cb);
					}
				}
			}
			else {
				this._each(function(el) {
					self.applyCss(el, css);
				});
				
				if (callback) {
					setTimeout(function(){
						callback.call(selection, selection);
						selection = callback = null;
					}, 1);
				}
				else {
					selection = null;
				}
			}
			return this;
		},
		
		/** Show elements.
		 *	@returns {this}
		 */
		show : function() {
			this.css({
				display		: '',
				visibility	: 'visible'
			});
			// ensure the new active style is not display:none
			this._each(function(node) {
				if (node.style.display==='none' || self.nodeStyle(node, 'display')==='none') {
					node.style.display = 'block';
				}
			});
			return this;
		},
		
		/** Hide elements.
		 *	@param {Boolean} [andIgnore=true]		If <code>false</code>, triggers "visibility:hidden" CSS, instead of "display:none".
		 *	@returns {this}
		 */
		hide : function(andIgnore) {
			/*
			var disp = this.getStyle('display',true);
			if (disp && disp!=='none') {
				this._previousDisplayStyle = disp;
			}
			*/
			return this.css(
				andIgnore===false ? {visibility:'hidden'} : {display:'none'}
			);
		},
		
		/**	This function tries quite hard to guess what particular fade effect is needed. <br />
		 *	If the element that is already semi-transparent, it fades from the current opacity. <br />
		 *	If the element that is hidden but not explicitly transparent, it fades from opacity=0 (hidden). <br />
		 *	If the element is already 100% opaque (non-transparent), no animation is performed, and the callback is fired after a very small delay (to enforce async). <br />
		 *	Arguments are interchangeable for backward compatibility.
		 *	@param {Number|String} tween	A tween value. Can be a <code>{Number} duration</code>, or <code>{String} "duration,easing-method"</code>.
		 *	@param {Function} [callback]	A function to call once the fade has completed. Gets passed the selection.
		 *	@returns {this}
		 */
		fadeIn : function(tween, callback) {
			var originalOpacity = parseFloat(this.getStyle('opacity') || '0') || 0,
				targetOpacity = 1;
			if (this.getStyle('display')==='none' || this.getStyle('visibility')==='hidden') {
				if (this.getStyle('opacity') && originalOpacity>0 && originalOpacity<1) {
					targetOpacity = originalOpacity;
				}
				originalOpacity = 0;
				this.css({
					opacity : 0
				});
			}
			// arguments can be in reverse order
			if (self.typeOf(tween)==='function') {
				callback = tween;
				tween = arguments[1];
			}
			if (originalOpacity>=1 || tween===0 || tween===false) {
				this.css({
					opacity : targetOpacity
				}).show();
				if (callback && callback.call) {
					setTimeout(callback, 0);
				}
				return this;
			}
			this.css({
				opacity : targetOpacity
			}, {tween:tween || 'medium', callback:function(selection) {
				if (callback) {
					callback(selection);
				}
				tween = callback = null;
			}}).show();
			return this;
		},
		
		/**	The opposite of fadeIn(). Makes several guesses about the desired effect. */
		fadeOut : function(tween, callback, andIgnore) {
			var originalOpacity = parseFloat(this.getStyle('opacity') || '1') || 1;
			if (self.typeOf(tween)==='function') {
				callback = tween;
				tween = arguments[1];
			}
			if (self.typeOf(callback)==='boolean') {
				andIgnore = callback;
				callback = null;
				if (self.typeOf(arguments[2])==='function') {
					callback = arguments[2];
				}
			}
			if (originalOpacity<=0 || this.getStyle('display')==='none' || this.getStyle('visibility')==='hidden' || tween===0 || tween===false) {
				this.css({
					opacity : 0
				}).hide(andIgnore);
				setTimeout(callback, 0);
				return this;
			}
			this.css({
				opacity : 0
			}, {tween:tween || 'medium', callback:function(selection) {
				selection.hide(andIgnore).css({
					opacity : originalOpacity
				});
				if (callback) {
					callback(selection);
				}
				tween = callback = null;
			}});
			return this;
		},
		
		/**	Automatically detects and uses CSS3 transitions.
		 *	@private
		 */
		animateCSS : (function() {
			var manual, cssTransition, supportsCssTransition, checkCssTransitionSupport;
			
			/**	@ignore */
			manual = function(cssProp, targetValue, duration, easing, callback) {
				var startValues = [],
					perNodeProperties = [],
					numericTargetValue, units, s;
				
				cssProp = cssProp.toLowerCase();
				
				if (targetValue!=='auto') {
					numericTargetValue = parseFloat((targetValue + '').replace(priv.regex.getNumericCSSValue,'')) || 0;
					s = self.typeOf(targetValue)==='string' && targetValue.match(priv.regex.getCSSValueUnits);
					units = (s && s[0]) || 'px';
					if (cssProp==='opacity') {
						units = '';
					}
				}
				else {
					units = cssProp==='opacity' ? '' : 'px';
				}
				
				this._each(function(node, i) {
					var ts, tss, testCssObj={}, iprop, vis;
					
					startValues[i] = parseFloat((self.nodeStyle(node, cssProp) + '').replace(priv.regex.getNonIntegerCharsSigned,'')) || 0;
					
					if (targetValue==='auto' || targetValue==='') {
						vis = node.style.visibility || '';
						testCssObj[cssProp] = targetValue;
						testCssObj.visibility = 'hidden';
						self.applyCss(node, testCssObj);
						ts = self.nodeStyle(node, cssProp);
						if (ts===targetValue || ts.indexOf('px')<ts.length-3) {
							iprop = cssProp.substring(0,1).toUpperCase() + cssProp.substring(1).toLowerCase();
							ts = node['offset'+iprop] + 'px';
						}
						tss = self.typeOf(ts)==='string' && ts.match(priv.regex.getCSSValueUnits);
						perNodeProperties[i] = {
							_actualTarget : targetValue,
							numericTargetValue : parseFloat((ts + '').replace(priv.regex.getNumericCSSValue,'')) || 0,
							units : cssProp==='opacity' ? '' : (tss && tss[0] || 'px')
						};
						setTimeout(function() {
							node.style.visibility = vis;
							node = null;
						}, 51);
						testCssObj = ts = tss = null;
					}
					else {
						perNodeProperties[i] = {
							numericTargetValue : numericTargetValue,
							units : units
						};
					}
				});
				
				return this.animate(function(fraction, anim) {
					this._each(function(node, i) {
						var cssObj = {},
							value = (fraction * (perNodeProperties[i].numericTargetValue-startValues[i]) + startValues[i]),
							floatVal,
							units = perNodeProperties[i].units;
						if (units==='px') {
							value = Math.round(value);
						}
						else {
							floatVal = parseFloat(value);
							if (floatVal%1===0) {
								value = Math.round(floatVal);
							}
							else {
								value = floatVal.toFixed(2);
							}
						}
						cssObj[cssProp] = value + units;
						self.applyCss(node, cssObj);
					});
				}, duration, easing, function(sel) {
					sel._each(function(node, i) {
						var cssObj = {};
						if (perNodeProperties[i]._actualTarget) {
							cssObj[cssProp] = perNodeProperties[i]._actualTarget;
							self.applyCss(node, cssObj);
						}
					});
					callback.apply(sel, arguments);
				});
			};
			
			/**	@ignore */
			cssTransition = function(cssProp, targetValue, duration, easing, callback) {
				var anim = this._createAnimationObj(function(){}, duration, easing, callback),
					me = this,
					transition = {},
					css = {};
				
				cssProp = self.getStyleAsProperty(cssProp);
				if (self.typeOf(targetValue)==='number' && (cssProp+'').toLowerCase()!=='opacity') {
					targetValue = targetValue + 'px';
				}
				
				transition[self.getStyleAsCSS(cssProp)] = {
					duration : anim.duration,
					timingFunction : anim.easing
				};
				
				css[cssProp] = targetValue;
				
				setTimeout(function() {
					/**	@ignore */
					me._each(function(node) {
						self.updateCssTransitions(node, transition);
						self.applyCss(node, css);
						priv.incrementAnimationCount(node);
					});
					/**	@ignore */
					anim._cb = function() {
						if (anim) {
							
							/** remove CSS transition definitions from the generated CSS:
							 *	@ignore
							 */
							var nullTransition = {};
							nullTransition[cssProp] = null;
							me._each(function(node) {
								self.updateCssTransitions(node, nullTransition);
								priv.decrementAnimationCount(node);
							});
							
							if (anim.callback) {
								anim.callback.call(me, me);
							}
							for (var x in anim) {
								if (anim.hasOwnProperty(x)) {
									try{ delete anim[x]; }catch(err){}
								}
							}
						}
						anim = css = callback = me = null;
					};
					setTimeout(anim._cb, (parseInt(anim.duration,10) || 0)+20);
				}, 10);
			};
			
			/**	@ignore */
			checkCssTransitionSupport = function() {
				supportsCssTransition = document.body.style[vendorCssPrefixJS+'Transition']!==undefined || document.body.style.transition!==undefined;
				return supportsCssTransition;
			};
			
			return function(cssProp, targetValue, duration, easing, callback) {
				var iosCompat=false, x;
				if (self.typeOf(supportsCssTransition)!=='boolean') {
					checkCssTransitionSupport();
				}
				if ((self.allowCssTransitions!==false || iosCompat===true) && supportsCssTransition) {
					cssTransition.apply(this, arguments);
				}
				else {
					manual.apply(this, arguments);
				}
				return this;
			};
		}()),
		
		animate : function(animator, duration, easing, callback) {
			if (animator) {
				var nodeSelection = this,
					anim = this._createAnimationObj.apply(this, arguments),
					frame;
				
				this._each(function(node) {
					priv.incrementAnimationCount(node);
				});
				
				frame = function(now) {
					anim.frameTime = now;
					anim.position = anim.frameTime - anim.start;
					anim.fraction = anim.position / anim.duration;
					if (anim.position>=anim.duration) {
						anim.fraction = 1;
						anim.position = anim.duration;
					}
					else if (anim.easingMethod) {
						anim.fraction = anim.easingMethod.call(self.easingMethods, anim.fraction, anim);
					}
					
					anim.animator.call(nodeSelection, anim.fraction, anim);
					
					if (anim.fraction===1) {
						for (var x=nodeSelection._animations.length; x--; ) {
							if (nodeSelection._animations[x]===anim) {
								nodeSelection._animations.splice(x, 1);
								break;
							}
						}
						if (anim.callback) {
							setTimeout(function() {
								nodeSelection._each(function(node) {
									priv.decrementAnimationCount(node);
								});
								anim.callback.call(nodeSelection, nodeSelection, anim);
								nodeSelection = anim = null;
							}, 10);
						}
					}
					else {
						anim.timer = self.animationFrame.getTimer(frame, self.baseAnimationInterval || 10);
					}
				};
				
				self.animationFrame.getTimer(frame, self.baseAnimationInterval || 10);
				
				this._animations.push(anim);
			}
			return this;
		},

		/**	@private */
		_createAnimationObj : function(animator, duration, easing, callback) {
			var anim = {
				animator	: animator,
				duration	: duration,
				easing		: self.typeOf(easing)==='string' ? easing : 'ease',
				callback	: callback,
				start		: self.animationFrame.getStartTime(),
				frameTime	: null
			};
			
			if (self.typeOf(anim.duration)==='string') {
				switch (anim.duration.toLowerCase()) {
					case 'long':
					case 'slow':
						anim.duration = priv.animationTimes.slow;
						break;
					case 'short':
					case 'fast':
						anim.duration = priv.animationTimes.fast;
						break;
					default:
						anim.duration = parseInt(anim.duration, 10) || priv.animationTimes.medium;
				}
			}
			else {
				anim.duration = Math.round(anim.duration) || priv.animationTimes.medium;
			}
			
			if (priv.animationTimeScale) {
				anim.duration *= priv.animationTimeScale;
			}
			
			if (anim.easing && self.easingMethods.hasOwnProperty(anim.easing)) {
				anim.easingMethod = self.easingMethods[anim.easing];
			}
			else {
				anim.easing = null;
			}
			return anim;
		},
		
		/**	Add a CSS class to the selection. <br />
		 *	Pass an Array and/or multiple arguments to add multiple classes.
		 *	@param {String} className		A CSS class to add.
		 *	@returns {this}
		 */
		classify : function(className) {
			var classes = [],
				method = arguments[0]==='{*^de^*}' ? 'removeClass' : 'addClass',
				x, y;
			for (x=0; x<arguments.length; x++) {
				if (self.isArray(arguments[x])) {
					for (y=0; y<arguments[x].length; y++) {
						classes.push(arguments[x][y]);
					}
				}
				else {
					classes.push(arguments[x]);
				}
			}
			this._each(function(el) {
				self[method](el, classes);
			});
			return this;
		},
		
		/**	Remove a CSS class to the selection. <br />
		 *	Pass an Array and/or multiple arguments to remove multiple classes.
		 *	@param {String} className		A CSS class to remove.
		 *	@returns {this}
		 */
		declassify : function(className) {
			var args = ['{*^de^*}'].concat(Array.prototype.slice.call(arguments, 0));
			return this.classify.apply(this, args);
		},
		hasClass : function(className, ifAny) {
			var result = ifAny!==true;
			this._each(function(node) {
				var exists = (' '+node.className+' ').indexOf(' '+className+' ')>-1;
				if (ifAny===true) {
					if (exists) {
						result = true;
					}
				}
				else if (!exists) {
					result = false;
				}
			});
			return result;
		},
		setOpacity : function(opacity) {
			this._each(function(el) {
				self.setOpacity(el, opacity);
			});
			return this;
		},
		sumOf : function(method) {
			var total = 0,
				args = Array.prototype.slice.call(arguments, 1);
			if (this.constructor.prototype.hasOwnProperty(method)) {
				this._each(function(node) {
					node = new self.NodeSelection(node);
					total += node[method].apply(node, args);
				});
			}
			return total;
		},
		height : function(height, options) {
			var units,
				node,
				matches,
				offsetHeight = 0;
			if (self.typeOf(height)==='object' && !options) {
				options = height;
				height = null;
			}
			options = options || {};
			if (height || height===0) {
				height = height + '';
				if (height==='auto') {
					units = '';
				}
				else {
					matches = (/^([\-0-9\.]+)(.*?)$/).exec(height);
					height = Math.round(matches && matches[1] || height) || 0;
					units = matches && matches[2] || 'px';
				}
				this.css({
					height : height + units
				});
				return this;
			}
			this._each(function(node) {
				offsetHeight += parseInt(node.offsetHeight, 10) || 0;
				if (options.border!==true) {
					offsetHeight -= parseInt( (self.nodeStyle(node, 'border-top-width')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
					offsetHeight -= parseInt( (self.nodeStyle(node, 'border-bottom-width')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
				}
				if (options.margin===true) {
					offsetHeight += parseInt( (self.nodeStyle(node, 'margin-top')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
					offsetHeight += parseInt( (self.nodeStyle(node, 'margin-bottom')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
				}
				if (options.padding===false) {
					offsetHeight -= parseInt( (self.nodeStyle(node, 'padding-top')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
					offsetHeight -= parseInt( (self.nodeStyle(node, 'padding-bottom')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
				}
			});
			return offsetHeight;
		},
		width : function(width, options) {
			var units,
				node,
				matches,
				offsetWidth = 0;
			if (self.typeOf(width)==='object' && !options) {
				options = width;
				width = null;
			}
			options = options || {};
			if (width || width===0) {
				width = width + '';
				if (width==='auto') {
					units = '';
				}
				else {
					matches = (/^([\-0-9\.]+)(.*?)$/).exec(width);
					width = matches && matches[1] || width;
					units = matches && matches[2] || 'px';
				}
				this.css({
					width : width + units
				});
				return this;
			}
			this._each(function(node) {
				offsetWidth += parseInt(node.offsetWidth, 10) || 0;
				if (options.border!==true) {
					offsetWidth -= parseInt( (self.nodeStyle(node, 'border-left-width')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
					offsetWidth -= parseInt( (self.nodeStyle(node, 'border-right-width')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
				}
				if (options.margin===true) {
					offsetWidth += parseInt( (self.nodeStyle(node, 'margin-left')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
					offsetWidth += parseInt( (self.nodeStyle(node, 'margin-right')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
				}
				if (options.padding===false) {
					offsetWidth -= parseInt( (self.nodeStyle(node, 'padding-left')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
					offsetWidth -= parseInt( (self.nodeStyle(node, 'padding-right')+'').replace(priv.regex.getNonIntegerCharsSigned,'') ,10) || 0;
				}
			});
			return offsetWidth;
		},
		x : function(absolute, mark) {
			var node = this._nodes[0],
				pos = null,
				posProp;
			if (node) {
				pos = node.offsetLeft;
				if (absolute===true) {
					while((node=node.parentNode) && node!==document) {
						pos += parseFloat(node.offsetLeft) || 0;
					}
				}
			}
			return pos;
		},
		y : function(absolute) {
			var node = this._nodes[0],
				pos = null;
			if (node) {
				pos = node.offsetTop;
				if (absolute===true) {
					while((node=node.parentNode) && node!==document) {
						pos += parseFloat(node.offsetTop) || 0;
					}
				}
			}
			return pos;
		},
		position : function(x, y, tween, units) {
			var css;
			units = units || 'px';
			if (arguments.length<1 || (arguments.length===1 && arguments[0]===true)) {
				return {
					x : this.x(arguments[0]===true),
					y : this.y(arguments[0]===true)
				};
			}
			else {
				css = {};
				if (puredom.typeOf(x)==='number') {
					css.left = x + units;
				}
				else if (puredom.typeOf(x)==='string') {
					css.left = x;
				}
				if (puredom.typeOf(y)==='number') {
					css.top = y + units;
				}
				else if (puredom.typeOf(y)==='string') {
					css.top = y;
				}
				this.css(css, tween);
				return this;
			}
		},
		scrollLeft : function(value) {
			if (value || value===0) {
				if (self.typeOf(value)!=='number') {
					value = Math.round((value+'').replace(priv.regex.getNonIntegerCharsSigned,''));
				}
				this._each(function(node) {
					node.scrollLeft = value;
				});
			}
			else {
				return this._nodes && this._nodes[0] && this._nodes[0].scrollLeft || 0;
			}
		},
		scrollTop : function(value) {
			if (value || value===0) {
				if (self.typeOf(value)!=='number') {
					value = Math.round((value+'').replace(priv.regex.getNonIntegerCharsSigned,''));
				}
				this._each(function(node) {
					node.scrollTop = value;
				});
			}
			else {
				return this._nodes && this._nodes[0] && this._nodes[0].scrollTop || 0;
			}
		},
		focus : function() {
			this._each(function(node) {
				if (node.focus) {
					node.focus();
				}
			});
			return this;
		},
		blur : function() {
			this._each(function(node) {
				if (node.blur) {
					node.blur();
				}
			});
			return this;
		},
		selectAll : function() {
			this._each(function(node) {
				if (node.SelectAll) {
					node.SelectAll();
				}
				if (node.select) {
					node.select();
				}
				if (node.selectionStart && node.hasOwnProperty('value')) {
					node.selectionStart = 0;
					node.selectionEnd = node.value.length;
				}
			});
		},
		getStyle : function(prop, returnValue) {
			var props = [];
			this._each(function(node) {
				props.push( self.nodeStyle(node, prop) || null );
			});
			if (returnValue===false) {
				this.pushResult(props);
				return this;
			}
			return props.length<=1 ? props[0] : props;
		},
		value : function(newValue, options) {
			options = options || {};
			if (newValue!==null && newValue!==undefined && arguments.length>0) {
				// set the value
				this._each(function(node) {
					var name = (node.nodeName+'').toLowerCase(),
						type = (node.getAttribute('type') || '').toLowerCase();
					
					if (name==='input' && (type==='checkbox' || type==='radio')) {
						node.checked = !!newValue;
					}
					else {
						node.value = newValue;
					}
					
					if (options.fireChange!==false) {
						self.fireEvent({
							type : 'change',
							target : node,
							value : newValue
						});
					}
				});
				
				return this;
			}
			else {
				// get and return the value
				var values = [];
				this._each(function(node) {
					var name = (node.nodeName+'').toLowerCase(),
						type = (node.getAttribute('type') || '').toLowerCase(),
						value;
					if (name==='input' && (type==='checkbox' || type==='radio')) {
						values.push(!!node.checked);
					}
					else if (name==='select') {
						value = (node.multiselect || node.multiSelect) ? [] : null;
						self.el(node).query('option')._each(function(option) {
							if (option.selected || option.checked) {
								if (self.isArray(value)) {
									value.push(option.value);
								}
								else {
									value = option.value;
								}
							}
						});
						values.push(value);
					}
					else {
						values.push(node.value);
					}
				});
				return values.length<2 ? values[0] : values;
			}
		},
		attr : function(key, value, returnValue) {
			var attrs = [], i, k;
			if (arguments.length===0) {
				attrs = {};
				for (i=this._nodes[0].attributes.length; i--; ) {
					k = this._nodes[0].attributes[i];
					// skip over non-user-specified attributes in IE
					if (k.specified) {
						attrs[k.name || k.nodeName] = k.value || k.nodeValue;
					}
				}
				return attrs;
			}
			else if (arguments.length>1) {
				if (self.typeOf(key)==='object') {
					for (i in key) {
						if (typeof(i)==='string' && key.hasOwnProperty(i)) {
							this.attr(attrs, key[i]);
						}
					}
					return this;
				}
				return this._each(function(node) {
					try {
						node.setAttribute(key, value);
						if (node.removeAttribute && (value===null || value===undefined)) {
							node.removeAttribute(key);
						}
					} catch(err) {}
				});
			}
			else {
				this._each(function(node) {
					var a = node.getAttribute(key);
					if (typeof(a)!=='string') {
						a = null;
					}
					attrs.push( a );
				});
				if (returnValue===false) {
					this.pushResult(attrs);
					return this;
				}
				return attrs.length<=1 ? attrs[0] : attrs;
			}
		},
		prop : function(key, value, returnValue) {
			var props = [];
			if (arguments.length>1) {
				return this._each(function(node) {
					node[key] = value;
					if (value===undefined) {
						try{ delete node[key]; }catch(err){}
					}
				});
			}
			else {
				this._each(function(node) {
					var val;
					try {
						val = node[key];
					}catch(err){
						self.log('NodeSelection#prop('+key+') :: Access Error', err);
					}
					props.push( val || null );
				});
				if (returnValue===false) {
					this.pushResult(props);
					return this;
				}
				return props.length<=1 ? props[0] : props;
			}
		},
		enable : function() {
			this.attr('disabled', null);
			this.declassify('_puredom_disabled');
			return this;
		},
		disable : function() {
			this.attr('disabled', 'disabled');
			this.classify('_puredom_disabled');
			return this;
		},
		enabled : function(newValue) {
			if (newValue===true || newValue===false) {
				this[newValue?'enable':'disable']();
				return this;
			}
			else {
				return this.attr('disabled')!=='disabled' && this.prop('disabled')!==true && !this.hasClass('_puredom_disabled');
			}
		},

		/**	Register an event handler. <br />
		 *	When an event of the given type is triggered, the handler function is called.
		 *	@param {String} eventType		An event type to listen for
		 *	@param {Function} handler		A handler to call in response to the event
		 *	@example
		 *		function clickHandler(e){ alert(e.button); }
		 *		foo.addEvent("click", clickHandler);
		 *	@returns {this}
		 */
		addEvent : function(eventType, handler, useCapture) {
			this._each(function(el) {
				self.addEvent(el, eventType, handler, useCapture);
			});
			return this;
		},

		/**	Un-register an event handler.
		 *	@param {String} eventType		The event type
		 *	@param {Function} handler		The handler to remove
		 *	@example
		 *		foo.removeEvent("click", clickHandler);
		 *	@returns {this}
		 */
		removeEvent : function(eventType, handler, useCapture) {
			this._each(function(el) {
				self.removeEvent(el, eventType, handler, useCapture);
			});
			return this;
		},

		/**	Fire an event on the selection.
		 *	@param {String} type		An event type
		 *	@param {Object|Event} e		The event data
		 *	@returns {this}
		 */
		fireEvent : function(type, e) {
			this._each(function(node) {
				self.fireEvent(self.extend({}, e || {}, {
					type : type,
					target : node
				}));
			});
			return this;
		},

		/**	@private */
		_removeAllEvents : function(deep) {
			var children;
			this._each(function(node) {
				priv.wrappedEventListener.destroyObjHandlers(node, true);
			});
			children = this.children();
			if (deep===true && children.count()>0) {
				children._removeAllEvents(true);
			}
			children = deep = null;
			return this;
		},

		/**	Append an element to the DOM.
		 *	@param {puredom.NodeSelection|HTMLElement} child	An element or a Selection of elements to append
		 *	@returns {this}
		 */
		appendChild : function(child) {
			if (child && this._nodes.length>0) {
				if (child.constructor===this.constructor) {
					var parent = this._nodes[0];
					child._each(function(node) {
						parent.appendChild(node);
					});
				}
				else {
					this._nodes[0].appendChild(child);
				}
			}
			return this;
		},

		/**	Insert an element into the DOM before a given reference element.
		 *	@param {puredom.NodeSelection|HTMLElement} child	An element or a Selection of elements to insert
		 *	@param {puredom.NodeSelection|HTMLElement} before	An element or a Selection to insert <code>child</code> before
		 *	@returns {this}
		 */
		insertBefore : function(child, before) {
			if (child && this._nodes.length>0) {
				if (before && before.constructor===this.constructor) {
					before = before._nodes[0];
				}
				if (!before || before.parentNode!==this._nodes[0]) {
					return this.appendChild(child);
				}
				if (child.constructor===this.constructor) {
					var parent = this._nodes[0];
					child._each(function(node) {
						parent.insertBefore(node, before);
					}, null, true);
				}
				else {
					this._nodes[0].insertBefore(child, before);
				}
			}
			return this;
		},

		/**	Insert all elements in the Selection into a given parent. <br />
		 *	Uses document fragments to improve performance when inserting a Selection containing multiple nodes.
		 *	@param {puredom.NodeSelection|HTMLElement} what		A parent into which the selection should be inserted
		 *	@returns {this}
		 */
		insertInto : function(what) {
			var frag;
			if (what && this.count()>0) {
				if (what.constructor===this.constructor) {
					what = what._nodes[0];
				}
				if (this.count()===1) {
					what.appendChild(this._nodes[0]);
				}
				else {
					// TODO: Why was this added for IE? Was this a bug?
					//frag = priv.support.filters===true ? what : document.createDocumentFragment();
					frag = document.createDocumentFragment();
					this._each(function(node) {
						frag.appendChild(node);
					}, null, true);							// reverse
					if (priv.support.filters!==true) {
						what.appendChild(frag);
					}
				}
			}
			return this;
		},

		/**	Remove all elements in the Selection from the DOM.
		 *	@returns {this}
		 */
		remove : function() {
			this.fireEvent('remove');
			this._each(function(node) {
				if (node.parentNode) {
					node.parentNode.removeChild(node);
				}
			});
			return this;
		},

		/**	Remove all elements in the Selection from the DOM, and <strong>destroy them</strong>. <br />
		 *	<strong>Note:</strong> This also removes all elements from the Selection.
		 *	@returns {this}
		 */
		destroy : function() {
			this.remove();
			this.fireEvent('destroy');
			this._removeAllEvents(true);
			this._nodes.splice(0, this._nodes.length);
			return this;
		},

		/**	Search for elements within the Selection's tree that match the given CSS selector. <br />
		 *	<strong>Note:</strong> This is a scoped version of puredom(selector).
		 *	@param {String} selector	A CSS selector
		 *	@param {Object} [options]	Options, which get passed to puredom()
		 *	@returns {puredom.NodeSelection} results
		 */
		query : function(selector, options) {
			var results = [];
			if (this._nodes.length>0) {
				options = puredom.extend({}, options || {});
				this._each(function(node) {
					var r;
					options.within = node;
					r = self.getElement(selector, options);
					if (self.isArray(r) && r.length>0) {
						results = results.concat(r);
					}
				});
			}
			return new self.NodeSelection(results);
		},

		/**	Clone the selection, optionally into a new parent node.
		 *	@param {Boolean} [deep=true]	Perform a deep clone, which clones all descendent nodes.
		 *	@param {Object} [newParent]		Optionally inject into a new parentNode. Pass <code>true</code> to clone into the same parent.
		 *	@returns {puredom.NodeSelection} clonedSelection
		 */
		clone : function(deep, newParent) {
			var sel = [];
			if (newParent===true) {
				newParent = this.parent();
			}
			this._each(function(node) {
				sel.push( node.cloneNode(deep!==false) );
			});
			sel = new self.NodeSelection(sel);
			if (newParent) {
				newParent.appendChild(sel);
			}
			sel._each(priv.removeNodeUID);
			if (deep!==false) {
				sel.query('*')._each(priv.removeNodeUID);
			}
			return sel;
		},

		/**	Get the number of elements in the Selection.
		 *	@returns {Number} count
		 */
		count : function() {
			return this._nodes.length;
		},

		/**	Check if the selection contains at least one element.
		 *	@returns {Boolean} exists
		 */
		exists : function() {
			return this.count()>0;
		},

		/**	Get a new Selection containing both the next and previous sibling elements of each element in the current Selection.
		 *	@returns {puredom.NodeSelection} siblings
		 */
		siblings : function() {
			var newSelection = new self.NodeSelection();
			this._each(function(node) {
				var n = node;
				while ((n=n.previousSibling)) {
					if (n.nodeName!=='#text' && n.nodeName!=='#comment' && n.nodeType!==3) {
						newSelection._nodes.push(n);
					}
				}
				n = node;
				while ((n=n.nextSibling)) {
					if (n.nodeName!=='#text' && n.nodeName!=='#comment' && n.nodeType!==3) {
						newSelection._nodes.push(n);
					}
				}
			});
			return newSelection;
		},

		/**	Get a new Selection containing the next sibling elements of each element in the current Selection.
		 *	@returns {puredom.NodeSelection} nextSiblings
		 */
		next : function() {
			var sib = this._nodes[0] && this._nodes[0].nextSibling;
			while (sib && sib.nodeType===3) {
				sib = sib.nextSibling;
			}
			return new self.NodeSelection(sib && [sib] || null);
		},

		/**	Get a new Selection containing the previous sibling elements of each element in the current Selection.
		 *	@returns {puredom.NodeSelection} previousSiblings
		 */
		prev : function() {
			var sib = this._nodes[0] && this._nodes[0].previousSibling;
			while (sib && sib.nodeType===3) {
				sib = sib.previousSibling;
			}
			return new self.NodeSelection(sib && [sib] || null);
		},

		/**	Alais of {@link puredom.NodeSelection#prev} */
		previous : function() {
			return this.prev.apply(this,arguments);
		},

		/**	Get a new Selection containing the first direct child element of the current Selection.
		 *	@returns {puredom.NodeSelection} firstChild
		 */
		firstChild : function() {
			return this.children().first();
		},

		/**	Get a new Selection containing the last direct child element of the current Selection.
		 *	@returns {puredom.NodeSelection} firstChild
		 */
		lastChild : function() {
			return this.children().last();
		},

		/**	Get a new Selection containing the direct child element of the current Selection at index <code>n</code>.
		 *	@param {Number} n		A 0-based index.
		 *	@returns {puredom.NodeSelection} nthChild
		 */
		nthChild : function(n) {
			return this.children().index(n);
		},

		/**	Get a new Selection containing only the first element in the current Selection.
		 *	@returns {puredom.NodeSelection} first
		 */
		first : function(n) {
			return new self.NodeSelection( this._nodes.slice(0, n || 1) );
		},

		/**	Get a new Selection containing only the last element in the current Selection.
		 *	@returns {puredom.NodeSelection} last
		 */
		last : function(n) {
			return new self.NodeSelection( this._nodes.slice(this._nodes.length-(n || 1)) );
		},

		/**	Get a new Selection containing only the <code>n</code> element(s) in the current Selection starting at index <code>i</code>.
		 *	@param {Number} i		A 0-based index of the elements(s) to return
		 *	@param {Number} [n=1]	The number of elements to return
		 *	@returns {puredom.NodeSelection} slice
		 */
		index : function(i, n) {
			return new self.NodeSelection(self.typeOf(i)==='number' && this._nodes.slice(i, i + (n || 1)) || null);
		},

		/**	Get a new Selection containing the de-duped parent elements of the current Selection.
		 *	@returns {puredom.NodeSelection} parents
		 */
		parent : function() {
			var nodes=[], parent;
			this._each(function(node) {
				parent = node.parentNode;
				// Note: all newly created elements are placed into a document fragment in IE. 
				// Unfortunately, this means parentNodes that are #document-fragment's can't be considered valid (lowest-common).
				if (parent && nodes.indexOf(parent)<0 && parent.nodeType!==11) {
					nodes.push(parent);
				}
			});
			return new self.NodeSelection(nodes);
		},

		/**	Get a new Selection containing all direct child elements of the current Selection.
		 *	@returns {puredom.NodeSelection} children
		 */
		children : function() {
			var children = [], 
				x, y;
			if (this._nodes.length>0) {
				for (x=0; x<this._nodes.length; x++) {
					if (this._nodes[x].childNodes) {
						for (y=0; y<this._nodes[x].childNodes.length; y++) {
							if (this._nodes[x].childNodes[y].nodeType!==3 && this._nodes[x].childNodes[y].nodeName!=='#text' && this._nodes[x].childNodes[y].nodeName!=='#comment') {
								children.push(this._nodes[x].childNodes[y]);
							}
						}
					}
				}
			}
			return new self.NodeSelection(children);
		},

		/**	Submit any forms in the Selection.
		 *	@returns {this}
		 */
		submit : function() {
			return this._each(function(node) {
				var evt = self.fireEvent({
					type : 'submit',
					target : node
				});
				if (evt.rval!==false && evt.returnValue!==false && evt.preventDefault!==true) {
					if (node.submit) {
						node.submit();
					}
				}
			});
		},

		/** Get or set the selected text of an input element. <br />
		 *	<strong>Note:</strong> This only operates on the first element in the selection.
		 *	@param {Number} start			A character index at which to start text selection
		 *	@param {Number} [end=start]		A character index at which to end text selection
		 *	@returns {Object} An object with <code>start</code>, <code>end</code> and <code>text</code> properties correspdonding to the current selection state.
		 */
		selection : function(start, end) {
			var el = this._nodes[0],
				value, sel, before, endMax, range;
			if (start && typeof(start)!=='number' && start.start) {
				end = start.end;
				start = start.start;
			}
			if (typeof(start)==='number') {
				if (start<0) {
					start = 0;
				}
				endMax = el.value.length;
				if (end>endMax) {
					end = endMax;
				}
				if (start>end) {
					start = end;
				}
				else if (end<start) {
					end = start;
				}
				
				if(window.getSelection) {
					el.selectionStart = start;
					el.selectionEnd = end;
				}
				else if (el.selectionEnd || el.selectionEnd===0) {
					el.selectionStart = start;
					el.selectionEnd = end;
				}
				else if (el.createTextRange) {
					range = el.createTextRange();
					range.collapse(true);
					range.moveStart('character', start);
					range.moveEnd('character', end);
					range.select();
				}
			}
			else {
				if (window.getSelection) {					// Stanadards
					value = typeof(el.value)==='string' ? el.value : el.innerHTML;
					sel = window.getSelection();
					return {
						start	: el.selectionStart+0,
						end		: el.selectionEnd+0,
						text	: value.substring(sel.start, sel.end)
					};
				}
				else if (document.selection) {				// IE
					sel = document.selection.createRange();
					before = document.body.createTextRange();
					before.moveToElementText(el);
					before.setEndPoint("EndToStart", sel);
					return {
						start	: before.text.length,
						end		: before.text.length + sel.text.length,
						text	: sel.text
					};
				}
				else {
					self.log("Selection retrieval is not supported in this browser.");
					return {
						start	: 0,
						end		: 0,
						text	: ''
					};
				}
			}
			return this;
		},

		/**	Template the Selection and all descendants based on <code>data-tpl-id</code> attributes. <br />
		 *	Each element with a <code>data-tpl-id</code> attribute will have it's contents updated with the corresponding value of that attribute when interpreted as a dot-notated key path within <code>templateFields</code>. <br />
		 *	<code>data-tpl-id</code> attribute values can optionally include a pipe-separated list of "filters". <br />
		 *	<strong>Example:</strong> <br />
		 *		<pre><span data-tpl-id="article.title|ucWords|truncate:byWord,300|htmlEntities"></span></pre> <br />
		 *	<em><strong>Note:</strong> the "htmlEntities" filter is already added for you where needed.</em>
		 *	@param {Object} [templateFields={}]		Template data fields. Nested Objects/Arrays are addressable via dot notation.
		 *	@returns {this}
		 */
		template : function(templateFields) {
			var attrName = self.templateAttributeName,
				getFilters;
			templateFields = templateFields || {};
			
			getFilters = function(value, htmlEntities) {
				var filters = value.split('|'),
					i;
				value = filters.splice(0, 1)[0];
				for (i=filters.length; i--; ) {
					if (filters[i]==='htmlEntities') {
						filters.splice(i, 1);
					}
				}
				return filters;
			};
			
			this.query('['+attrName+']').each(function(node) {
				var nodeName = node.nodeName(),
					tplField = node.attr(attrName),
					tplValue = tplField,
					tplFilters,
					nType;
				
				tplFilters = getFilters(tplField);
				tplField = tplField.split('|')[0];
				
				tplValue = puredom.delve(templateFields, tplField);
				
				if (tplValue!==null && tplValue!==undefined) {
					if (typeof(tplValue)==='date' || tplValue.constructor===Date) {
						tplValue = tplValue.toLocaleString();
					}
					nType = node.attr('data-tpl-prop');
					if (nType) {
						node.prop(nType, self.text.filter(tplValue, tplFilters.join('|')));
					}
					else {
						switch (nodeName) {
							case 'select':
							case 'input':
							case 'textarea':
							case 'meter':
							case 'progress':
								node.value(tplValue);
								break;
							
							case 'img':
							case 'video':
							case 'audio':
							case 'iframe':
								tplFilters.splice(0, 0, 'htmlEntities');
								tplValue = self.text.filter(tplValue, tplFilters.join('|'));
								node.attr('src', tplValue);
								break;
							
							default:
								tplFilters.splice(0, 0, 'htmlEntities');
								tplValue = self.text.filter(tplValue, tplFilters.join('|'));
								node.html(tplValue);
								break;
						}
					}
				}
			});
			templateFields = null;
			return this;
		}
	});
	
	/**	Alias of {@link puredom.NodeSelection#addEvent}
	 *	@function
	 */
	self.NodeSelection.prototype.on = self.NodeSelection.prototype.addEvent;
	
	/**	@ignore */
	self.NodeSelection.prototype.animateCss = self.NodeSelection.prototype.animateCSS;
	
	
	
	/**	@private */
	priv.incrementAnimationCount = function(node) {
		node._puredom_animationCount = priv.getAnimationCount(node) + 1;
		if (node._puredom_animationCount===1) {
			self.addClass(node, '_puredom_animating');
		}
	};
	/**	@private */
	priv.decrementAnimationCount = function(node) {
		var current = Math.max(0, priv.getAnimationCount(node));
		if (current>1) {
			node._puredom_animationCount = current - 1;
		}
		else {
			node._puredom_animationCount = null;
			self.removeClass(node, '_puredom_animating');
		}
	};
	/**	@private */
	priv.getAnimationCount = function(node) {
		return parseInt(node._puredom_animationCount, 10) || 0;
	};
	
	
	
	/**	Destroy and cleanup puredom.
	 *	@private
	 */
	priv.unload = function() {
		priv.wrappedEventListener.reset();
		self.getElement.clearCache();
		priv._nodeToIdList = {};
		setTimeout(function() {
			window.puredom = priv = objConstructor = getSupportedTextContentProperty = null;
		}, 10);
	};
	
	
	/**	Create or retrieve one or more elements based on a query. <br />
	 *	If query begins with "<" or is an object, a new element is contructed based on that information. <br />
	 *	If the query is a CSS selector, DOM nodes matching that selector are returned.
	 *	@param {String|Object} query	A CSS selector (retrieval), or a DOM description (creation).
	 *	@param {Boolean} [log=false]	If true, query process will be logged to the console.
	 *	@returns {puredom.NodeSelection} selection
	 */
	self.el = function(query, log) {
		var results, type;
		if (query) {
			type = typeof query;
			if (type==='string' && query.charAt(0)!=='<') {
				if (log===true) {
					self.log('query is a CSS selector', query, type);
				}
				if (query==='body') {
					results = document.body;
				}
				else if (query==='html') {
					results = document.documentElement || document;
				}
				else {
					results = self.getElement(query, arguments[1]);
				}
			}
			else if (self.isArray(query)) {
				results = [];
				for (var x=0; x<query.length; x++) {
					Array.prototype.splice.apply(results, [0,0].concat(self.el(query[x])._nodes) );
				}
			}
			else if (type==='string' || (type==='object' && !query.nodeName && query!==window)) {
				if (log===true) {
					self.log('query is an HTML fragment', query, type);
				}
				results = self.createElement.apply(self, arguments);
			}
			else if (query.constructor===self.NodeSelection) {
				if (log===true) {
					self.log('query is already a NodeSelection', query.constructor+'', query.constructor.name);
				}
				return query;
			}
			else if (query.nodeName || query===window) {
				if (log===true) {
					self.log('query is an HTML element', query, type);
				}
				if (query===window) {
					query = document.documentElement || document;
				}
				results = query;
			}
		}
		return new self.NodeSelection(results);
	};
	
	
	
	/**	Get a selection ({@link puredom.NodeSelection}) containing the node with the given UUID. <br />
	 *	UniqueIDs can be retrieved using {@link puredom.NodeSelection#uuid}.
	 *	@param {String} uuid						Unique node ID, such as one derived from {@link puredom.NodeSelection#uuid}.
	 *	@returns {puredom.NodeSelection} selection	A selection ({@link puredom.NodeSelection}) containing the referenced node.
	 */
	self.node = function(uuid) {
		return new self.NodeSelection(priv.idToNode(uuid));
	};
	
	
	
	/** Returns an {Array} of elements matching the passed CSS selector query.
	 *	@function
	 *	@param {String} search							A CSS selector, or multiple CSS selectors separated by a comma
	 *	@param {Object} [options]						Hashmap of one-time triggers for the engine (see detailed parameter listing)
	 *	@param {HTMLElement} [options.within=document]	Look for matches within the given element only
	 *	@param {Boolean} [options.logging=false]		Enable logging for this query
	 *	@param {Boolean} [options.useCached=false]		Return a cached result if available
	 *	@param {Boolean} [options.cache=false]			Cache the result
	 *	@returns {Array(HTMLElement)}	An Array of matched HTML elements.
	 */
	self.getElement = (function() {
		/**	@exports getElement as puredom.selectorEngine */
		var getElement,
			resetRegex,
			cache = {},
			cacheEnabled = false,
			nodeNameReg = /^((?:[a-z][a-z0-9\_\-]*)|\*)?/gi,
			removePaddingReg = /^\s*(.*?)\s*$/gm,
			removeCommaPaddingReg = /\s*?\,\s*?/gm,
			enableSelectorStats = false,
			selectors;
		
		/** CSS selectors implemented as filters
		 *		@tests:
		 *			// Should set all checkboxes to "checked" that are descendants of fieldsets having the given className:
		 *		puredom.el('fieldset[class~=inputtype_checkbox]>input').value(true);
		 *			// Should enable in-query logging via a :log() pseudo-class:
		 *		puredom.getElement.addSelectorFilter(/^\:log\(\)/gim, function(m,n,c){console.log(n);});
		 *			// Usage for the above, should show resultSet after filtering to labels, before filtering to spans descendants:
		 *		puredom.getElement('label:log() > span');
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
							matches.attrPresent = self.typeOf(attrValue)==='string';
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
						self.log('Descendant selector called on an unfiltered result set.  Operating on descendants of the document.');
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
						self.log('Unknown nth-child alias "'+matches[1]+'-'+matches[2]+'"');
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
							self.log('Unknown named nth-child expression "'+r[4]+'"');
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
						Array.prototype.splice.apply(results, [results.length-1,0].concat(self.toArray(originalResults[x].getElementsByTagName(nodeName))));
					}
				}
			}
		];
		
		
		/** Resets a RegExp for repeated usage.
		 *	@private
		 */
		resetRegex = function(regex) {
			regex.lastIndex = 0;
		};
		
		
		/**	@ignore */
		function nativeQuerySelectorAll(selector, within) {
			var results;
			within = within || getElement.baseNode;
			selector = selector.replace(/(\[[^\[\]= ]+=)([^\[\]"']+)(\])/gim,'$1"$2"$3');
			try {
				results = within.querySelectorAll(selector);
				if (results) {
					results = self.toArray(results);
				}
			} catch (err) {
				self.log('Native querySelectorAll failed for selector: '+selector+', error:'+err.message);
			}
			return results || false;
		}
		
		
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
		getElement = function(search, options) {
			var baseNode = getElement.baseNode || (getElement.baseNode = document && document.documentElement || document),
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
				useCustomImplementation = !priv.support.querySelectorAll,
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
						matches = getElement(search[x], puredom.extend({}, options, {
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
					self.log('query=',originalSearch, ', result=',node);
				}
				// Return the combined results:
				time = Date.now() - time;
				if (time>100) {
					self.log('Slow Selector Warning: "'+originalSearch+'" took ' + time + 'ms to complete.');
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
			nodeName = ((nodeName && nodeName[0]) || "").toLowerCase();
			search = search.substring(nodeName.length);
			// NOTE: trim() is intentionally NOT called on search here. We *want* to know if there 
			// is preceeding whitespace, because that consitutes a "within" pseudo-pseudo-selector!
			// ^ does that make sense?
			
			searchParsed = search;
			
			// querySelectorAll doesn't support searches beginning with the child selector. For those, use the custom engine.
			if (originalSearch.charAt(0)==='>') {
				useCustomImplementation = true;
			}
			
			if (priv.support.querySelectorAll && useCustomImplementation!==true) {
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
					currentResults = self.toArray(baseNode.all || document.all);
					constrainedToNode = false;
				}
				else {
					currentResults = self.toArray(baseNode.getElementsByTagName(nodeName || '*'));
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
						if (enableSelectorStats===true) {
							perSelectorSearchTime = Date.now();
						}
						
						// Prepare and get matches from the selectorFilter's regular expression:
						resetRegex(selectors[i].regex);
						matches = selectors[i].regex.exec(searchParsed);
						
						if (enableSelectorStats===true) {
							perSelectorSearchTime = Date.now() - perSelectorSearchTime;
						}
						
						if (matches) {
							// Match found, this must be the right selector filter:
							hasMatch = true;
							if (doLogging) {
								self.log((selectors[i].title || selectors[i].regex) + ' ==>> matched:"'+ searchParsed.substring(0,matches[0].length) + '" ==>> remaining:"'+ searchParsed.substring(matches[0].length) + '" ||debug>> (submatches:'+ matches.slice(1).join(',') + ')');
							}
							
							if (enableSelectorStats===true) {
								perSelectorFilterTime = Date.now();
							}
							
							// Allow the selector filter to filter the result set:
							filterResponse = selectors[i].filter(matches, currentResults, handlerConfig);
							if (filterResponse && self.isArray(filterResponse)) {
								currentResults = filterResponse;
							}
							
							if (enableSelectorStats===true) {
								perSelectorFilterTime = Date.now() - perSelectorFilterTime;
							}
							
							// Remove the matched selector from the front of the statement:
							searchParsed = searchParsed.substring(matches[0].length);
							
							// We're no longer on the first match:
							handlerConfig.first = false;
							
							// At least one filter has now been applied:
							handlerConfig.isFiltered = true;
						}
						
						// TODO: remove logging
						if (enableSelectorStats===true) {
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
						throw(new Error('puredom.getElement() :: Unknown CSS selector near: ' + searchParsed.substring(0,20), 'puredom.js', 2689));
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
				self.log('query=',originalSearch, ', result=',currentResults);
			}
			
			// Cache the results if enabled & requested:
			if (cacheEnabled && options.cache===true) {
				cache[search] = currentResults;
			}
			
			if (options.internal!==true && doLogging===true) {
				time = Date.now() - time;
				if (time>10) {
					self.log('Slow Selector Warning: "'+originalSearch+'" took ' + time + 'ms to complete. '+parseIterations+' parse iterations.');
				}
			}
			
			// Return the matched result set.  Can be empty, but is always an Array.
			return currentResults;
		};
		
		/**	@public */
		getElement.enableCache = function(enabled) {
			cacheEnabled = enabled!==false;
			if (!cacheEnabled) {
				cache = {};
			}
		};
		
		/**	@public */
		getElement.disableCache = function() {
			cacheEnabled = false;
			cache = {};
		};
		
		/**	@public */
		getElement.clearCache = function() {
			cache = {};
		};
		
		/**	@private */
		getElement._normalizeSelectorFilter = function(selectorFilter) {
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
		};
		
		/** Add a custom CSS selector filter.
		 *	@public
		 */
		getElement.addSelectorFilter = function(selectorFilter) {
			selectorFilter = getElement._normalizeSelectorFilter.apply(getElement, arguments);
			if (selectorFilter) {
				selectors.push(selectorFilter);
				return true;
			}
			return false;
		};
		
		/** Remove a custom CSS selector filter.
		 *	@public
		 */
		getElement.removeSelectorFilter = function(selectorFilter) {
			var x, p, isMatch;
			selectorFilter = getElement._normalizeSelectorFilter.apply(getElement, arguments);
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
		
		if (enableSelectorStats===true) {
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
			getElement.selectorStats = function() {
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
			getElement.selectorStats = function() {
				return "disabled";
			};
		}
		
		return getElement;
	}());
	
	
	
	/**	@namespace CSS selector engine internals.
	 *	@name puredom.selectorEngine
	 */
	self.selectorEngine = self.getElement;
	
	
	
	// Events
	
	
	/**	@class Represents a DOM event.
	 *	@name puredom.DOMEvent
	 */
	self.DOMEvent = function PureDOMEvent(type) {
		if (type) {
			this.type = type.replace(/^on/gi,'');
		}
	};
	self.DOMEvent.displayName = 'puredom.DOMEvent';
	
	self.extend(self.DOMEvent.prototype, /** @lends puredom.DOMEvent# */ {
		
		/**	Which mouse button or key generated the action (if applicable)
		 *	@type Number
		 */
		which	: null,
		
		/**	The triggered event type (with no "on"-prefix)
		 *	@type String
		 */
		type	: '',
		
		/**	The DOM node that originated the event.
		 *	@type {Element}
		 */
		target	: null,
		
		/**	When available, refers to a DOM node that aided in originating the event (such as the DOM node the mouse was *previously* overtop of).
		 *	@type {Element}
		 */
		relatedTarget : null,
		
		/**	Prevent the event's browser-default action from occurring.
		 *	@function
		 */
		preventDefault : function() {
			this.defaultPrevented = true;
		},
		
		/**	Stop bubbling.
		 *	@function
		 */
		stopPropagation : function(){
			this.propagationStopped = true;
			this.bubblingCancelled = true;
		},
		
		/**	Stop bubbling, prevent the browser-default action and set the event's returned value to false.
		 *	@function
		 */
		cancel : function() {
			this.preventDefault();
			this.stopPropagation();
			this.returnValue = false;
			return false;
		},
		
		/**	Represents the handler's return value.
		 *	@type Boolean
		 */
		returnValue : true,
		
		/**	The contained raw DOM Event.
		 *	@type DOMEvent
		 */
		originalEvent : null,
		
		/**	The timestamp when the event was triggered.
		 *	@type Number
		 */
		timeStamp : null
	});
	
	/**	Alias of {@link puredom.DOMEvent#stopPropagation}, provided only for backward compatibility.
	 *	@function
	 */
	self.DOMEvent.prototype.cancelBubble = self.DOMEvent.prototype.stopPropagation;
	
	/**	Alias of {@link puredom.DOMEvent#cancel}, provided only for compatibility with other notable DOM libraries.
	 *	@function
	 */
	self.DOMEvent.prototype.stop = self.DOMEvent.prototype.cancel;
	
	/**	@deprecated 
	 *	@private
	 */
	self.DOMEvent.prototype.prevent = self.DOMEvent.prototype.cancel;
	
	
	
	
	/**	@private */
	priv.wrappedEventListener = {
		list : [],
		none : {},
		
		/**	@private */
		summary : function() {
			for (var x=0; x<this.list.length; x++) {
				self.log( priv.idToNode(this.list[x].target), '.on', this.list[x].type, ' -> ', (this.list[x].handler.displayName || this.list[x].handler.name) );
			}
		},
		
		/**	@private */
		reset : function(removeEvents) {
			var i, evt;
			if (removeEvents===true) {
				for (i=this.list.length; i--; ) {
					evt = this.list[i];
					this.list[i] = this.none;
					self.removeEvent(priv.idToNode(evt.target), evt.type, evt.wrappedHandler);
					this.unsetRefs(evt);
					window.killCount = (window.killCount || 0) + 1;
				}
			}
			this.list.splice(0, this.list.length);
		},
		
		/**	@private */
		destroyObjHandlers : function(obj) {
			var i, evt,
				objId = priv.nodeToId(obj);
			for (i=this.list.length; i--; ) {
				evt = this.list[i];
				if (evt.target===objId) {
					this.unsetRefs(evt);
					this.list.splice(i, 1);
					self.removeEvent(obj, evt.type, evt.wrappedHandler);
					window.killCount = (window.killCount || 0) + 1;
				}
			}
		},
		
		/**	@private */
		get : function(type, handler, obj, andDestroy) {
			var i, evt;
			obj = priv.nodeToId(obj);
			for (i=this.list.length; i--; ) {
				evt = this.list[i];
				if (evt.target===obj && evt.handler===handler && evt.type===type) {
					handler = evt.wrappedHandler;
					if (andDestroy===true) {
						this.list.splice(i, 1);
						window.killCount = (window.killCount || 0) + 1;
						this.unsetRefs(evt);
					}
					break;
				}
			}
			// fall back to the original handler
			return handler;
		},
		
		/**	@private */
		unsetRefs : function(item) {
			item.wrappedHandler.type = null;
			item.wrappedHandler.handler = null;
			item.wrappedHandler.target = null;
		},
		
		/**	@private */
		internalFireEvent : function(event) {
			var target = priv.nodeToId(event.target),
				type = event.type.replace(/^on/gm,''),
				i, item, returnValue;
			for (i=this.list.length; i--; ) {
				item = this.list[i];
				if (item.target===target && item.type===type) {
					returnValue = item.handler.call(event.target, event);
					if (returnValue===false) {
						break;
					}
				}
			}
		},
		
		/**	@private */
		create : function(type, handler, obj) {
			var evt = {
				type	: type,
				target	: priv.nodeToId(obj),
				handler	: handler,
				/**	@ignore */
				wrappedHandler : function(e) {
					var handler = arguments.callee.handler,
						type = (arguments.callee.type || e.type).toLowerCase().replace(/^on/,''),
						originalTarget = this!==window ? this : (priv && priv.idToNode(arguments.callee.target)),
						event, i,
						d = {
							isInSelf : false,
							doPreventDefault : false,
							doCancelBubble : false,
							doStopPropagation : false,
							e : e || window.event,
							ret : null,
							/**	@ignore */
							end : function() {
								d.end = null;
								e = event = d = handler = type = originalTarget = null;
								return this.ret;
							}
						};
					if (!priv || !priv.idToNode) {
						self.log("target:<"+e.target.nodeName+' class="'+e.target.className+'" id="'+e.target.id+'"' + "> , type:"+type+"/"+e.type);
					}
					e = d.e;
					
					
					event = self.extend(new self.DOMEvent(type), {
						which	: e.which,
						target	: e.target || e.srcElement || originalTarget || document.body,
						relatedTarget : e.relatedTarget || (type==='mouseout' ? e.toElement : e.fromElement),
						returnValue : true,
						originalEvent : e,
						timeStamp : e.timeStamp || Date.now()
					});
					
					// NOTE: For convenience, copy extra properties from the original event. 
					// This is mostly used for custom events to pass custom properties.
					for (i in e) {
						if (!event.hasOwnProperty(i) && typeof e[i]!=='function' && i!==i.toUpperCase() && i!=='layerX' && i!=='layerY') {
							event[i] = e[i];
						}
					}
					
					if (!event.target) {
						self.log('Event target doesn\'t exist for type "'+event.type+'": ',event.target,', srcElement=',e.srcElement);
					}
					
					if (e.type==='touchend' && priv._lastTouchPos) {
						event.pageX = priv._lastTouchPos.pageX;
						event.pageY = priv._lastTouchPos.pageY;
					}
					else if (e.touches && e.touches[0]) {
						event.pageX = e.touches[0].pageX;
						event.pageY = e.touches[0].pageY;
						priv._lastTouchPos = {
							pageX : event.pageX,
							pageY : event.pageY
						};
					}
					else if (e.pageX || e.pageX===0 || e.clientX || e.clientX===0) {
						event.pageX = e.pageX || (e.clientX+document.body.offsetLeft);
						event.pageY = e.pageY || (e.clientY+document.body.offsetTop);
					}
					if (type.indexOf('key')>-1 || e.keyCode || e.charCode) {
						event.keyCode = e.keyCode || e.which;
						event.charCode = e.keyCode || e.charCode || e.which;			// this should never be used
						event.which = e.which;
					}
					if (type.indexOf('mouse')>-1 || type.indexOf('click')>-1 || (e.button!==null && e.button!==undefined)) {
						event.button = typeof e.button=='number' ? e.button : e.which;
					}
					
					// fix safari #textnode target bug
					if (event.target && event.target.nodeType===3 && originalTarget.nodeType!==3) {
						event.target = event.target.parentNode;
					}
					
					// is the capturing node within the original handler context?
					d.searchNode = event.relatedTarget || event.target;
					do {
						if (d.searchNode===originalTarget) {
							d.isInSelf = true;
							break;
						}
					} while(d.searchNode && (d.searchNode=d.searchNode.parentNode) && d.searchNode!==document);
					
					// Don't fire mouseout events when the mouse is moving in/out a child node of the handler context element
					if ((type!=='mouseover' && type!=='mouseout') || !d.isInSelf) {
						if (handler && handler.call) {
							d.handlerResponse = handler.call(originalTarget, event);
						}
						else {
							// NOTE: Turn this on and fix the IE bug.
							//console.log('Handler not a function: ', self.typeOf(handler), ' handler=', handler, ' type=', type);
						}
						
						event.returnValue = d.handlerResponse!==false && event.returnValue!==false;
						if (event.defaultPrevented) {
							event.returnValue = e.returnValue = false;
							if (e.preventDefault) {
								e.preventDefault();
							}
						}
						if (event.bubblingCancelled===true || event.propagationStopped===true || event.cancelBubble===true) {
							if (e.stopPropagation) {
								e.stopPropagation();
							}
							try {
								if (e.cancelBubble && e.cancelBubble.call) {
									e.cancelBubble();
								}
								else {
									e.cancelBubble = true;
								}
							} catch(err3) {}
						}
						d.ret = event.returnValue;
					}
					else {
						d.ret = true;
					}
					return d.end();
				}
			};
			evt.wrappedHandler.displayName = 'wrappedEventHandler_'+type;
			evt.wrappedHandler.handler = handler;
			evt.wrappedHandler.type = type;
			evt.wrappedHandler.target = evt.target;		// an ID, not the node itself
			this.list.push(evt);
			obj = type = handler = evt = null;
			return this.list[this.list.length-1].wrappedHandler;
		}
		
	};
	
	
	
	
	/** Get a String description of the subject for an event operation
	 *	@private
	 *	@param {Any} subject		An object of any type.
	 */
	priv.getSubjectDescription = function(obj) {
		return (obj.nodeName ? (self.el(obj)+'') : (obj.constructor && obj.constructor.name || obj.name || obj)) + '';
	};
	
	
	/**	Automatically translate DOM event types from [key] to [value] when registering or removing listeners. <br />
	 *	Also falsifies corresponding puredom-wrapped events' type fields.
	 *	@object
	 */
	self.eventTypeMap = {};
	if (priv.support.webkitMultitouch) {
		self.extend(self.eventTypeMap, {
			'mousedown'	: 'touchstart',
			'mousemove'	: 'touchmove',
			'mouseup'	: 'touchend'
		});
	}
	
	/**	Add an event listener to a DOM node for the given event type.
	 *	@private
	 *	@param {HTMLElement} obj			An element to add the event listener to.
	 *	@param {String} type				A type of event to register the listener for.
	 *	@param {Function} listener			The listener function to register. Gets passed {Event} event.
	 *	@param {Boolean} [useCapture=false]	If true, handler will be invoked during the capture phase instead of the bubbling phase.
	 */
	self.addEvent = function(obj, type, fn, useCapture) {
		var x, origType;
		if (obj) {
			if (self.typeOf(type)==='string' && type.indexOf(',')>-1) {
				type = type.replace(/\s/gm,'').split(',');
			}
			if (self.isArray(type)) {
				for (x=0; x<type.length; x++) {
					self.addEvent(obj, type[x], fn);
				}
				return true;
			}
			origType = type = (type+'').toLowerCase().replace(/^\s*(on)?(.*?)\s*$/gim,'$2');
			
			if (typeof(type)!=='string' || !fn || !fn.call) {
				self.log('Attempted to add event with invalid type or handler:', {
					type : type,
					handler : fn+'',
					subject : priv.getSubjectDescription(obj),
					useCapture : useCapture===true
				});
				//throw('Attempted to add event with invalid type or handler: type='+type+', handler='+fn);
				return;
			}
			
			if (self.eventTypeMap.hasOwnProperty(type)) {
				type = self.eventTypeMap[type];
			}
			
			fn = priv.wrappedEventListener.create(origType, fn, obj);
			if (obj.attachEvent) {
				obj.attachEvent( 'on'+type, fn );
			}
			else if (obj.addEventListener) {
				obj.addEventListener( type, fn, useCapture===true );
				self._eventCount = (self._eventCount || 0) + 1;
			}
		}
	};
	
	
	/**	Remove an event listener from a DOM node.
	 *	@private
	 *	@param {Element} obj				An element to remove the event listener from.
	 *	@param {String} type				The event type of the listener to be removed.
	 *	@param {Function} listener			The listener to remove.
	 *	@param {Boolean} [useCapture=false]	The useCapture value of the listener to be removed (defaults to false).
	 */
	self.removeEvent = function(obj, type, fn, useCapture) {
		var x, origType;
		if (obj) {
			if (self.typeOf(type)==='string' && type.indexOf(',')>-1) {
				type = type.replace(/\s/gm,'').split(',');
			}
			if (self.isArray(type)) {
				for (x=0; x<type.length; x++) {
					self.removeEvent(obj, type[x], fn, useCapture);
				}
				return true;
			}
			origType = type = (type+'').toLowerCase().replace(/^\s*(on)?(.*?)\s*$/gim,'$2');
			
			if (typeof(type)!=='string' || !fn || !fn.call) {
				self.log('Attempted to remove event with invalid type or handler:', {
					type : type,
					handler : fn+'',
					subject : priv.getSubjectDescription(obj),
					useCapture : useCapture===true
				});
				//throw('Attempted to remove event with invalid type or handler: type='+type+', handler='+fn);
				return;
			}
			
			if (self.eventTypeMap.hasOwnProperty(type)) {
				type = self.eventTypeMap[type];
			}
			
			fn = priv.wrappedEventListener.get(origType, fn, obj, true);		// , useCapture===true ?
			if (obj.detachEvent) {
				obj.detachEvent( 'on'+type, fn );
			}
			else if (obj.removeEventListener) {
				try {
					obj.removeEventListener( type, fn, useCapture===true );
					self._eventCount = (self._eventCount || 0) - 1;
				} catch(err) {}
			}
		}
	};
	
	
	/**	When called from within an event handler and passed the DOM Event, cancels the event, prevents the event's default action, and returns false.<br />
	 *	<strong>Note:</strong> puredom-wrapped Event objects have a cancel() method that does this for you.
	 *	@private
	 *	@param {Event} event	A DOM Event.
	 *	@returns false
	 */
	self.cancelEvent = function(e) {
		e = e || window.event;
		if (e) {
			if (e.preventDefault) {
				e.preventDefault();
			}
			if (e.stopPropagation) {
				e.stopPropagation();
			}
			try {
				e.cancelBubble = true;
			} catch(err) {}
			e.returnValue = false;
		}
		return false;
	};
	
	
	/*
	priv.checkEventTypeSupport = function(s, type) {
		var da = !!('ondataavailable' in s),
			support = false,
			handler;
		handler = function(e) {
			support = e && e.test_prop==='test_val';
		};
		self.addEvent(type, handler);
		self.fireEvent({
			target : s,
			type : type,
			test_prop : 'test_val'
		});
		self.removeEvent(type, handler);
		handler = s = type = null;
		return support;
	};
	priv.supportsCustomEventTypes = priv.checkEventTypeSupport(document.createElement('span'), 'custom:event_typetest');
	*/
	
	
	/**	Fire an event on a DOM node.
	 *	@private
	 *	@param {Object} options				An event options object, having at least a "type" and "target".
	 *	@param {String} [options.type]		The event type to fire. "on"- prefixes get stripped.
	 *	@param {String} [options.target]	A DOM node to fire the event on.
	 *	@returns {Object} result description, with {Boolean} "rval" (false if any handler returned false), and {Boolean} "preventDefault" (default was prevented).
	 */
	self.fireEvent = function (options) {
		var evt, rval, p, preventDefault, initError;
		options = options || {};
		if (document.createEventObject) {       // IE
			options = self.extend({}, options);
			options.type = 'on'+options.type.toLowerCase().replace(/^on/,'');
			//priv.checkEventTypeSupport(options.target, options.type);
			
			try {
				evt = document.createEventObject();
			}catch(err) {
				initError = true;
			}
			if (!initError) {
				for (p in options) {
					if (options.hasOwnProperty(p)) {
						try {
							evt[p] = options[p];
						}catch(err){}
					}
				}
				try {
					rval = options.target.fireEvent(options.type, evt);
					preventDefault = evt.preventDefault===true;
				} catch(err) {
					initError = true;
				}
			}
			if (initError) {
				//self.log('Error: Could not fire "' + options.type + '" event in IE. Falling back to internal implementation.');
				if (priv.wrappedEventListener.internalFireEvent) {
					priv.wrappedEventListener.internalFireEvent(options);
				}
			}
			
		}
		else {                                  // Everything else
			evt = document.createEvent("HTMLEvents");
			evt.initEvent(options.type.toLowerCase().replace(/^on/,''), true, true);
			for (p in options) {
				if (options.hasOwnProperty(p)) {
					try {
						evt[p] = options[p];
					} catch(err) {}
				}
			}
			rval = !options.target.dispatchEvent(evt);
			preventDefault = evt.preventDefault===true;
		}
		
		return {
			evt             : evt,
			preventDefault  : preventDefault,
			rval            : rval
		};
	};
	
	
	
	
	
	/**	@private */
	priv._nodeToIdIndex = 0;
	
	/**	@private */
	priv._nodeToIdList = {};
	
	/**	Get the UUID value for a given node. If the node does not yet have a UUID, it is assigned one.
	 *	@private
	 */
	priv.nodeToId = function(el) {
		var search, id;
		if (el===window) {
			return '_td_autoid_window';
		}
		else if (el===document.documentElement) {
			return '_td_autoid_html';
		}
		else if (el===document.body) {
			return '_td_autoid_body';
		}
		search = (/\s_td_autoid_([0-9]+)\s/gm).exec(' ' + el.className + ' ');
		if (search && search[1]) {
			id = search[1];
		}
		else {
			priv._nodeToIdIndex += 1;
			id = priv._nodeToIdIndex + '';
			self.addClass(el, '_td_autoid_'+id);
		}
		priv.ensureNodeIdListing(el, id);
		return id;
	};
	
	/**	Get the node with the given UUID.
	 *	@private
	 */
	priv.idToNode = function(id) {
		var search,
			listed = priv._nodeToIdList[id+''],
			node;
		if (id==='_td_autoid_window') {
			return window;
		}
		else if (id==='_td_autoid_html') {
			return document.documentElement;
		}
		else if (id==='_td_autoid_body') {
			return document.body;
		}
		if (listed) {
			node = self.getElement(listed);
			if (!(/\s_td_autoid_[0-9]+\s/gm).exec(' ' + node.className + ' ')) {
				node = null;
			}
		}
		if (!node) {
			search = self.getElement('._td_autoid_'+id);
			node = search && search[0];
			if (node) {
				priv.ensureNodeIdListing(node, id);
			}
		}
		return node || false;
	};
	
	/**	@private */
	priv.ensureNodeIdListing = function(node, id) {
		var idAttr;
		if (node.getAttribute) {
			idAttr = node.getAttribute('id');
			if (!idAttr) {
				idAttr = '_td_autoid_'+id;
				node.setAttribute('id', idAttr);
			}
			priv._nodeToIdList[id] = '#'+idAttr;
		}
	};
	
	/**	@private */
	priv.removeNodeUID = function(node) {
		var id = node.getAttribute('id');
		if (id && id.match(/^_td_autoid_[0-9]+$/g)) {
			if (node.removeAttribute) {
				node.removeAttribute('id');
			}
			else {
				node.setAttribute('id', '');
			}
		}
		if (node.className) {
			node.className = node.className.replace(/(^|\b)_td_autoid_[0-9]+(\b|$)/gim,'');
		}
	};
	
	
	
	/**	@namespace Shim for HTML5's animationFrame feature.
	 *	@private
	 */
	self.animationFrame = (function(api) {
		var self = {
			manualFramerate : 11
		};
		if (window.mozRequestAnimationFrame) {
			api = 'moz';
		}
		else if (window.webkitRequestAnimationFrame) {
			api = 'webkit';
		}
		self.nativeSupport = !!api;
		if (self.nativeSupport) {
			/**	Defer execution of an animation function so it occurs during the next rendering cycle.
			 *	@param {Function} f		A function to call during the next animation frame.
			 *	@function
			 *	@private
			 */
			self.getTimer = function(f) {
				return window[api+'RequestAnimationFrame'](f);
			};
			/**	Unregister a deferred animation function.
			 *	@param {String} identifier		A timer identifier, such as one obtained from {@link puredom.animationFrame.getTimer}.
			 *	@function
			 *	@private
			 */
			self.cancelTimer = function(t) {
				window[api+'CancelRequestAnimationFrame'](t);
			};
			/**	Get the start time (timestamp, in milliseconds) of the current animation.
			 *	@param {String} identifier		A timer identifier, such as one obtained from {@link puredom.animationFrame.getTimer}.
			 *	@function
			 *	@private
			 */
			self.getStartTime = function(t) {
				return window[api+'AnimationStartTime'] || new Date().getTime();
			};
		}
		else {
			/**	@ignore */
			self.getTimer = function(f) {
				return setTimeout(function() {
					f(new Date().getTime());
					f = null;
				}, self.manualFramerate);
			};
			/**	@ignore */
			self.cancelTimer = function(t) {
				clearTimeout(t);
			};
			/**	@ignore */
			self.getStartTime = function(t) {
				return new Date().getTime();
			};
		}
		return self;
	}());
	
	
	
	
	
	/**	Set the opacity of an element.
	 *	@private
	 *	@param {HTMLElement} el		A DOM node to which an opacity value should be applied.
	 *	@param {Number} opac		An integer opacity between 0 and 100, or a decimal value between 0.01 and 1.
	 */
	self.setOpacity = function(el, opac) {
		if (opac<=1 && opac>0) {
			opac = opac * 100;
		}
		opac = Math.round(opac);
		if (opac<100) {
			el.style.opacity = parseFloat(opac/100).toFixed(2);
			el.style.filter = "alpha(opacity=" + opac + ")";
		}
		else {
			el.style.opacity = null;
			el.style.filter = null;
		}
	};
	
	
	
	/**	Apply a Microsoft filter value to an element, retaining existing applied filters. <br />
	 *	See: {@link http://msdn.microsoft.com/en-us/library/ms532853(v=vs.85).aspx}
	 *	@private
	 *	@param {HTMLElement} el		An element to apply a filter to.
	 *	@param {String} type		A valid filter type.
	 *	@param {String} value		The value to set for the given filter type.
	 */
	self.applyMsFilter = function(el, type, value) {
		var item, filters,
			valueStr = '',
			ch = priv.support.filterProperty==='MsFilter' ? '"' : '',
			p, a, i;
		type = type.charAt(0).toUpperCase() + type.substring(1);
		if (typeof(value)==='string') {
			valueStr = value;
			value = {};
			a = valueStr.replace(/\s*(,|=)\s*      /gm,'$1').split(',');
			for (p=0; p<a.length; p++) {
				i = a[p].indexOf('=');
				value[a[p].substring(0,i)] = a[p].substring(i+1);
			}
		}
		else {
			for (p in value) {
				if (value.hasOwnProperty(p)) {
					valueStr += ', '+p+'='+value[p];
				}
			}
			valueStr = valueStr.replace(',','');
		}
		try {
			item = el.filters && el.filters.item && (el.filters.item('DXImageTransform.Microsoft.'+type) || el.filters.item(type));
		}catch(err){}
		if (item) {
			for (p in value) {
				if (value.hasOwnProperty(p) && p!=='enabled') {
					item[p] = value[p];
				}
			}
			item.enabled = value.enabled?1:0;
		}
		else {
			filters = el.style.MsFilter || el.style.filter || '';
			filters += ' ' + (self.nodeStyle(el, 'MsFilter') || self.nodeStyle(el, 'filter') || '');
			if (filters) {
				filters = filters.replace(new RegExp('(^|\\s|\\))"?((progid\\:)?DXImageTransform\\.Microsoft\\.)?'+type+'\\s*?\\(.*?\\)"?\\s*?','gim'),'$1') + ' ';
			}
			el.style[priv.support.filterProperty] = filters + ch+'progid:DXImageTransform.Microsoft.'+type+'('+valueStr+')'+ch;
		}
		// hasLayout
		if (!el.style.zoom) {
			el.style.zoom = 1;
		}
	};
	
	
	
	
	/**	@private */
	var cssPropCache = {};
	/**	@private */
	function getPrefixedCssProperty(prop) {
		var ret = prop,
			p = cssPropCache[prop];
		if (p) {
			return p;
		}
		if (vendorCssPrefixJS && prop.substring(0, vendorCssPrefixJS.length)!==vendorCssPrefixJS) {
			p = vendorCssPrefixJS + prop.charAt(0).toUpperCase() + prop.substring(1);
			if (p in document.body.style) {
				ret = p;
			}
		}
		cssPropCache[prop] = ret;
		return ret;
	}
	
	
	/**	Apply key-value CSS styles to an element.
	 *	@param {HTMLElement} el		An element whose style should be updated.
	 *	@param {Object} properties	An Object where keys are CSS properties and values are the corresponding CSS values to apply.
	 *	@private
	 */
	self.applyCss = function(el, properties) {
		var x, cx, d, p, ieOpac, vp;
		properties = properties || {};
		for (x in properties) {
			if (properties.hasOwnProperty(x)) {
				try {
					cx = self.getStyleAsCSS(x);
					cx = cx.replace(/^\-(moz|webkit|ms|o|vendor)\-/gim, vendorCssPrefix+'-');
					cx = self.getStyleAsProperty(cx);
					cx = getPrefixedCssProperty(cx);
					if (cx==='opacity' && priv.support.filters) {
						ieOpac = Math.round( parseFloat(properties[x])*100 );
						if (ieOpac<100) {
							self.applyMsFilter(el, 'alpha', {
								enabled : true,
								opacity : ieOpac
							});
						}
						else {
							self.applyMsFilter(el, 'alpha', {
								enabled : false
							});
						}
					}
					else if (cx==='--box-shadow' && priv.support.filters) {
						d = properties[x].match(/\b(\#[0-9af]{3}[0-9af]{3}?|rgba?\([0-9\,\s]+\))\b/gim);
						d = d && d[0] || '';
						p = (' '+properties[x]+' ').replace(d,'').replace(/\s+/m,' ').split(' ').slice(1,4);
						self.applyMsFilter(el, 'glow', {
							Color : d,
							Strength : Math.round(p[3].replace(/[^0-9\-\.]/gim,''))
						});
					}
					else {
						el.style[cx] = properties[x];
					}
				}catch(err){}
			}
		}
	};
	
	/**	Convert a CSS property name to it's CamelCase equivalent.
	 *	@private
	 */
	self.getStyleAsProperty = function(style) {
		if (typeof style!=='string') {
			return null;
		}
		style = style.replace(/\-[a-z0-9]/gim, priv.styleAsPropReplacer);
		// fixes "webkitFoo" -> "WebkitFoo" etc
		style = style.replace(/^(webkit|moz|ms|o)[A-Z]/gm, priv.styleAsPropVendorPrefixReplacer);
		return style;
	};
	/**	@private */
	priv.styleAsPropReplacer = function(s) {
		return s.charAt(1).toUpperCase();
	};
	/**	@private */
	priv.styleAsPropVendorPrefixReplacer = function(s) {
		return s.charAt(0).toUpperCase()+s.substring(1);
	};
	
	/**	Convert a CSS property name to it's css-dash-separated equivalent.
	 *	@private
	 */
	self.getStyleAsCSS = function(style) {
		return typeof style==='string' && style.replace(/\-*([A-Z])/gm, '-$1').toLowerCase() || null;
	};
	
	/**	Parse a CSS String and return an Object representation.
	 *	@private
	 */
	priv.parseCSS = function(css) {
		var tokenizer = /\s*([a-z\-]+)\s*:\s*([^;]*?)\s*(?:;|$)/gi,
			obj, token;
		if (css) {
			obj = {};
			tokenizer.lastIndex = 0;
			while ((token=tokenizer.exec(css))) {
				obj[self.getStyleAsProperty(token[1])] = token[2];
			}
		}
		return obj;
	};
	
	/** Some intense CSS3 transitions wrapping, needed in order to support animating multiple
	 *	properties asynchronously with interjected transition modifications
	 *	@private
	 */
	self.getCssTransitions = function(el) {
		var transitions = {},
			current = {
				properties			: '-vendor-transition-property',
				durations			: '-vendor-transition-duration',
				timingFunctions		: '-vendor-transition-timing-function'
			},
			p, x, durationStr, duration;
		for (p in current) {
			if (current.hasOwnProperty(p)) {
				current[p] = (self.nodeStyle(el, current[p]) || '').replace(/\s/,'').split(',');
			}
		}
		for (x=0; x<current.properties.length; x++) {
			if (current.properties[x] && current.properties[x]!=='null' && !(current.properties[x]==='all' && current.durations[x].match(/^[0\.ms]*$/))) {
				durationStr = current.durations[x] || current.durations[current.durations.length-1];
				duration = parseFloat(durationStr.replace(/[^\-0-9\.]/gim,'')) || 0;
				if (!durationStr.match(/ms$/i)) {
					duration *= 1000;
				}
				transitions[self.getStyleAsProperty(current.properties[x])] = {
					duration : duration,
					timingFunction : current.timingFunctions[x] || current.timingFunctions[current.timingFunctions.length-1] || 'ease'
				};
			}
		}
		
		return transitions;
	};
	
	/** @private */
	self.setCssTransitions = function(el, transitions) {
		var css = {
				'-vendor-transition-property'			: [],
				'-vendor-transition-duration'			: [],
				'-vendor-transition-timing-function'	: []
			},
			p;
		
		for (p in transitions) {
			if (transitions.hasOwnProperty(p) && transitions[p]) {
				css['-vendor-transition-property'].push(p.toLowerCase());
				css['-vendor-transition-duration'].push((transitions[p].duration/1000).toFixed(3) + 's');
				css['-vendor-transition-timing-function'].push(transitions[p].timingFunction || 'ease');
			}
		}
		
		for (p in css) {
			if (css.hasOwnProperty(p)) {
				css[p] = css[p].join(', ');
			}
		}
		
		self.applyCss(el, css);
	};
	
	/** @private */
	self.updateCssTransitions = function(el, transitionsToUpdate) {
		var transitions, p;
		if (transitionsToUpdate) {
			transitions = self.getCssTransitions(el);
			for (p in transitionsToUpdate) {
				if (transitionsToUpdate.hasOwnProperty(p)) {
					if (transitionsToUpdate[p]) {
						transitions[p] = transitionsToUpdate[p];
					}
					else {
						delete transitions[p];
					}
				}
			}
			self.setCssTransitions(el, transitions);
		}
	};
	
	
	/** @private */
	self.addClass = function(el, classes) {
		var prev, i;
		if (classes) {
			if (!self.isArray(classes)) {
				classes = [classes];
			}
			prev = el.className || '';
			if (prev.length>0) {
				prev = ' ' + prev + ' ';
				for (i=0; i<classes.length; i++) {
					while (prev.indexOf(' '+classes[i]+' ')>-1) {
						prev = prev.replace(' ' + classes[i] + ' ', ' ');
					}
				}
				prev = prev.substring(1);
			}
			el.className = (prev + classes.join(' ')).replace(/\s+/gim,' ');
		}
	};
	
	/** @private */
	self.removeClass = function(el, classes) {
		var prev, i;
		if (classes) {
			if (!self.isArray(classes)) {
				classes = [classes];
			}
			prev = el.className || '';
			if (prev.length>0) {
				prev = ' ' + prev + ' ';
				for (i=0; i<classes.length; i++) {
					while (prev.indexOf(' '+classes[i]+' ')>-1) {
						prev = prev.replace(' ' + classes[i] + ' ', ' ');
					}
				}
				prev = prev.substring(1);
			}
			el.className = prev.replace(/\s+/gim,' ');
		}
	};
	
	/** Get the current value of a CSS property from the given node. 
	 *	@private
	 */
	self.nodeStyle = function(node, property) {
		var dashed = (property+'').replace(/[A-Z]/g, '-$0').toLowerCase(),
			camelized,
			filter,
			s,
			style;
		
		dashed = dashed.replace(/^\-(moz|webkit|ms|o|vendor)\-/gim, vendorCssPrefix+'-');
		camelized = dashed.replace(/\-[a-z]/gim, function (s) {return s.substring(1).toUpperCase();});
		
		if (dashed==='opacity' && priv.support.filters) {
			return node.filters.alpha && node.filters.alpha.enabled!==false && Math.round(node.filters.alpha.opacity)/100;
		}
		
		if (node.style && node.style[camelized]) {
			style = node.style[camelized] || '';
		}
	
		else if (node.currentStyle && node.currentStyle[camelized]) {
			style = node.currentStyle[camelized] || node.currentStyle[dashed] || '';
		}
	
		else if (document.defaultView && document.defaultView.getComputedStyle) {
			s = document.defaultView.getComputedStyle(node, null);
			style = s && (s.getPropertyValue(dashed) || s.getPropertyValue(camelized)) || '';
		}
	
		else if (window.getComputedStyle) {
			s = window.getComputedStyle(node, null);
			style = s && (s.getPropertyValue(dashed) || s.getPropertyValue(camelized)) || '';
		}
		
		return style;
	};
	
	
	/**	Old alias of puredom.text.html()
	 *	@private
	 */
	self.htmlEntities = function(str, stripTags) {
		var filters = ['htmlEntities'];
		if (stripTags===true) {
			filters.push('stripTags');
		}
		return self.text.filter(str, filters);
	};
	
	
	/**	Log to the browser console, if it exists.
	 */
	self.log = function() {
		if (window.console && window.console.log) {
			window.console.log.apply(window.console, arguments);
		}
	};
	
	
	
	/**	Add a new plugin method to {puredom.NodeSelection}. <br />
	 *	When called, a plugin function gets passed the arguments supplied by the caller. <br />
	 *	The value of <code>this</code> within the function is the selection ({@link puredom.NodeSelection}) it was called on.
	 *	@param {String} name		A method name to define on {puredom.NodeSelection}
	 *	@param {Function} func		The plugin method to define.
	 */
	self.addNodeSelectionPlugin = function(name, func) {
		if (!self.NodeSelection.prototype.hasOwnProperty(name)) {
			self.NodeSelection.prototype[name] = function() {
				var ret = func.apply(this, arguments);
				if (ret===null || ret===undefined) {
					return this;
				}
				return ret;
			};
		}
	};
	
	
	/**	Called on DOM ready.
	 *	@private
	 */
	self.init = function() {
		if (!initialized) {
			initialized = true;
			
			self.forEach(priv.oninit, function(i) {
				i.call(self, self);
			});
			
			self.fireEvent({
				target : document.body,
				type : "puredomready",
				puredom : self
			});
		}
	};
	self.addEvent(document, "DOMContentLoaded", self.init);
	self.addEvent(window, "load", self.init);
	self.addEvent(window, "unload", priv.unload);
	
	
	/**	Allows extensions to be included before the core.
	 *	@ignore
	 */
	(function() {
		if (previousSelf) {
			for (var x in previousSelf) {
				if (previousSelf.hasOwnProperty(x)) {
					self[x] = previousSelf[x];
				}
			}
			previousSelf = null;
		}
	}());
	
	/**	@private */
	priv.puredom = function(i) {
		if (self.typeOf(i)==='function') {
			if (initialized===true) {
				i.call(self, self);
			}
			else {
				priv.oninit.push(i);
			}
			return self;
		}
		else {
			return self.el.apply(self, arguments);
		}
	};
	
	self.extend(self, baseSelf);
	self.toString = function(){return 'function puredom(){}';};
	
	window.puredom = self;
	if (typeof window.define==='function' && window.define.amd) {
		window.define('puredom', function(){ return self; });
	}
}());
/**	@fileOverview Utilities that just get grafted onto the puredom namespace. */

puredom.extend(puredom, /** @lends puredom */ {
	
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
		};
		
		/**	URL-decode a string. (using decodeURIComponent)
		 *	@public
		 *	@param {String} str		The string to modify
		 *	@returns {String} The modified string
		 */
		base.unescape = function(str) {
			return decodeURIComponent(str);
		};
		
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
		 *	@param {String} str						The string to truncate
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
	
});
(function($) {
	/** @exports $ as puredom */
	
	/**	Creates a new EventEmitter instance.
	 *	@class Fire events and listen for fired events.
	 */
	$.EventEmitter = function EventEmitter() {
		this._eventRegistry = [];
	};
	
	var proto = $.EventEmitter.prototype;
	
	function multi(inst, func, type, handler, collector) {
		var o = typeof type,
			t, i, ret;
		if (o==='object' && type) {
			for (i in type) {
				if (type.hasOwnProperty(i)) {
					ret = inst[func](i, type[i]);
					if (collector) {
						collector.push(ret);
					}
				}
			}
			return true;
		}
		if (o==='string' && type.indexOf(',')>-1) {
			t = type.split(',');
			for (i=0; i<t.length; i++) {
				ret = inst[func](t[i], handler);
				if (collector) {
					collector.push(ret);
				}
			}
			return true;
		}
		return false;
	}
	
	function normalizeType(type) {
		return String(type).toLowerCase().replace(/(^on|\s+)/gim,'');
	}
	
	$.extend(proto, /** @lends puredom.EventEmitter# */ {
	
		/** Register an event listener on the instance.
		 *	@param {String} type		An event type, or a comma-seprated list of event types.
		 *	@param {Function} handler	A function to call in response to events of the given type.
		 *	@returns {this}
		 */
		on : function(type, handler) {
			type = normalizeType(type);
			if (!multi(this, 'on', type, handler)) {
				this._eventRegistry.push({
					type : type,
					handler : handler
				});
			}
			return this;
		},
		
		
		/**	A version of {@link puredom.EventEmitter#on .on()} that removes handlers once they are called. 
		 *	@see puredom.EventEmitter#on
		 *	@param {String} type		An event type, or a comma-seprated list of event types.
		 *	@param {Function} handler	A function to call in response to events of the given type.  Will only be called once.
		 *	@returns {this}
		 */
		once : function(type, handler) {
			type = normalizeType(type);
			if (!multi(this, 'once', type, handler)) {
				this.on(type, function onceProxy() {
					this.removeListener(type, onceProxy);
					return handler.apply(this, arguments);
				});
			}
			return this;
		},


		/** Remove an event listener from the instance.
		 *	@param {String} type		An event type, or a comma-seprated list of event types.
		 *	@param {Function} handler	A reference to the handler, as was originally passed to {puredom.EventEmitter#addEventListener}.
		 *	@returns {this}
		 */
		removeListener : function(type, handler) {
			var x, r;
			type = normalizeType(type);
			if (!multi(this, 'removeListener', type, handler)) {
				for (x=this._eventRegistry.length; x--; ) {
					r = this._eventRegistry[x];
					if (r.type===type && r.handler===handler) {
						this._eventRegistry.splice(x, 1);
						break;
					}
				}
			}
			return this;
		},


		/** Fire an event of a given type. <br />
		 *	Pass a comma-separated list for <code>type</code> to fire multiple events at once.
		 *	@param {String} type	Event type, or a comma-seprated list of event types.
		 *	@param {Array} [args]	Arguments to pass to each handler. Non-Array values get auto-boxed into an Array.
		 *	@returns {Array} an Array of handler return values. The Array also has "truthy" and "falsey" properties indicating if any handlers returned <code>true</code> or <code>false</code>, respectively.
		 */
		emit : function(type, args) {
			var returns = [],
				x, r, rval;
			type = normalizeType(type);
			if (!$.isArray(args)) {
				args = Array.prototype.slice.call(arguments, 1);
			}
			if (multi(this, 'emit', type, args, returns)) {
				return Array.prototype.concat.apply([], returns);
			}
			for (x=this._eventRegistry.length; x--; ) {
				r = this._eventRegistry[x];
				if (r.type===type) {
					if (returns.length===0) {
						returns.falsy = returns.falsey = returns.truthy = true;
					}
					rval = r.handler.apply(this, args);
					returns.push(rval);
					if (rval===true) {
						returns.falsy = returns.falsey = false;
					}
					else if (rval===false) {
						returns.truthy = false;
					}
					if (rval===false) {
						break;
					}
				}
			}
			return returns;
		}

	});
	
	
	$.forEach(/** @lends puredom.EventEmitter# */{
		
		/**	Alias of {@link puredom.EventEmitter#on on()}
		 *	@function
		 *	@private
		 */
		addListener : 'on',

		/**	Alias of {@link puredom.EventEmitter#on on()}
		 *	@function
		 *	@private
		 */
		addEventListener : 'on',

		/**	Alias of {@link puredom.EventEmitter#removeListener removeListener()}
		 *	@function
		 *	@private
		 */
		removeEventListener : 'removeListener',

		/**	Alias of {@link puredom.EventEmitter#emit emit()}
		 *	@function
		 *	@private
		 */
		trigger : 'emit',
	
		/**	Alias of {@link puredom.EventEmitter#emit emit()}
		 *	@function
		 *	@private
		 */
		fireEvent : 'emit'
		
	}, function(alias, key) {
		proto[key] = proto[alias];
	});
	
}(puredom));
/**	@namespace Functions for working with dates <br />
 *	See {@link http://php.net/strftime} for formatting options.
 */
puredom.date = /** @lends puredom.date */ {
	
	/** Returns the current timestamp, in milliseconds.
	 *	@function
	 *	@returns {Number} timestamp
	 */
	now : (
		Date.now ? function() {
			return Date.now();
		} : function() {
			return +new Date();
		}
	),
	

	/** Create a date, optionally from a string.<br />
	 *	This is a wrapper on new Date(str), adding support for more date formats and smoothing out differences between browsers.
	 *	@param {String} [str=now]	A date string, parsed and used to set the initial date.
	 *	@returns {Date} a new date object.
	 */
	create : function(str) {
		var date;
		if (str) {
			str = (str+'').replace(/^([0-9]{4})\-([0-9]{2})\-([0-9]{2})T([0-9]{2})\:([0-9]{2})\:([0-9]{2})\.[0-9]{3}Z$/, '$1/$2/$3 $4:$5:$6');
			date = new Date(str);
		}
		else {
			date = new Date();
		}
		return date;
	},
	
	
	/**	Parse a string with the given format into a Date object.
	 *	@param {String} str						A date string to parse
	 *	@param {String} [format="%d/%m/%Y"]		A date format string. See {@link http://php.net/strftime} for available fields.
	 *	@returns {Date|Boolean}	the date, or false on failure.
	 */
	parse : function(str, format) {
		format = format || "%d/%m/%Y";
		function setHours(hours, pm) {
			if (pm===false || pm===true) {
				temp.pm = pm===true;
			}
			if (hours || hours===0) {
				temp.hours = hours;
			}
			hours = temp.hours;
			if (temp.hours<12 && temp.pm) {
				hours -= 12;
			}
			var i = rdate.getDate();
			if (temp.hours===12 && temp.pm===false) {
				if (rdate.getHours()!==0 || typeof pm==='boolean') {
					rdate.setHours(0);
				}
			}
			else {
				rdate.setHours(hours);
				rdate.setDate(i);
			}
		}
		var origStr = str,
			rdate = new Date(0),
			temp = {},
			weekdays = ['mo','tu','we','th','fr','sa','su'],
			replacers = {
				H : [/^[0-9]{1,2}/g, function(e){e=Math.round(e);setHours(e);}],
				I : [/^[0-9]{1,2}/g, function(e){e=Math.round(e);setHours(e);}],
				p : [/^[AP]M/gi, function(e){setHours(null, e.toLowerCase()==="pm");}],
				M : [/^[0-9]{1,2}/g, function(e){rdate.setMinutes(Math.round(e));}],
				a : [/^(Mon|Tue(s?)|Wed|Thu|Fri|Sat|Sun)/i, function(){}],									// dummy
				A : [/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)/i, function(){}],			// dummy


				d : [/^[0-9]{1,2}/g, function(e){temp.date=Math.round(e);rdate.setDate(temp.date);}],
				m : [/^[0-9]{1,2}/g, function(e){temp.month=Math.round(e)-1;rdate.setMonth(temp.month);}],
				B : [new RegExp('^('+this.months.join("|")+')','gi'), function(e){temp.month=date._getMonthIndex(e);rdate.setMonth(temp.month);}],
				b : [/^(Jan|Feb|Mar|Apr|May|Jun(e?)|Jul(y?)|Aug|Sep(t?)|Oct|Nov|Dec)/gi, function(e){temp.month=date._getMonthIndex(e);rdate.setMonth(temp.month);}],
				y : [/^[0-9]{2}/g, function(e){e=Math.round(e)+1900;if(e<1950){e+=100;}rdate.setFullYear(e);}],		// wrap 2-digit dates at 1950/2050
				Y : [/^[0-9]{4}/g, function(e){temp.year=Math.round(e);rdate.setFullYear(temp.year);}]
			},
			index, rep, r;
		replacers.l = replacers.I;
		replacers.e = replacers.d;
		replacers.P = replacers.p;
		replacers.h = replacers.b;
		
		/**	@ignore */
		function rp(e) {
			rep[1](e);
			return '';
		}
		
		for (index=0; index<format.length; index++) {
			if (format.charAt(index)==="%") {
				rep = null;
				if (str.charAt(0)===' ' && format.charAt(index)==='%') {
					str = str.substring(1);
				}
				for (r in replacers) {
					if (replacers.hasOwnProperty(r) && format.substring(index+1, index+1+r.length)===r) {
						rep = replacers[r];
						str = str.replace(rep[0], rp);
						index += rep.length-1;		// advance past the used symbol in format str
						break;
					}
				}
			}
			else {
				if (str.charAt(0)===format.charAt(index)) {
					str = str.substring(1);
				}
			}
		}
		
		if (temp.month || temp.month===0) {
			rdate.setMonth(temp.month);
		}
		if (temp.year || temp.year===0) {
			rdate.setFullYear(temp.year);
		}
		
		return rdate;
	},


	/** Alias of {@link puredom.date.parse}
	 *	@see puredom.date.parse
	 *	@deprecated
	 *	@private
	 */
	unformat : function(){return this.parse.apply(this,arguments);},
	
	
	/**	Get a formatted string representation of a Date object.
	 *	@param {String} date					A date object to convert
	 *	@param {String} [format="%d/%m/%Y"]		A date format string. See {@link http://php.net/strftime} for available fields.
	 *	@returns {String|Boolean}	the formatted date string, or false on failure.
	 */
	format : function(date, format) {
		format = format || "%d/%m/%Y";
		
		if (!date || date.constructor!==Date || !date.toDateString) {
			return false;
		}
		
		var dateStr = date.toDateString();
		if (!dateStr || dateStr.toLowerCase()==="invalid date") {
			return false;
		}
		
		if (dateStr==='NaN') {	// only trips in IE ("3 is not an object")
			return false;
		}
		
		var dateParts = dateStr.split(" "),
			hours = date.getHours(),
			hv = ((hours+11)%12)+1,
			m = date.getMonth()+1,
			replacers = {
				H : hours,						// 24 hour time
				I : (hv<10?"0":"") + hv,		// 12 hour time, leading 0
				l : hv,							// 12 hour time
				p : hours>11?"PM":"AM",
				P : hours>11?"pm":"am",
				M : (date.getMinutes()<10?"0":"") + date.getMinutes(),
				S : (date.getSeconds()<10?"0":"") + date.getSeconds(),		// seconds
				a : dateParts[0],
				A : this.weekdays[date.getDay()],
				d : dateParts[2],
				e : Math.round(dateParts[2]),
				m : (m<10?"0":"") + m,
				B : this.months[Math.round(dateParts[1])],
				b : dateParts[1],
				h : dateParts[1],
				y : dateParts[3].substring(2),
				Y : dateParts[3]
			};
		
		return format.replace(/%[HIlpPMSaAdemBbhyY]/gm, function(s) {
			var v = replacers[s.charAt(1)+''];
			return (v || v===0 || v===false) ? v : s;
		});
	},
	

	/** @private */
	_getMonthIndex : function(m){
		m = m.substring(0,3).toLowerCase();
		for (var x=0; x<this.months.length; x++) {
			if (this.months[x].substring(0,3).toLowerCase()===m) {
				return x;
			}
		}
		return -1;
	},
	

	/** Weekday names
	 *	@type Array(String)
	 */
	weekdays : ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],


	/** Month names
	 *	@type Array(String)
	 */
	months : ["January","February","March","April","May","June","July","August","September","October","November","December"]
	
};
/** @namespace Networking functionality. */
puredom.net = puredom.extend(new puredom.EventEmitter(), /** @lends puredom.net */ {
	
	/**	@class Represents an HTTP request.
	 *	The raw XMLHttpRequest object is accessible through a *request* property.
	 */
	HttpRequest : function HttpRequest(options){
		puredom.extend(this, options);
	},
	
	
	/**	Make a GET request. <br />
	 *	This is a convenience wrapper around {@link puredom.net.request}.
	 *	@param {String} url				URL to request
	 *	@param {Function} callback		Called on completion. Gets passed <code>(success, response, request)</code>.
	 *	@param {Object} [options]		Additional configuration. See options for {@link puredom.net.request}.
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 *	@example
	 *		puredom.net.get("/ajax?f=1", function(success, response) {
	 *			console.log(success===true, response);
	 *		});
	 */
	get : function(url, callback, options) {
		return this.request(puredom.extend({
			url : url,
			method : 'GET'
		}, options || {}), callback);
	},
	
	
	/**	Make a POST request. <br />
	 *	This is a convenience wrapper around {@link puredom.net.request}.
	 *	@param {String} url				URL to request
	 *	@param {Object|String} body		Request body.  If an <code>Object</code>, will be serialized based on the request's Content-Type (defaulting to form-encoded)
	 *	@param {Function} callback		Called on completion. Gets passed <code>(success, response, request)</code>.
	 *	@param {Object} [options]		Additional configuration. See options for {@link puredom.net.request}.
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 *	@example
	 *		puredom.net.get("/ajax?f=2", { foo:'bar' }, function(success, res, req) {
	 *			console.log(success===true, res, req.status, req.responseHeaders);
	 *		});
	 */
	post : function(url, body, callback, options) {
		return this.request(puredom.extend({
			url : url,
			method : 'POST',
			body : body
		}, options || {}), callback);
	},
	
	
	/**	Construct and send an HTTP request based on the specified options.
	 *	@param {Object} options			Request options.
	 *	@param {String} options.url						URL to request
	 *	@param {String} [options.method="GET"]			HTTP method to use
	 *	@param {String|Object} [options.body]			Request body. If a <code>String</code> is passed, it is considered pre-serialized.  
	 *													If an <code>Object</code> is passed, it will be serialized based on the request's 
	 *													<code>Content-Type</code> header.
	 *	@param {Any} [options.bodySerialized]			If set, gets assigned unmodified as the request body.  If you're sending something like Blob data, this is for you.
	 *	@param {Object} [options.headers]				A key-value list of request headers to send.
	 *	@param {Object} [options.contentTypeOverride]	If set, overrides the response's <code>Content-Type</code> header with the given value.
	 *	@param {Object} [options.callback]				Alias of <code>callback</code>, a function to call on completion. Gets passed <code>(success, response, request)</code>.
	 *	@param {Function} [callback]	Called on completion. Gets passed <code>(success, response, request)</code>.  If set, takes precidence over <code>options.callback</code>.
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 */
	request : function(options, callback) {
		var self = this,
			req;
		options = options || {};

		if (!options.url) {
			return false;
		}

		if (!options.method && options.type) {
			options.method = options.type;
			console.warn('puredom.net.request: The `type` option is deprecated. Use `method`.');
		}

		if (!options.body && options.post) {
			options.body = options.post;
			console.warn('puredom.net.request: The `post` option is deprecated. Use `body`.');
		}

		req = new puredom.net.HttpRequest({
			url			: options.url,
			type		: options.method || (body ? "POST" : "GET"),
			callback	: callback || options.callback,
			body		: options.body,
			headers		: {
				'content-type' : 'application/x-www-form-urlencoded',
				'x-requested-with' : 'XMLHttpRequest'
			}
		});

		if (options.headers) {
			puredom.forEach(options.headers, function(value, key) {
				req.headers[String(key).toLowerCase()] = String(value);
			});
		}

		if (options.contentTypeOverride) {
			req.contentTypeOverride = options.contentTypeOverride;
			// @todo: fixme
			delete options.contentTypeOverride;
		}

		options = callback = null;

		/** @ignore */
		function handleReadyState() {
			var xhr = req.request,
				typeMap = {
					json : 'JSON',
					document : 'XML'
				},
				headerReg = /^([a-z\-\.\_])\s*?\:/gim,
				head, contentType, resType, key;
			
			if (xhr.readyState!==4) {
				return;
			}
			self.fireEvent('before:response', req);
			
			req.status = xhr.status;
			req.responseType = 'text';
			req.responseText = req.response = xhr.responseText;
			
			req.responseHeaders = {};
			headerReg.lastIndex = 0;
			head = xhr.getAllResponseHeaders();
			while ( (key=headerReg.exec(head)) ) {
				req.responseHeaders[key[1].toLowerCase()] = xhr.getResponseHeader(key[1]);
			}

			if (req.contentTypeOverride) {
				contentType = req.contentTypeOverride.toLowerCase();
			}
			else {
				try {
					contentType = (xhr.getResponseHeader("Content-Type")).toLowerCase();
				} catch(err) {}
				contentType = contentType || "";
			}
			
			resType = xhr.responseType;
			if (resType) {
				req.responseType = resType;
				req.response = xhr.response;
				key = 'response' + (typeMap[resType] || resType.charAt(0).toUpperCase()+resType.substring(1));
				req[key] = req.response;
			}
			else if (contentType.match(/(^|\/)(json|javascript)$/gm)) {
				req.responseType = 'json';
				try {
					req.response = req.responseJSON = JSON.parse(xhr.responseText.replace(/^[^\[\{]*(.*)[^\[\{]*$/g,'$1'));
				} catch(parseError) {
					req.jsonParseError = parseError;
				}
			}
			else if (contentType==='application/xml' || contentType==='xml') {
				req.responseType = 'document';
				req.response = req.responseXML = xhr.responseXML;
			}
			
			if (typeof req.callback==='function') {
				req.callback(req.status<400, req.response, req);
			}
		}
		
		/**	@ignore */
		this.createXHR(req, function(xhr) {

			/**	A reference to the request's underlying XMLHttpRequest instance
			 *	@name puredom.net.HttpRequest#xhr
			 *	@object
			 */
			req.xhr = xhr;

			req.request = xhr;
			
			xhr.onreadystatechange = handleReadyState;

			xhr.open(req.type, req.url, req.async!==false);

			puredom.forEach(req.headers, function(value, key) {
				xhr.setRequestHeader(key, value);
			});

			if (!req.bodySerialized && req.body && puredom.typeOf(req.body)==='object') {
				self.serializeRequestBody(req);
			}

			xhr.send(req.bodySerialized || req.body || null);
		});

		return req;
	},


	/**	Lookup for request serialization methods. 
	 *	Each must expose a stringify() or encode() method. 
	 *	Keys are strings to find within a request's content-type header (lowercase'd).
	 *	@private
	 */
	requestSerializers : {
		json : puredom.json,

		xml : puredom.xml,

		'form-encoded' : puredom.querystring
	},


	/**	Serialize a request body. Adds a <code>bodySerialized</code> property to <code>req</code>.
	 *	@param {puredom.net.HttpRequest} req
	 *	@private
	 */
	serializeRequestBody : function(req) {
		var contentType = (req.headers['content-type'] || 'application/x-www-form-urlencoded').toLowerCase();
		puredom.forEach(this.serializers, function(api, type) {
			if (contentType.indexOf(type)>-1) {
				req.bodySerialized = (api.stringify || api.encode || api)(req.body);
				return false;
			}
		});
	},


	/** Asynchronously create an XMLHttpRequest object, automatically instantiating it from within an iframe if the TLD matches the page's TLD.
	 *	@private
	 */
	createXHR : function(req, callback, context) {
		var xhr;
		context = context || window;
		
		if (context.XMLHttpRequest) {
			xhr = new context.XMLHttpRequest();
		}
		else {
			try {
				xhr = new context.ActiveXObject("Msxml2.XMLHTTP");
			} catch(err2) {
				xhr = new context.ActiveXObject("Microsoft.XMLHTTP");
			}
		}

		callback(xhr);
		return xhr;
	}
	
	
});
/**	When called as a function, <code>puredom.net.jsonp()</code> is an alias of {@link puredom.net.jsonp.get}.
 *	@namespace JSONP Implementation. <br />
 *		JSONP only supports GET requests, but works across domains. <br />
 *		The server must support sending {@link http://en.wikipedia.org/wiki/JSONP JSONP} callbacks.
 *	@function
 *	@returns {puredom.net.jsonp.Request} jsonpRequest
 */
puredom.net.jsonp = (function() {

	/** @namespace JSONp-related functionality.
	 *	@name puredom.net.jsonp
	 *	@private
	 */
	var jsonp = function() {
			return jsonp.get.apply(jsonp, arguments);
		},
		reqIndex = 0;
	
	/**	Initiate a JSONP request.
	 *	@name puredom.net.jsonp.get
	 *	@function
	 *	@param {String} url			The service URL, including querystring parameters.
	 *	@param {Object} [options]		A hash of available options.
	 *	@param {String} [options.url=url]		The service URL
	 *	@param {Object} [options.params]		GET parameters as an object.
	 *	@param {Function} [options.callback]	A function to handle the data once received.
	 *	@param {Number} [options.timeout=10]	A number of seconds to wait before triggering failure.
	 *	@param {Function} callback	A function that gets called when the request returns.
	 *	@returns {puredom.net.jsonp.Request} jsonpRequest
	 */
	jsonp.get = function(url, options, callback) {
		var script, requestObj, callbackId, tmp;
		
		if (puredom.typeOf(options)==='function') {
			if (callback && puredom.typeOf(callback)==='object') {
				tmp = callback;
			}
			callback = options;
			if (tmp) {
				options = tmp;
			}
		}
		options = options || {};
		if (options.callback && !callback) {
			callback = options.callback;
		}
		if (!options.timeout) {
			options.timeout = 10;
		}
		url = url || options.url;
		
		if (!url) {
			return false;
		}
		
		if (options.params && puredom.parameterize) {
			url += (url.indexOf('?')>-1?'&':'?') + puredom.querystring.stringify(options.params);
		}
		
		reqIndex += 1;
		
		options.callback = callbackId = "puredom_net_jsonp_"+reqIndex;
		(function(jsonp, reqIndex) {
			/**	@ignore */
			window[options.callback] = function(data) {
				var e;
				if (callback) {
					try {
						callback(data);
					} catch(err) {
						e = err;
					}
					callback = null;
				}
				if (requestObj) {
					requestObj.stop();
					requestObj = null;
				}
				if (e) {
					throw(e);
				}
			};
		}());
		
		if (url.indexOf('{!callback}')>-1) {
			url = url.replace('{!callback}', callbackId);
		}
		else {
			url += (url.indexOf('?')<0?'?':'&') + encodeURIComponent(options.callbackParam || 'callback') + '=' + encodeURIComponent(callbackId);
		}
		
		if (!this._head) {
			tmp = document.getElementsByTagName('head');
			this._head = tmp && tmp[0];
		}
		
		script = puredom.el({
			type : 'script',
			attributes : {
				src		: url,
				async	: 'async',
				type	: 'text/javascript'
			},
			parent : this._head || document.body
		});
		
		/**	@class Represents a JSONp request.
		 *	@name puredom.net.jsonp.Request
		 */
		requestObj = /** @lends puredom.net.jsonp.Request# */ {
			/**	The request's callback ID */
			id : callbackId,
			
			/**	Attempt to stop the request. */
			stop : function() {
				if (requestObj._timer) {
					clearTimeout(requestObj._timer);
				}
				window[callbackId] = null;
				try {
					delete window[callbackId];
				}catch(err){}
				callback = null;
				script.attr('src', 'about:blank').remove();
				callbackId = requestObj = script = null;
			}
		};
		
		if (options.timeout && options.timeout>0) {
			requestObj._timer = setTimeout(function() {
				if (callback) {
					callback({
						_requestTimedOut : true,
						_jsonpTimedout : true,
						success : false,
						result : false
					});
				}
				if (requestObj) {
					requestObj.stop();
				}
			}, Math.round(options.timeout*1000));
		}
		
		url = options = tmp = null;
		
		return requestObj;
	};
	
	return jsonp;
}());
/**	Provides a cross-browser persisted storage layer using various storage adapters.
 *	@constructor Asynchronously creates an instance of LocalStorage.
 *	@param {String} id				Required identifier for the specific storage instance.
 *	@param {Object} [options]		Hashmap of available config options (see description)
 *	@param {Object} [options.adapter=auto]		Attempt to use a specific adapter. If unset, the best adapter is automatically used (useBest=true).
 *	@param {Object} [options.useBest=true]		Attempt to use the best adapter available, unless an adapter is manually specified and loads successfully.
 *	@param {Object} [options.restore=true]		Attempt to restore the data immediately.
 *	@param {Function} [callback]	Gets passed a reference to the instance after the initial restore() has completed.
 */
puredom.LocalStorage = function LocalStorage(id, callback, options) {
	var self = this;
	if (typeof arguments[2]==='function') {
		callback = arguments[2];
		options = arguments[1];
	}
	options = options || {};
	
	this.id = id;
	this.adapter = null;
	this.data = {};
	
	if (options.adapter) {
		this.setAdapter(options.adapter);
	}
	if (!this.adapter && options.useBest!==false) {
		this.useBestAdapter();
	}
	if (this.adapter && options.restore!==false) {
		this.restore(function() {
			if (callback) {
				callback(self);
			}
			self = options = null;
		});
	}
	else if (callback) {
		callback(self);
		self = null;
	}
};


/** The maximum number of milliseconds to wait before committing data to the persistence layer.
 *	@number
 */
puredom.LocalStorage.prototype.commitDelay = 100;


/** The internal data representation.
 *	@private
 */
puredom.LocalStorage.prototype.data = {};


/** Specify the name of a storage adapter the instance should use.<br />
 *	<strong>Note:</strong> Pay attention to the return value! 
 *	Even if you know a given adapter exists, it may fail to load if it is not supported in the 
 *	current environment (eg: if window.localStorage doesn't exists, cookies are blocked, etc).
 *	@param {String} type		The name of an adapter to use. For a list, see {@link puredom.LocalStorage.adapters}
 *	@returns {Boolean} <code>true</code> if the adapter loaded successfully, <code>false</code> if the specified adapter did not exist or could not be loaded.
 */
puredom.LocalStorage.prototype.setAdapter = function(type) {
	var list = this.constructor.adapters,
		lcType = (type+'').toLowerCase().replace(/adapt[eo]r$/g,''),
		found = false,
		foundWorking = false,
		i;
	for (i in list) {
		if (list.hasOwnProperty(i) && (i+'').toLowerCase().replace(/adapt[eo]r$/g,'')===lcType) {
			found = true;
			if (list[i].test(this)===true) {
				foundWorking = true;
				this.adapterName = type;
				this.adapter = list[i];
				break;
			}
		}
	}
	if (!found) {
		puredom.log('puredom.LocalStorage :: Could not find "'+type+'" adapter.');
		return false;
	}
	if (!foundWorking) {
		puredom.log('puredom.LocalStorage :: "'+type+'" adapter test() failed: conditions for adapter use not met.');
		return false;
	}
	return true;
};

/** Get the name of the active adapter.
 *	@returns {String} The curernt adapter's name
 */
puredom.LocalStorage.prototype.getAdapter = function() {
	return this.adapterName;
};

/**	Load whichever adapter works best in the current environment. <br />
 *	This is determined by querying each adapter to check which are supported, then 
 *	selecting the best based on a pre-determined "score", as reported by the adapter.<br />
 *	<strong>Note:</strong> This method throws a delayed error (does not stop execution) if no adapters are supported in the current environment.
 */
puredom.LocalStorage.prototype.useBestAdapter = function() {
	var list = this.constructor.adapters,
		best, bestName, i;
	for (i in list) {
		if (list.hasOwnProperty(i) && i!=='none' && list[i].test(this)===true) {
			if (!best || (Math.round(best.rating) || 0)<(Math.round(list[i].rating) || 0)) {
				best = list[i];
				bestName = i;
			}
		}
	}
	if (best) {
		this.adapterName = bestName;
		this.adapter = best;
	}
	else {
		setTimeout(function() {
			throw('puredom.LocalStorage :: Could not find the best adapter.');
		}, 1);
		return false;
	}
	return true;
};

/** Get a namespaced facade of the LocalStorage interface.<br />
 *	<strong>Tip:</strong> This is a nice way to reduce the number of commits triggered by a large application, 
 *	because all namespaces derived from a single LocalStorage instance share the same commit queue.
 *	@param {String} ns		A namespace (prefix) to use. Example: <code>"model.session"</code>
 *	@returns {puredom.LocalStorage.NamespacedLocalStorage} An interface identical to {@link puredom.LocalStorage}.
 */
puredom.LocalStorage.prototype.getNamespace = function(ns) {
	var self = this,
		iface;
	ns = ns + '';
	if (ns.substring(0,1)==='.') {
		ns = ns.substring(1);
	}
	if (ns.substring(ns.length-1)==='.') {
		ns = ns.substring(0, ns.length-1);
	}
	iface = puredom.extend(new puredom.LocalStorage.NamespacedLocalStorage(), {
		getAdapter : function() {
			return self.getAdapter();
		},
		/** omg this is so meta */
		getNamespace : this.getNamespace,
		getValue : function(key) {
			return self.getValue(ns+'.'+key);
		},
		setValue : function(key, value) {
			self.setValue(ns+'.'+key, value);
			return this;
		},
		removeKey : function(key) {
			self.removeKey(ns+'.'+key);
			return this;
		},
		purge : function() {
			self.removeKey(ns);
			return this;
		},
		getData : function() {
			return self.getValue(ns);
		},
		restore : function(callback) {
			var proxiedCallback,
				proxiedContext = this;
			if (callback) {
				proxiedCallback = function() {
					callback(proxiedContext);
					proxiedContext = proxiedCallback = callback = null;
				};
			}
			self.restore(proxiedCallback);
			return this;
		},
		commit : function(callback) {
			var proxiedCallback,
				proxiedContext = this;
			if (callback) {
				proxiedCallback = function() {
					callback(proxiedContext);
					proxiedContext = proxiedCallback = callback = null;
				};
			}
			self.commit(proxiedCallback);
			return this;
		}
	});
	puredom.extend(iface, {
		get : iface.getValue,
		set : iface.setValue,
		remove : iface.removeKey
	});
	return iface;
};

/**	Get the full data object.
 *	@returns {Object} data
 */
puredom.LocalStorage.prototype.getData = function() {
	return this.data;
};


/** Get the stored value corresponding to a dot-notated key.
 *	@param {String} key		A key, specified in dot-notation.
 *	@returns If <code>key</code> exists, returns the corresponding value, otherwise returns undefined.
 */
puredom.LocalStorage.prototype.getValue = function(key) {
	var value = puredom.delve(this.data, key);
	return value;
};

/** Set the stored value corresponding to a dot-notated key. <br />
 *	If the key does not exist, it is created.
 *	@param {String} key		A key, specified in dot-notation.
 *	@param {Any} [value]	The value to set. If an {Object} or {Array}, its internal values become accessible as dot-notated keys. If <code>null</code> or <code>undefined</code>, the key is removed.
 *	@returns {this}
 */
puredom.LocalStorage.prototype.setValue = function(key, value) {
	var node = this.data,
		keyParts = key.split('.'),
		i;
	for (i=0; i<keyParts.length-1; i++) {
		if (!node.hasOwnProperty(keyParts[i])) {
			node[keyParts[i]] = {};
		}
		node = node[keyParts[i]];
	}
	if (value===undefined || value===null) {
		node[keyParts[keyParts.length-1]] = null;
		delete node[keyParts[keyParts.length-1]];
	}
	else {
		node[keyParts[keyParts.length-1]] = value;
	}
	this.queueCommit();
	return this;
};

/** Remove a key and (its stored value) from the collection.
 *	@param {String} key		A key, specified in dot-notation.
 *	@returns {this}
 */
puredom.LocalStorage.prototype.removeKey = function(key) {
	this.setValue(key, undefined);
	return this;
};

/** Alias of {puredom.LocalStorage#getValue} */
puredom.LocalStorage.prototype.get = puredom.LocalStorage.prototype.getValue;

/** Alias of {puredom.LocalStorage#setValue} */
puredom.LocalStorage.prototype.set = puredom.LocalStorage.prototype.setValue;

/** Alias of {puredom.LocalStorage#removeKey} */
puredom.LocalStorage.prototype.remove = puredom.LocalStorage.prototype.removeKey;

/** Remove all keys/values in the collection.
 *	@returns {this}
 */
puredom.LocalStorage.prototype.purge = function() {
	this.data = {};
	this.queueCommit();
	return this;
};

/** Restore the collection from its persisted state.
 *	@param {Function} callback		Gets called when the restore has completed, passed a reference to the instance.
 *	@returns {this}
 */
puredom.LocalStorage.prototype.restore = function(callback) {
	var self = this,
		data, asyncData;
	data = this._adapterCall('load', function(r) {
		self.data = asyncData = r || {};
		if (callback) {
			callback(self);
		}
		self = null;
	});
	if (data && !asyncData) {
		this.data = data;
		if (callback) {
			callback(this);
		}
	}
	data = asyncData = null;
	return this;
};

/** Save the collection <strong>immediately</strong> using the active persistence adapter.<br />
 *	This bypasses the default "delayed write" save technique that is implicitly used when interacting with other methods.
 *	@param {Function} callback		Gets called when the commit has completed, passed a reference to the instance.
 *	@returns {this}
 */
puredom.LocalStorage.prototype.commit = function(callback) {
	var self = this;
	if (this._commitTimer) {
		clearTimeout(this._commitTimer);
		this._commitTimer = null;
	}
	this._adapterCall('save', this.data, function() {
		if (callback) {
			callback(self);
		}
		self = null;
	});
	return this;
};

/** Queue a commit if one is not already queued.
 *	@private
 */
puredom.LocalStorage.prototype.queueCommit = function() {
	var self = this;
	if (!this._commitTimer) {
		this._commitTimer = setTimeout(function() {
			self.commit();
			self = null;
		}, this.commitDelay);
	}
};

/** Make a call to the active persistence adapter.
 *	@private
 *	@param {String} func	The adapter function to execute
 *	@param args				All other arguments are forwarded on to the adapter.
 *	@returns {Any} The adapter method's return value.
 */
puredom.LocalStorage.prototype._adapterCall = function(func, args) {
	if (this.adapter && this.adapter[func]) {
		return this.adapter[func].apply(this.adapter, [this].concat(puredom.toArray(arguments).slice(1)));
	}
};







/** A namespaced facade of the LocalStorage interface.
 *	@augments puredom.LocalStorage
 *	@abstract
 */
puredom.LocalStorage.NamespacedLocalStorage = function(){};


/** @namespace A list of registered adapters
 */
puredom.LocalStorage.adapters = {};


/** Register a storage adapter.
 *	@param {String} name		A name for the adapter. Used by {@link puredom.LocalStorage#setAdapter} and {@link puredom.LocalStorage#getAdapter}.
 *	@param {Object} adapter		The adapter itself.
 *	@public
 */
puredom.LocalStorage.addAdapter = function(name, adapter) {
	if (!adapter.save) {
		throw('puredom.LocalStorage :: Adapter "'+name+'" attempted to register, but does not provide a save() method.');
	}
	else  if (!adapter.load) {
		throw('puredom.LocalStorage :: Adapter "'+name+'" attempted to register, but does not provide a load() method.');
	}
	else {
		this.adapters[name] = adapter;
	}
};


/**	@class Abstract storage adapter interface. */
puredom.LocalStorage.adapters.none = function() {};

puredom.extend(puredom.LocalStorage.adapters.none.prototype, /** @lends puredom.LocalStorage.adapters.none */ {
	
	/** The default ID to use for database storage. <br />
	 *	This is used as a fallback in cases {@link puredom.LocalStorage#id} does not exist.
	 */
	defaultName : 'db',
	
	/** An adapter rating from 0-100. Ratings should be based on <strong>speed</strong> and <strong>storage capacity</strong>. <br />
	 *	It is also possible to produce a dynamic rating value based on the current environment, though this is not recommended in most cases.
	 */
	rating : 0,
	
	/** Tests if the adapter is supported in the current environment.
	 *	@param {puredom.LocalStorage} storage		The parent storage instance.
	 *	@returns {Boolean} isSupported
	 */
	test : function(storage) {
		return false;
	},
	
	/** Load all persisted data.
	 *	@param {puredom.LocalStorage} storage	The parent storage instance.
	 *	@param {Function} callback				A function to call once the data has been loaded. Expects a JSON object.
	 */
	load : function(storage, callback) {
		if (callback) {
			callback();
		}
	},
	
	/** Save all data to the persistence layer.
	 *	@param {puredom.LocalStorage} storage	The parent storage instance.
	 *	@param {Object} data					The JSON data to be saved.
	 *	@param {Function} callback				A function to call once the data has been saved. Expects a {Boolean} value indicating if the save was successful.
	 */
	save : function(storage, data, callback) {
		if (callback) {
			callback(false);
		}
	}
	
});






/**	@class Storage adapter that persists data into browser cookies.
 *	@name puredom.LocalStorage.adapters.CookieAdapter
 */
puredom.LocalStorage.addAdapter('CookieAdapter', /** @lends puredom.LocalStorage.adapters.CookieAdapter */ {
	
	/** The default cookie ID to use for database storage */
	defaultName : 'db',
	
	
	/** This adapter can only store a few Kilobytes of data, so its rating is 5. */
	rating : 5,
	
	
	/** Test if this adapter will work in the current environment. */
	test : function(storage) {
		if (puredom.cookies && puredom.cookies.get && ('cookie' in document)) {
			return true;
		}
		return false;
	},
	
	
	/** Load the DB from cookies. */
	load : function(storage, callback) {
		var jsonStr = puredom.cookies.get(storage.id || this.defaultName),
			obj;
		if (jsonStr) {
			obj = puredom.json(jsonStr);
		}
		if (callback) {
			callback(obj);
		}
		return obj;
	},
	
	
	/** Save the DB to cookies. */
	save : function(storage, data, callback) {
		puredom.cookies.set(
			storage.id || this.defaultName,
			puredom.json(data)
		);
		if (callback) {
			callback(true);
		}
	}
	
});
/**	@class Storage adapter that persists data into HTML5 LocalStorage.
 *	@name puredom.LocalStorage.adapters.LocalStorageAdapter
 */
puredom.LocalStorage.addAdapter('LocalStorageAdapter', /** @lends puredom.LocalStorage.adapters.LocalStorageAdapter */ {
	
	/**	The default root key ID to use for accessing localStorage */
	defaultName : 'db',
	
	
	/**	This adapter is a very good storage mechanism, so its rating is 60. */
	rating : 60,
	
	
	/**	Test if this adapter will work in the current environment */
	test : function(storage) {
		var available = ('localStorage' in window) && typeof window.localStorage.hasOwnProperty==='function',
			prev,
			val = puredom.json({a:'a',b:4/3,c:true,d:null});
		if (available) {
			try {
				prev = localStorage.__test;
				localStorage.__test = val;
				if (localStorage.__test!==val) {
					available = false;
				}
				localStorage.__test = prev;
				if (prev===undefined) {
					delete localStorage.__test;
				}
			} catch(err) {
				available = false;
			}
		}
		return available;
	},
	
	
	/**	Load the persisted DB */
	load : function(storage, callback) {
		var key = this._getKey(storage),
			data;
		if (localStorage.hasOwnProperty(key)) {
			data = puredom.json.parse(localStorage[key]);
		}
		if (callback) {
			callback(data);
		}
		return data;
	},
	
	/**	Save the DB to localStorage */
	save : function(storage, data, callback) {
		var key = this._getKey(storage);
		if (data===undefined) {
			delete localStorage[key];
		}
		else {
			localStorage[key] = puredom.json.stringify(data);
		}
		if (callback) {
			callback(true);
		}
		return true;
	},
	
	
	/**	Get the key for a storage object
	 *	@private
	 */
	_getKey : function(storage) {
		return (storage.id || this.defaultName || '') + '';
	}
	
});
/**	@class Storage adapter that persists data into HTML5 LocalStorage.
 *	@name puredom.LocalStorage.adapters.UserDataAdapter
 */
puredom.LocalStorage.addAdapter('UserDataAdapter', /** @lends puredom.LocalStorage.adapters.UserDataAdapter */ {
	
	/** The default cookie ID to use for database storage */
	defaultName : 'db',
	
	
	/**	This adapter is a mediocre storage mechanism, so it gets a low rating. */
	rating : 20,
	
	
	/**	Test if this adapter will work in the current environment */
	test : function(storage) {
		// IE 6 and below crashes without an error description. Block it for now:
		if ((/\bMSIE\s[1-6](\.[0-9]*)?/gim).test(navigator.userAgent+'')) {
			return false;
		}
		return typeof document.body.addBehavior!=='undefined';
	},
	
	
	/**	Load the persisted DB */
	load : function(storage, callback) {
		var key = this._getKey(storage),
			store = this._getStore(key),
			json, data;
		if (store) {
			json = store.getAttribute('puredomlocalstorage');
		}
		if (json) {
			data = puredom.json.parse(json);
		}
		if (callback) {
			callback(data);
		}
		return data;
	},
	
	
	/**	Save the DB to UserData */
	save : function(storage, data, callback) {
		var key = this._getKey(storage),
			store = this._getStore(key),
			attr = 'puredomlocalstorage',
			value,
			saved = false;
		if (store && ('save' in store)) {
			if (data===undefined) {
				if (store.removeAttribute) {
					store.removeAttribute(attr);
				}
				else {
					store.setAttribute(attr, '');
				}
			}
			else {
				store.setAttribute(attr, puredom.json.stringify(data));
			}
			store.save(key);
			saved = true;
		}
		if (callback) {
			callback(saved);
		}
		return saved;
	},
	
	
	/**	@private */
	_getStore : function(key) {
		var s;
		if (!this.stores) {
			this.stores = {};
		}
		s = this.stores[key];
		if (!s) {
			s = this.stores[key] = document.getElementById(key);
			if (!s) {
				s = this.stores[key] = document.createElement('span');
				s.style.position = 'absolute';
				s.style.top = '-100px';
				s.style.left = '0';
				s.style.behavior = "url('#default#userData')";
				document.body.appendChild(s);
			}
		}
		if (s.getAttribute('data-tdlsud-loaded')!=='true') {
			s.setAttribute('data-tdlsud-loaded', 'true');
			s.load(key);
		}
		return s;
	},
	
	
	/** Get the key for a storage object
	 *	@private
	 */
	_getKey : function(storage) {
		return 'ieud' + (storage.id || this.defaultName || '') + '';
	}
	
});