(function(window, global) {
	/**	@exports self as puredom */

	// node:
	if (typeof process==='object' && process.argv && process.argv[0]==='node') {
		window = require('jsdom').jsdom().parentWindow;
	}

	var document = window.document,
		navigator = window.navigator;

	var previousSelf = window.puredom;

	if (typeof Date.now!=='function') {
		/**	@ignore */
		Date.now = function() {
			return new Date().getTime();
		};
	}

	/**	When called as a function, acts as an alias of {@link puredom.el}.<br />
	 *	If a <code>Function</code> is passed, it is registered as a DOMReady handler. <br />
	 *	Otherwise, all arguments are passed on to {@link puredom.el}.
	 *	@version 1.9.1
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
			version : '1.9.1',
			templateAttributeName : 'data-tpl-id',
			baseAnimationInterval : 20,
			allowCssTransitions : true,
			easingMethods : {
				ease : function(f) {
					return (Math.sin(f*Math.PI - Math.PI/2) + 1) / 2;
				},
				'ease-in-out' : function(f) {
					return this.ease(f);
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
				filters : false,
				querySelectorAll : 'querySelectorAll' in document,
				webkitMultitouch : 'ontouchstart' in window && navigator.maxTouchPoints!==0 && navigator.msMaxTouchPoints!==0
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
			}
		};

	/** @ignore */
	function noop(){}

	/** @ignore */
	self.support = priv.support;

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


	/** Mix functionality from one object into another. <br />
	 *	<strong>Note:</strong> all additional arguments are treated as additional Objects to copy properties from. <br />
	 *	<strong>Alternative Signature:</strong> <code>mixin(true, [props, ...], base)</code>
	 *	@param {Object} base	The object to extend. For cloning, use an object literal.
	 *	@param {Object} props	An Object to copy properties from, unless base already has a property of the same name.
	 *	@returns {Object} base
	 *	@example
	 *		// standard:
	 *		puredom.mixin(myObj, decorator1, decorator2);
	 *
	 *		// alternative, decorator-first style:
	 *		puredom.mixin(true, decorator1, decorator2, myObj);
	 */
	self.mixin = function(base) {
		var i, j, ext,
			mix = Array.prototype.slice.call(arguments, 1);
		if (base===true) {
			base = mix.pop();
		}
		base = base || {};
		for (i=0; i<mix.length; i++) {
			if ( (ext=mix[i]) ) {
				for (j in ext) {
					if (ext.hasOwnProperty(j) && !base.hasOwnProperty(j)) {
						base[j] = ext[j];
					}
				}
			}
		}
		return base;
	};


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
		if (path==='.' || (path==='this' && !obj.hasOwnProperty('this'))) {
			return obj;
		}
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
		//return String(typeof what).toLowerCase();
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
				callback = noop;
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
			var classes = self.isArray(className) ? className : self.toArray(arguments);
			this._each(function(el) {
				self.addClass(el, classes);
			});
			return this;
		},

		/**	Remove a CSS class to the selection. <br />
		 *	Pass an Array and/or multiple arguments to remove multiple classes.
		 *	@param {String} className		A CSS class to remove.
		 *	@returns {this}
		 */
		declassify : function(className) {
			var classes = self.isArray(className) ? className : self.toArray(arguments);
			this._each(function(el) {
				self.removeClass(el, classes);
			});
			return this;
		},

		/** Check if the selection contains only nodes with the given CSS class.
		 *	@param {String} className		The CSS class to check for
		 *	@param {Boolean} [ifAny=false]	If `true`, returns `true` only if *and* nodes have the given CSS class
		 *	@returns {Boolean}
		 */
		hasClass : function(className, ifAny) {
			var result = ifAny!==true;
			this._each(function(node) {
				var exists = node.classList ? node.classList.contains(className) : (' '+node.className+' ').indexOf(' '+className+' ')>-1;
				if (ifAny===true) {
					if (exists) {
						result = true;
						return false;
					}
				}
				else if (!exists) {
					result = false;
				}
			});
			return result;
		},

		/** Set the opacity of each node in the selection.
		 *	@param {Number} opacity		A value from 0 to 1
		 *	@returns {this}
		 */
		setOpacity : function(opacity) {
			this._each(function(el) {
				self.setOpacity(el, opacity);
			});
			return this;
		},

		/** Call a method on each node in the selection and sum the results.
		 *	@returns {Number}
		 */
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
						if (typeof i==='string' && key.hasOwnProperty(i)) {
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
					if (typeof a!=='string') {
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
			return this;
		},
		disable : function() {
			this.attr('disabled', 'disabled');
			return this;
		},
		enabled : function(newValue) {
			if (newValue===true || newValue===false) {
				this[newValue?'enable':'disable']();
				return this;
			}
			else {
				return this.attr('disabled')!=='disabled' && this.prop('disabled')!==true;
			}
		},

		/**	Register an event handler. <br />
		 *	When an event of the given type is triggered, the handler function is called.
		 *	@param {String} type			An event type to listen for
		 *	@param {String} [selector]		Optionally fire only if the event target matches a CSS selector
		 *	@param {Function} handler		A handler to call in response to the event
		 *	@example
		 *		function clickHandler(e){ alert(e.button); }
		 *		foo.addEvent("click", clickHandler);
		 *	@returns {this}
		 */
		on : function(type, selector, handler) {
			this._each(function(el) {
				self.addEvent(el, type, selector, handler);
			});
			return this;
		},

		/**	Un-register an event handler.
		 *	@param {String} type			The event type
		 *	@param {String} [selector]		Optionally fire only if the target matches a CSS selector
		 *	@param {Function} handler		The handler to remove
		 *	@example
		 *		foo.removeEvent("click", clickHandler);
		 *	@returns {this}
		 */
		off : function(type, selector, handler) {
			this._each(function(el) {
				self.removeEvent(el, type, selector, handler);
			});
			return this;
		},

		/**	Fire an event on the selection.
		 *	@param {String} type		An event type
		 *	@param {Object|Event} e		The event data
		 *	@returns {this}
		 */
		trigger : function(type, e) {
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
					frag = document.createDocumentFragment();
					this._each(function(node) {
						frag.appendChild(node);
					}, null, true);
					what.appendChild(frag);
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
					r = self.selectorEngine.query(selector, options);
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
			if (start && typeof start!=='number' && start.start) {
				end = start.end;
				start = start.start;
			}
			if (typeof start==='number') {
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
					value = typeof el.value==='string' ? el.value : el.innerHTML;
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

			getFilters = function(filters, htmlEntities) {
				for (var i=filters.length; i--; ) {
					if (filters[i]==='htmlEntities') {
						filters.splice(i, 1);
					}
				}
				return filters;
			};

			this.query('['+attrName+']').each(function(node) {
				var nodeName = node.nodeName(),
					tpl = node.attr(attrName),
					key, tplField, tplValue, tplFilters, nType, keyMatches;

				tpl = ~tpl.indexOf(':') ? priv.parseCSS(tpl, false) : { 'set':tpl };

				for (key in tpl) {
					if (tpl.hasOwnProperty(key)) {

						tplField = tpl[key].split('|');
						tplFilters = getFilters(tplField.slice(1));
						tplField = tplField[0];

						tplValue = puredom.delve(templateFields, tplField);

						if (tplValue!==null && tplValue!==undefined) {
							if ((tplValue instanceof Date || tplValue.constructor.name==='Date') && tplValue.toLocaleString) {
								tplValue = tplValue.toLocaleString();
							}
							if (tplFilters && tplFilters.length) {
								tplValue = self.text.filter(tplValue, tplFilters.join('|'));
							}

							keyMatches = key.match(/^([a-z]+)\-(.+)$/i);

							if (keyMatches && typeof node[keyMatches[1]]==='function') {
								node[keyMatches[1]](keyMatches[2], tplValue);
							}
							else if (typeof node[key]==='function') {
								node[key](tplValue);
							}
							else if ( (nType = node.attr('data-tpl-prop')) ) {
								node.prop(nType, tplValue);
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
										node.attr('src', tplValue);
										break;

									default:
										//node.html(self.text.htmlEntities(tplValue));
										node.text(tplValue);
										break;
								}
							}
						}
					}
				}
			});
			templateFields = null;
			return this;
		}
	});

	/**	Alias of {@link puredom.NodeSelection#trigger}
	 *	@function
	 */
	self.NodeSelection.prototype.fireEvent = self.NodeSelection.prototype.trigger;

	/**	Alias of {@link puredom.NodeSelection#trigger}
	 *	@function
	 */
	self.NodeSelection.prototype.emit = self.NodeSelection.prototype.trigger;

	/**	Alias of {@link puredom.NodeSelection#on}
	 *	@function
	 */
	self.NodeSelection.prototype.addEvent = self.NodeSelection.prototype.on;

	/**	Alias of {@link puredom.NodeSelection#off}
	 *	@function
	 */
	self.NodeSelection.prototype.removeEvent = self.NodeSelection.prototype.off;

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
		self.selectorEngine.clearCache();
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
					results = self.selectorEngine.query(query, arguments[1]);
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


	// Events
	function cancelEvent(e) {
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
		} catch(err) {}
	}

	/**	@class Represents a DOM event.
	 *	@name puredom.DOMEvent
	 */
	self.DOMEvent = function DOMEvent(type) {
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
					self.removeEvent(priv.idToNode(evt.target), evt.type, evt.selector, evt.wrappedHandler);
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
					self.removeEvent(obj, evt.type, evt.selector, evt.wrappedHandler);
					window.killCount = (window.killCount || 0) + 1;
				}
			}
		},

		/**	@private */
		get : function(type, handler, obj, selector, andDestroy) {
			var i, evt;
			selector = selector || null;
			obj = priv.nodeToId(obj);
			for (i=this.list.length; i--; ) {
				evt = this.list[i];
				if (evt.target===obj && evt.handler===handler && evt.selector===selector && evt.type===type) {
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
		create : function(type, handler, obj, selector) {
			selector = selector || null;
			var evt = {
				type	: type,
				target	: priv.nodeToId(obj),
				selector : selector,
				handler	: handler,
				/**	@ignore */
				wrappedHandler : function wrappedHandler(e) {
					var handler = wrappedHandler.handler,
						type = (wrappedHandler.type || e.type).toLowerCase().replace(/^on/,''),
						originalTarget = this!==window ? this : (priv && priv.idToNode(wrappedHandler.target)),
						fireTarget, event, i,
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

					// allow filtering by CSS selector
					var sel = wrappedHandler.selector,
						selEls, isInSelector;
					if (sel && typeof sel==='string') {
						selEls = self.selectorEngine.query(sel, {
							within : originalTarget
						});
					}

					// is the capturing node within the original handler context?
					d.searchNode = !selEls && event.relatedTarget || event.target;
					do {
						if (selEls) {
							if (selEls.indexOf(d.searchNode) !== -1 ) {
								isInSelector = true;
								fireTarget = d.searchNode;
								break;
							}
							continue;
						}
						if (d.searchNode===originalTarget) {
							d.isInSelf = true;
							break;
						}
					} while(d.searchNode && (d.searchNode=d.searchNode.parentNode) && d.searchNode!==document);

					if (selEls && !isInSelector) {
						return;
					}

					// Don't fire mouseout events when the mouse is moving in/out a child node of the handler context element
					if ((type!=='mouseover' && type!=='mouseout') || !d.isInSelf) {
						if (handler && handler.call) {
							event.currentTarget = fireTarget || originalTarget;
							d.handlerResponse = handler.call(fireTarget || originalTarget, event);
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
							cancelEvent(e);
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
			evt.wrappedHandler.selector = selector;
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
	 *	@param {String} [selector]			Optionally call handler only if the target matches a CSS selector.
	 *	@param {Function} handler			The listener function to register. Gets passed <code>({Event} event)</code>.
	 */
	self.addEvent = function(obj, type, selector, fn) {
		var x, origType;
		if (typeof selector==='function') {
			fn = selector;
			selector = null;
		}
		if (obj) {
			if (self.typeOf(type)==='string' && type.indexOf(',')>-1) {
				type = type.replace(/\s/gm,'').split(',');
			}
			if (self.isArray(type)) {
				for (x=0; x<type.length; x++) {
					self.addEvent(obj, type[x], selector, fn);
				}
				return true;
			}
			origType = type = (type+'').toLowerCase().replace(/^\s*(on)?(.*?)\s*$/gim,'$2');

			if (typeof type!=='string' || !fn || !fn.call) {
				self.log('Attempted to add event with invalid type or handler:', {
					type : type,
					handler : fn+'',
					subject : priv.getSubjectDescription(obj)
				});
				return;
			}

			if (self.eventTypeMap.hasOwnProperty(type)) {
				type = self.eventTypeMap[type];
			}

			fn = priv.wrappedEventListener.create(origType, fn, obj, selector);
			if (obj.attachEvent) {
				obj.attachEvent('on' + type, fn);
			}
			else if (obj.addEventListener) {
				obj.addEventListener(type, fn, false);
				self._eventCount = (self._eventCount || 0) + 1;
			}
		}
	};


	/**	Remove an event listener from a DOM node.
	 *	@private
	 *	@param {Element} obj				An element to remove the event listener from.
	 *	@param {String} type				The event type of the listener to be removed.
	 *	@param {String} [selector]			Optionally call handler only if the target matches a CSS selector.
	 *	@param {Function} handler			The listener function to remove.
	 */
	self.removeEvent = function(obj, type, selector, fn) {
		var x, origType;
		if (typeof selector==='function') {
			fn = selector;
			selector = null;
		}
		if (obj) {
			if (self.typeOf(type)==='string' && type.indexOf(',')>-1) {
				type = type.replace(/\s/gm,'').split(',');
			}
			if (self.isArray(type)) {
				for (x=0; x<type.length; x++) {
					self.removeEvent(obj, type[x], selector, fn);
				}
				return true;
			}
			origType = type = (type+'').toLowerCase().replace(/^\s*(on)?(.*?)\s*$/gim,'$2');

			if (typeof type!=='string' || !fn || !fn.call) {
				self.log('Attempted to remove event with invalid type or handler:', {
					type : type,
					handler : fn+'',
					subject : priv.getSubjectDescription(obj)
				});
				return;
			}

			if (self.eventTypeMap.hasOwnProperty(type)) {
				type = self.eventTypeMap[type];
			}

			fn = priv.wrappedEventListener.get(origType, fn, obj, selector, true);
			if (obj.detachEvent) {
				obj.detachEvent('on' + type, fn);
			}
			else if (obj.removeEventListener) {
				try {
					obj.removeEventListener(type, fn, false);
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
			node = self.selectorEngine.query(listed);
			if (!(/\s_td_autoid_[0-9]+\s/gm).exec(' ' + node.className + ' ')) {
				node = null;
			}
		}
		if (!node) {
			search = self.selectorEngine.query('._td_autoid_'+id);
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
	 *	@name puredom.animationFrame
	 *	@public
	 */
	self.animationFrame = (function() {
		/** @ignore */
		var self = /** @lends puredom.animationFrame */ {
				nativeSupport : true,
				manualFramerate : 11
			},
			perf = window.performance,
			prefix;

		if (window.requestAnimationFrame) {
			prefix = '';
		}
		else if (window.mozRequestAnimationFrame) {
			prefix = 'moz';
		}
		else if (window.webkitRequestAnimationFrame) {
			prefix = 'webkit';
		}
		else {
			self.nativeSupport = false;
		}

		/** @ignore */
		function now() {
			if (perf && perf.now) {
				return perf.now();
			}
			return Date.now();
		}

		if (self.nativeSupport) {

			/**	Defer execution of an animation function so it occurs during the next rendering cycle.
			 *	@param {Function} f		A function to call during the next animation frame.
			 *	@name puredom.animationFrame.getTimer
			 *	@function
			 */
			self.getTimer = function(f) {
				return window[ (prefix ? (prefix+'R') : 'r') + 'equestAnimationFrame'](f);
			};

			/**	Unregister a deferred animation function.
			 *	@param {String} identifier		A timer identifier, such as one obtained from {@link puredom.animationFrame.getTimer}.
			 *	@name puredom.animationFrame.cancelTimer
			 *	@function
			 */
			self.cancelTimer = function(t) {
				window[ (prefix ? (prefix+'C') : 'c') + 'ancelRequestAnimationFrame'](t);
			};

			/**	Get the start time (timestamp, in milliseconds) of the current animation.
			 *	@param {String} identifier		A timer identifier, such as one obtained from {@link puredom.animationFrame.getTimer}.
			 *	@name puredom.animationFrame.getStartTime
			 *	@function
			 */
			self.getStartTime = function(t) {
				return window[ (prefix ? (prefix+'A') : 'a') + 'nimationStartTime'] || now();
			};

		}
		else {

			/**	@ignore */
			self.getTimer = function(f) {
				return setTimeout(function() {
					f( now() );
					f = null;
				}, self.manualFramerate);
			};

			/**	@ignore */
			self.cancelTimer = function(t) {
				clearTimeout(t);
			};

			/**	@ignore */
			self.getStartTime = function(t) {
				return now();
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
		if (typeof value==='string') {
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
				cx = self.getStyleAsCSS(x);
				cx = cx.replace(/^\-(moz|webkit|ms|o|vendor)\-/gim, vendorCssPrefix+'-');
				cx = self.getStyleAsProperty(cx);
				cx = getPrefixedCssProperty(cx);
				if (!priv.support.filters) {
					el.style[cx] = properties[x];
				}
				else {
					if (cx==='opacity') {
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
					else if (cx==='--box-shadow') {
						d = properties[x].match(/\b(\#[0-9af]{3}[0-9af]{3}?|rgba?\([0-9\,\s]+\))\b/gim);
						d = d && d[0] || '';
						p = (' '+properties[x]+' ').replace(d,'').replace(/\s+/m,' ').split(' ').slice(1,4);
						self.applyMsFilter(el, 'glow', {
							Color : d,
							Strength : Math.round(p[3].replace(/[^0-9\-\.]/gim,''))
						});
					}
				}
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

	/**	Parse a CSS String and return an Object representation, converting `-css-keys` to `jsKeys`.
	 *	@param {String} css
	 *	@param {Boolean} [camelKeys=true]	If `false`, keys will be left untouched.
	 *	@private
	 */
	priv.parseCSS = function(css, camelKeys) {
		var tokenizer = /\s*([a-z\-]+)\s*:\s*([^;]*?)\s*(?:;|$)/gi,
			obj, token, key;
		if (css) {
			obj = {};
			tokenizer.lastIndex = 0;
			while ((token=tokenizer.exec(css))) {
				key = token[1];
				if (camelKeys!==false) {
					key = self.getStyleAsProperty(key);
				}
				obj[key] = token[2];
			}
		}
		return obj;
	};

	self._parseCss = priv.parseCSS;

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
	self.addClass = function(el, classes, remove) {
		var modified = false,
			list, index, i;
		if (classes) {
			if (classes.length===1) {
				classes = classes[0].split(' ');
			}
			else if (!self.isArray(classes)) {
				classes = classes.split(' ');
			}
			if (el.classList) {
				el.classList[remove ? 'remove' : 'add'].apply(el.classList, classes);
				return;
			}

			list = (el.className || '').split(/\s+/);
			for (i=0; i<classes.length; i++) {
				index = list.indexOf(classes[i]);
				if (remove!==true && index===-1) {
					modified = true;
					list.push( classes[i] );
				}
				else if (remove===true && index>-1) {
					modified = true;
					list.splice(index, 1);
				}
			}
			if (modified) {
				el.className = list.join(' ');
			}
		}
	};

	/** @private */
	self.removeClass = function(el, classes) {
		return self.addClass(el, classes, true);
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
		var c = global.console;
		if (c && c.log) {
			c.log.apply(c, arguments);
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

	this.puredom = global.puredom = self;

	if (typeof define==='function' && define.amd) {
		define('puredom', function(){ return self; });
	}
	if (typeof module==='object') {
		module.exports = self;
	}
}(this, typeof global==='object' ? global : this));

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
				path = typeof path==='string' ? path : '';
				if (days) {
					date = new Date();
					date.setTime(date.getTime() + days*24*60*60*1000);
					expires = "; expires="+date.toGMTString();
				}
				if(cache.hasOwnProperty(key) && cache[key].expires) {
					expires = "; expires="+cache[key].expires.toGMTString();
				}
				cookie = key + "=" + encodeURIComponent(value) + expires + "; path=/"+path.replace(/^\//,'');
				if (typeof domain==='string' && domain.length>0) {
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
			if (typeof what==='string' && what.length>0) {
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
			args = Array.prototype.slice.call(arguments, 1);
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
		},

		/**	Deprecated alternative version of {@link puredom.EventEmitter#emit emit()} that
		 *	accepts an Array of event parameters as the second argument.
		 *	@function
		 *	@private
		 *	@deprecated
		 */
		fireEvent : function(type, args) {
			return this.emit.apply(this, ([type]).concat(args));
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
		trigger : 'emit'

	}, function(alias, key) {
		proto[key] = proto[alias];
	});

}(puredom));

/**	Manages controllers, providing a means for separating functionality into feature-centric modules.
 *	@constructor Creates a new ControllerManager instance.
 *	@param {Object} [options]		Hash of options to be given to the instance.
 */
puredom.ControllerManager = function(options) {
	puredom.EventEmitter.call(this);
	
	this.controllerOptions = puredom.extend({}, this.controllerOptions);
	this._messageListeners = [];
	this._controllers = [];
	this._current = null;
	
	if (options) {
		if (options.controllerOptions) {
			puredom.extend(this.controllerOptions, options.controllerOptions);
		}
		if (puredom.typeOf(options.singular)==='boolean') {
			this.singular = options.singular;
		}
		if (puredom.typeOf(options.allowLoadDefault)==='boolean') {
			this.allowLoadDefault = options.allowLoadDefault;
		}
	}
};

puredom.extend(puredom.ControllerManager.prototype, /** @lends puredom.ControllerManager#*/ {

	/** Options to pass to every controller. */
	controllerOptions : {},

	
	restoreState : function(state) {
		if (this.initialized!==true) {
			this._initState = state;
		}
		else {
			if (state && state.current) {
				this.load(state.current);
			}
			else {
				this.loadDefault();
			}
		}
	},

	
	doStateUpdate : function(state, options) {
		if (this.updateState) {
			this.updateState(state, options);
		}
	},

	
	/**	Initialize the registry. */
	init : function(options) {
		var autoRestore = true;
		if (this.initialized!==true) {
			this.initialized = true;
			if (options) {
				if (options.controllerOptions) {
					puredom.extend(this.controllerOptions, options.controllerOptions);
				}
				if (puredom.typeOf(options.singular)==='boolean') {
					this.singular = options.singular;
				}
				if (puredom.typeOf(options.allowLoadDefault)==='boolean') {
					this.allowLoadDefault = options.allowLoadDefault;
				}
				if (options.autoRestoreOnInit===false) {
					autoRestore = false;
				}
			}
			if (this._initState && autoRestore) {
				this.restoreState(this._initState);
			}
			this._initState = null;
			try {
				delete this._initState;
			}catch(err){}
			if (this.allowLoadDefault!==false && !this.current()) {
				this.loadDefault();
			}
		}
	},

	
	/**	Destroy the registry. */
	destroy : function() {
		var current, x;
		// supress errors for destructors to avoid chained memory leaks
		try {
			current = this.current();
			if (current) {
				if (current.unload) {
					current.unload();
				}
			}
			for (x=this._controllers.length; x--; ) {
				if (this._controllers[x].destroy) {
					this._controllers[x].destroy();
				}
			}
		}catch(err){}
		this.controllerOptions = {};
		this._controllers = [];
		this._messageListeners = [];
		this._current = null;
	},

	
	/**	Register a named module. */
	register : function(name, controller) {
		controller = controller || {};
		if (puredom.typeOf(name)==='string') {
			controller.name = name;
		}
		else {
			controller = name;
		}
		this._controllers.push(controller);

		this.fireEvent('add', [this.getIdFromName(controller.name)]);
	},


	/**	Load the given named module. */
	load : function(name, options) {
		var sandboxController, previousController, params, newController, eventResponse, response, loadResponse, unloadResponse;
		
		name = (name+'').toLowerCase();
		previousController = this.singular===true && this.current();
		
		if (previousController && previousController.name.toLowerCase()===name) {
			if (previousController.handleRepeatLoad) {
				previousController.handleRepeatLoad(options || {});
			}
			return true;
		}
		
		sandboxController = this._createControllerSandbox(name);
		params = puredom.extend({
				previousController : previousController
			}, 
			this.controllerOptions || {}, 
			options || {},
			sandboxController.sandbox
		);
		newController = name && this.get(name);
		
		if (newController) {
			puredom.extend(newController, sandboxController.sandbox);
			if (this.singular===true) {
				unloadResponse = this._unloadCurrent();
				if (unloadResponse===false) {
					return false;
				}
			}
			response = newController;
			if (newController.load) {
				eventResponse = this.fireEvent('beforeload', [newController.name]);
				if (eventResponse===false || (eventResponse.falsey && !eventResponse.truthy)) {
					return false;
				}
				loadResponse = newController.load(params);
				if (loadResponse!==null && loadResponse!==undefined) {
					response = loadResponse;
				}
			}
			// if the new controller doens't load, go back to the old one
			if (loadResponse===false) {
				eventResponse = this.fireEvent('loadcancel', [newController.name]);
				if (eventResponse===false || (eventResponse.falsey && !eventResponse.truthy)) {
					return false;
				}
				if (this.singular===true && params.previousController) {
					this.load(params.previousController.name, options);
				}
				else {
					this.loadDefault(options);
				}
			}
			else {
				this._current = this.getIdFromName(name);
				this.fireEvent('load', [name]);
				this.fireEvent('change', [name]);
				this.doStateUpdate({
					current : name
				});
			}
			return response;
		}
		return false;
	},


	/**	Load the default module (the module with isDefault=true).
	 *	@returns {Boolean} defaultWasLoaded
	 */
	loadDefault : function(options) {
		for (var x=this._controllers.length; x--; ) {
			if (this._controllers[x].isDefault===true) {
				return this.load(this._controllers[x].name, options);
			}
		}
		return false;
	},


	/** Load the controller that was previously loaded. <br />
	 *	<strong>Note:</strong> This is not actual history, it only remembers one item.
	 */
	loadPrevious : function(options) {
		if (this._previousController) {
			this.load(this._previousController, options);
		}
	},
	

	/**	Unload the current controller if one exists. */
	none : function() {
		this._unloadCurrent();
	},


	/**	Reload the current controller if one exists. */
	reloadCurrent : function() {
		var current = this.current();
		
		if (current) {
			this._unloadCurrent();
			this.load(current.name, this.controllerOptions);
		}
	},


	/**	@private */
	_unloadCurrent : function() {
		var current = this.current(),
			time, ret;
		if (current && current.unload) {
			ret = this.fireEvent('beforeunload', [current.name]);
			if (ret===false || (ret.falsey && !ret.truthy)) {
				return false;
			}
			ret = current.unload();
			if (ret===false) {
				return false;
			}
			this.fireEvent('unload', [current.name]);
			this._current = null;
		}
	},
	

	/**	Get the definition for a given named controller.
	 *	@param {String} name					The controller name to find
	 *	@param {Boolean} [returnIndex=false]	If true, returns the index instead of a reference.
	 */
	get : function(name, returnIndex) {
		name = (name+'').toLowerCase();
		for (var x=this._controllers.length; x--; ) {
			if (this._controllers[x].name.toLowerCase()===name) {
				return returnIndex===true ? x : this._controllers[x];
			}
		}
		return false;
	},
	

	/**	Post a message to the current controller if it exists. */
	postMessage : function(type, msgObj) {
		var current = this.current();
		if (current && current.onmessage) {
			//this.fireEvent('postMessage', [type, msgObj]);
			current.onmessage(type, msgObj);
			return true;
		}
		return false;
	},


	/**	Handle a message from a controller.
	 *	@private
	 */
	onMessage : function(type, handler, controller) {
		var obj = {
			type : (type+'').toLowerCase().replace(/^on/gim,''),
			handler : handler
		};
		if (controller) {
			if (puredom.typeOf(controller)==='string') {
				obj.controller = controller.toLowerCase();
			}
			else if (controller.hasOwnProperty('name')) {
				obj.controller = (controller.name + '').toLowerCase();
			}
		}
		this._messageListeners.push(obj);
	},


	/** Get a list of registered controllers
	 *	@param {Array} [properties]		Other properties to include in the list from each controller.
	 *	@returns {Array} controllerList
	 */
	getList : function(properties) {
		var map = [],
			i, j, ob;
		properties = (properties || []);
		for (i=0; i<this._controllers.length; i++) {
			ob = {
				name : this._controllers[i].name
			};
			for (j=0; j<properties.length; j++) {
				ob[properties[j]] = this._controllers[i][properties[j]];
			}
			map.push(ob);
		}
		return map;
	},


	/**	Get a reference to the current controller if it exists. */
	current : function() {
		return puredom.typeOf(this._current)==='number' && this._controllers[this._current] || false;
	},
	

	/**	@private */
	getIdFromName : function(name) {
		return this.get(name, true);
	},


	/**	@private */
	getNameFromId : function(id) {
		var controller = puredom.typeOf(id)==='number' && this._controllers[id];
		return controller && controller.name || false;
	},


	/** @private */
	_createControllerSandbox : function(name) {
		var controllerManager = this,
			sandbox,
			sandboxController,
			muted = false,
			throwListenerControllerError;
		
		name = (name + '').toLowerCase();
		
		/** Throw an error from a listener without blocking other listeners */
		throwListenerControllerError = function(listener, error) {
			var customError = new Error(
				'Listener error encountered in ControllerManager#sandbox.postMessage() :: ' + error.message,
				error.fileName,
				error.lineNumber
			);
			setTimeout(function() {
				var e = customError;
				error = customError = listener = null;
				throw(e);
			}, 1);
		};
		
		/** A sandbox that can be safely passed to a controller */
		sandbox = {
			controllerManager : controllerManager,
			manager : controllerManager,
			postMessage : function(type, msgObj) {
				var listener, x;
				msgObj = puredom.extend({}, msgObj, {
					controller	: name,
					type		: (type + '').replace(/^on/gim,'')
				});
				if (!muted) {
					controllerManager.fireEvent('message', msgObj);
					controllerManager.fireEvent(msgObj.type, msgObj);
					for (x=0; x<controllerManager._messageListeners.length; x++) {
						listener = controllerManager._messageListeners[x];
						if (!listener.controller || listener.controller===name.toLowerCase()) {
							try {
								listener.handler(msgObj);
							} catch(err) {
								throwListnerError(listener, err);
							}
						}
					}
				}
			}
		};
		
		/** A privileged manager/controller for the sandbox */
		sandboxController = {
			setName : function(newName) {
				name = (newName + '').toLowerCase();
			},
			mute : function() {
				muted = true;
			},
			unmute : function() {
				muted = false;
			},
			destroy : function() {
				for (var x in this.sandbox) {
					if (this.sandbox.hasOwnProperty(x)) {
						this.sandbox[x] = null;
					}
				}
				delete this.sandbox;
				controllerManager = null;
			},
			sandbox : sandbox
		};
		
		/** cleanup pointless refs: */
		setTimeout(function() {
			sandboxController = sandbox = null;
		}, 1);
		
		return sandboxController;
	},


	/** @private */
	_postMessageFromController : function(type, msgObj) {
	},
	
	/** @private */
	_controllers : [],
	
	/** @private */
	_messageListeners : [],

	/** @private */
	_current : null
});


puredom.inherits(puredom.ControllerManager, puredom.EventEmitter);
















/*
switchControllerAsync : function(name, callback) {
	var self = this,
		params = {
			previousController : this.currentController(),
			parent : this.controllerParent
		},
		newController = name && this.getController(name),
		loadNewController;
	
	if (newController) {
		loadNewController = function() {
			newController.load(params);
			self._current = self.getControllerIdFromName(name);
			self = newController = params = loadNewController = null;
		};
		if (params.previousController && params.precontrollerController.unload) {
			params.previousController.unload(loadNewController);
		}
		else {
			loadNewController();
		}
		return true;
	}
	return false;
},
*/

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






/**	Handles populating and submitting HTML forms. 
 *	@constructor Creates a new FormHandler instance.
 *	@augments puredom.EventEmitter
 */
puredom.FormHandler = function(form, options) {
	var me = this;

	options = options || {};
	if (arguments.length===1 && typeof form==='object' && form.constructor!==puredom.NodeSelection) {
		options = form;
		form = options.form;
	}
	
	puredom.EventEmitter.call(this);
	
	this._customTypes = [].concat(this._customTypes);
	if (form) {
		this.setForm(form);
	}
	if (options.enhance===true) {
		this.enhance();
	}
	if (options.data) {
		this.setData(options.data);
	}
	if (options.onsubmit && typeof options.onsubmit==='function') {
		this.on('submit', options.onsubmit);
		this._constructorSubmitHandler = options.onsubmit;
	}
	if (options.oncancel && typeof options.oncancel==='function') {
		this.on('cancel', options.oncancel);
		this._constructorCancelHandler = options.oncancel;
	}
	if (options.submitButton && ('on' in options.submitButton)) {
		options.submitButton.on('click', this._defaultSubmitButtonHandler);
		this._constructorSubmitButton = options.submitButton;
	}
	
	if (options.cancelButton && options.cancelButton.on) {
		options.cancelButton.on('click', function(e){
			me.cancel();
			return puredom.cancelEvent(e);
		});
		this._constructorCancelButton = options.cancelButton;
	}
};


puredom.inherits(puredom.FormHandler, puredom.EventEmitter);


puredom.extend(puredom.FormHandler.prototype, /** @lends puredom.FormHandler# */ {
	
	errorMessageSelector : '.errorMessage, .generalForm_errorMessage',
	
	setForm : function(form) {
		var self = this;
		this.form = puredom.el(form);
		
		if (!this.action) {
			this.action = this.form.attr('action');
		}
		if (!this.method) {
			this.method = this.form.attr('method');
		}
		
		// <input type="submit" /> is required in order to fire submit on forms. Add a hidden one:
		puredom.el({
			type : 'input',
			attributes : {
				type : 'submit'
			},
			css : 'position:absolute; left:0; top:-999em; width:1px; height:1px; font-size:1px; visibility:hidden;'
		}, this.form);
		
		
		this.form.on('submit', function(e) {
			self.submit();
			return e.cancel();
		});
		
		this._kill = function() {
			self = null;
		};
		
		return this;
	},
	
	enhance : function() {
		var self = this,
			fields = this._getFields();
		if (fields) {
			fields.each(function(input) {
				var customType = self._getCustomType(input);
				if (customType && customType.enhance) {
					customType.enhance(input);
				}
			});
		}
		self = fields = null;
		return this;
	},
	
	disable : function() {
		this.disabled = true;
		this._getFields().disable();
		return this;
	},
	
	enable : function() {
		this.disabled = false;
		this._getFields().enable();
		return this;
	},
	
	destroy : function() {
		var self = this,
			fields = this._getFields();
		if (fields) {
			fields.each(function(input) {
				var customType = self._getCustomType(input);
				if (customType && customType.destroy) {
					customType.destroy(input);
				}
			});
		}
		if (this._constructorSubmitHandler) {
			this.removeEventListener('submit', this._constructorSubmitHandler);
		}
		if (this._constructorSubmitButton) {
			this._constructorSubmitButton.removeEvent('click', this._defaultSubmitButtonHandler);
		}
		if (this._constructorCancelHandler) {
			this.removeEventListener('cancel', this._constructorCancelHandler);
		}
		if (this._constructorCancelButton) {
			this._constructorCancelButton.removeEvent('click', this._constructorCancelHandler);
		}
		self = fields = null;
		return this;
	},
	
	clear : function() {
		this.setData({}, true);
		this.clearErrors();
		return this;
	},
	reset : function(){ return this.clear.apply(this,arguments); },
	
	submit : function() {
		var data, eventResponse;
		if (this.disabled===true) {
			puredom.log('Notice: Not submitting disabled form.');
			return this;
		}
		this.clearErrors(false);
		data = this.getData();
		this._hasErrors = false;
		if (data) {
			eventResponse = this.fireEvent('submit', [data]);
		}
		else {
			eventResponse = this.fireEvent('submitfailed', [data]);
		}
		if (!this._hasErrors && (!eventResponse || eventResponse.falsy!==true)) {
			this.clearErrors();
		}
		return this;
	},
	
	cancel: function() {
		if (this.disabled===true) {
			puredom.log('Notice: Not cancelling on disabled form.');
			return this;
		}
		
		this.clearErrors();
		this.fireEvent('cancel');
		
		return this;
	},
	
	clearErrors : function(clearMessage) {
		this._getFields().each(function(node) {
			node.parent().declassify('error');
		});
		if (clearMessage!==false) {
			this._hasErrors = false;
			this.form.query(this.errorMessageSelector).first().css({
				height : 0,
				opacity : 0
			}, {tween:'fast', callback:function(sel) {
				sel.hide();
			}});
		}
	},
	
	showFieldErrors : function(fields) {
		var self = this;
		
		this._hasErrors = true;
		
		// @TODO: multi-field errors and display error messages beside fields.
		
		puredom.forEach(fields, function(value, key) {
			var message;
			value = (value || 'Error') + '';
			value = value.replace(/\{fieldnames\.([^\}]+)\}/gim, function(s, n) {
				var id = n && self.form.query('[name="'+n+'"]').attr('id'),
					label = id && self.form.query('label[for="'+id+'"]');
				if (label && label.exists()) {
					return (label._nodes[0].textContent || label._nodes[0].innerText || label._nodes[0].innerHTML || '').replace(/\:\s*?$/g,'');
				}
				return n;
			});
			self.form.query('[name="'+key+'"]').focus().parent().classify('error');
			if (value.indexOf(' ')===-1) {
				value = puredom.i18n(value.toUpperCase());
			}
			message = self.form.query(self.errorMessageSelector).first();
			message.html('<div class="formHandlerErrorMessage">'+value+'</div>');
			message.css({
				height : Math.round(message.prop('offsetHeight')) || 0,
				opacity : 0
			}).show().css({
				height : message.children().first().height()+'px',
				opacity : 1
			}, {tween:'medium'});
			return false;
		});
		
		self = null;
	},
	
	getData : function() {
		var data = null,
			self = this,
			fields = this._getFields();
		if (fields) {
			data = {};
			fields.each(function(input) {
				var name = input.attr('name');
				if (name) {
					data[name] = self._getInputValue(input);
				}
			});
		}
		self = fields = null;
		return data;
	},
	
	setData : function(data, includeMissing) {
		var touched = [],
			self = this,
			fields = this._getFields();
		if (data && fields) {
			fields.each(function(input) {
				var name = input.attr('name');
				if (data.hasOwnProperty(name)) {
					touched.push(name);
					self._setInputValue(input, data[name]);
				}
				else if (includeMissing===true) {
					self._setInputValue(input, null);
				}
			});
		}
		self = fields = null;
		return this;
	},
	
	
	addCustomType : function(typeDefinition) {
		var self = this,
			fields = this._getFields();
		
		// actually add the type:
		this._customTypes.push(typeDefinition);
		
		// adding a type after initial enhance should still enhance matched fields:
		if (fields && typeDefinition.enhance) {
			fields.each(function(input) {
				var customType = self._getCustomType(input);
				if (customType===typeDefinition) {
					customType.enhance(input);
				}
			});
		}
		
		self = fields = null;
		return this;
	},
	
	
	/** @protected */
	_getFields : function() {
		var fields = null;
		if (this.form) {
			fields = this.form.query('input,textarea,select');		// {logging:true}
		}
		return fields;
	},
	
	/** @protected */
	_setInputValue : function(el, value) {
		var customType = this._getCustomType(el);
		if (value===undefined || value===null) {
			value = '';
		}
		if (customType && customType.setValue) {
			customType.setValue(el, value);
		}
		else {
			el.value(value);
		}
		return this;
	},
	
	/** @protected */
	_getInputValue : function(el) {
		var customType = this._getCustomType(el);
		if (customType && customType.getValue) {
			return customType.getValue(el);
		}
		else {
			return el.value();
		}
	},
	
	/** @protected */
	_getCustomType : function(el) {
		var x, type, nodeName, customType;
		if (el.attr('customtype')) {
			type = (el.attr('customtype')+'').toLowerCase();
		}
		else if (el.attr('type')) {
			type = (el.attr('type')+'').toLowerCase();
		}
		nodeName = (el.prop('nodeName')+'').toLowerCase();
		for (x=0; x<this._customTypes.length; x++) {
			customType = this._customTypes[x];
			//console.log('customType for', el, '<>', customType);
			if ( (customType.types && this._arrayIndexNC(customType.types,type)>-1)  ||
				(customType.type && (customType.type+'').toLowerCase()===type) ||
				(customType.nodeNames && this._arrayIndexNC(customType.nodeNames,nodeName)>-1) ||
				(customType.nodeName && (customType.nodeName+'').toLowerCase()===nodeName) ) {
				
				return customType;
			}
		}
		return false;
	},
	
	/** @protected */
	_arrayIndexNC : function(arr, val) {
		val = (val + '').toLowerCase();
		for (var x=0; x<arr.length; x++) {
			if ((arr[x]+'').toLowerCase()===val) {
				return x;
			}
		}
		return -1;
	},
	
	/** @private A DOM event handler that triggers the form to submit */
	_defaultSubmitButtonHandler : function(e) {
		var node = puredom.el(this);
		do {
			if (node.nodeName()==='form') {
				node.submit();
				break;
			}
		} while((node=node.parent()).exists() && node.nodeName()!=='body');
		return puredom.cancelEvent(e);
	},
	
	/** @protected */
	_customTypes : []
	
});


/** @static */
puredom.FormHandler.addCustomType = function(typeDefinition) {
	this.prototype._customTypes.push(typeDefinition);
};

/** Provides a managed notification/toast display area.
 *	@constructor Creates a new Notifier instance.
 *	@augments puredom.EventEmitter
 *	@param {Object} [options]	Hashmap of options
 *	@param {puredom.NodeSelection} [options.parent]		Construct the display area within a given element.
 */
puredom.Notifier = function(options) {
	var self = this;
	
	puredom.EventEmitter.call(this);
	this._data = {
		counter : 0,
		list : {}
	};
	
	this._notificationClickHandler = function(e) {
		self._performAction(puredom.el(this).attr('data-notification-id'), 'notificationclick', e);
		return puredom.cancelEvent(e);
	};
	
	options = options || {};
	if (options.parent) {
		this._createBase(options.parent);
	}
};


puredom.inherits(puredom.Notifier, puredom.EventEmitter);


puredom.extend(puredom.Notifier.prototype, /** @lends puredom.Notifier# */ {

	/**	Show a notification.
	 *	@param {Object} config	Describes what to display
	 *	@param {Object} [config.message]	The text to display
	 *	@param {Object} [config.icon]		Icon/image to show next to the text
	 *	@param {Object} [config.image]		Icon/image to show next to the text
	 *	@param {Object} [config.timeout=Notifier.timeout]	How many seconds to wait before auto-dismissing the notification
	 */
	show : function(config) {
		var notify;
		if (config) {
			this._data.counter += 1;
			notify = {
				id : this._data.counter + '',
				timeout : config.timeout || this.timeout
			};
			this._data.list[notify.id] = notify;
			
			notify.base = this._build(notify.id, config);
			this._show(notify.id);
			
			if (notify.timeout) {
				this._resetTimeout(notify.id);
			}
			return notify;
		}
		return false;
	},
	

	/**	@private */
	_createBase : function(parent) {
		if (this.notifications_base) {
			this.notifications_base.remove();
			this.notifications_base.appendTo(parent);
		}
		else {
			this.notifications_base = puredom.el({
				className : 'notifications_base'
			}, parent);
		}
	},
	

	/**	@private */
	_build : function(id, options) {
		var base, iconSrc;
		base = puredom.el({
			className : "notification",
			css : 'height:0; opacity:0;',
			attributes : {
				'data-notification-id' : id
			},
			children : [
				{ className:'notification_top' },
				{
					className : 'notification_inner',
					children : [
						{ className:'notification_inner_top' },
						{
							className : 'notification_closeButton',
							children : [
								{ className:'label', innerHTML:this.closeButtonLabel || '&times;' }
							]
						},
						{
							className : 'notification_message',
							children : [
								{ className:'label', innerHTML:options.message || options.text }
							]
						},
						{ className:'notification_inner_bottom' }
					]
				},
				{ className:'notification_bottom' }
			],
			onclick : this._notificationClickHandler
		}, this.notifications_base);
		
		// add an icon if specified
		iconSrc = options.icon || options.image;
		if (iconSrc!==false && this.defaultIcon) {
			iconSrc = this.defaultIcon;
		}
		if (iconSrc) {
			puredom.el({
				type : 'img',
				className : 'notification_message',
				attributes : {
					src : options.icon || options.image || this.defaultIcon
				}
			}, base.query('.notification_inner'));
		}
		
		if (options.userDismiss===false) {
			base.query('.notification_closeButton').hide(true);
		}
		
		return base;
	},
	

	/**	@private */
	_show : function(id) {
		var notify = this.get(id);
		if (notify) {
			notify.base.css({
				opacity : 0
			}).css({
				opacity : 1,
				height : notify.base.children().height()
			}, {tween:this.showTween || 'medium'});
		}
	},
	

	/**	@private*/
	_hide : function(id) {
		var notify = this.get(id);
		if (notify) {
			notify.base.css({
				opacity : 0,
				height : 0
			}, {tween:this.hideTween || 'medium', callback:function() {
				notify.base.remove();
				notify = null;
			}});
		}
	},
	

	/**	@private */
	_resetTimeout : function(id) {
		var notify = this.get(id),
			self = this;
		if (notify) {
			if (notify._hideTimer) {
				clearTimeout(notify._hideTimer);
			}
			if (notify.timeout) {
				notify._hideTimer = setTimeout(function() {
					self._hide(id);
					self = id = null;
				}, notify.timeout*1000);
			}
			notify = null;
		}
	},
	

	/** Get a notification by ID */
	get : function(id) {
		return id && this._data.list.hasOwnProperty(id+'') && this._data.list[id+''] || false;
	},
	

	/**	@private */
	_performAction : function(id, action, args) {
		var notify = this.get(id),
			ret;
		if (!puredom.isArray(args)) {
			args = [args];
		}
		if (action && notify) {
			args = [id].concat(args);
			ret = this.fireEvent(action, args);
			if (ret!==false) {
				switch (action.toLowerCase()) {
					case 'notificationclick':
					case 'notificationclicked':
						this._hide(id);
						break;
				}
			}
		}
	},
	

	/**	@private */
	timeout : 15,
	

	/**	@private */
	_data : {
		counter : 0,
		list : {}
	}
});
/**	Manages controllers, providing a means for separating functionality into feature-centric modules.
 *	@constructor Creates a new RouteManager instance.
 *	@augments puredom.ControllerManager
 *	@param {Object} [options]	Hashmap of options to be given to the instance.
 *	@param {Boolean} [options.allowTemplateFallback=false]		If no URL templates match, attempt to load by name.
 *	@param {Boolean} [options.useBest=false]					If no URL templates match, attempt to load by name.
 *	@param {Boolean} [options.allowPartialUrlFallback=false]	Use the longest URL template match, even if it isn't a perfect match.
 */
puredom.RouteManager = function(options) {
	var self = this;
	options = options || {};
	puredom.ControllerManager.call(this);
	
	this.allowTemplateFallback = options.allowTemplateFallback===true || options.useBest===true;
	this.allowPartialUrlFallback = options.allowPartialUrlFallback===true;
	
	/**	@ignore */
	this._controllerUpdateState = function(options) {
		self.doStateUpdate(self._routerState, options);
	};
};


puredom.inherits(puredom.RouteManager, puredom.ControllerManager);


puredom.extend(puredom.RouteManager.prototype, /** @lends puredom.RouteManager# */ {
	
	/** RouteManagers are singular by default, because a browser can only navigate to one URL at a time. */
	singular : true,
	

	/** @public */
	rewrites : [
		/*
		{
			inbound : {
				pattern : /^\/?urlToChange(?:\/(.*?))?$/gim,
				replace : '/final/url/$1'
			}
			//outbound	: //gim,
		}
		*/
	],
	

	/**	For use with StateManager */
	restoreState : function(state) {
		if (this.initialized!==true) {
			this._initState = state;
		}
		else {
			if (state && state.current_url) {
				this.route(state.current_url);
			}
			else {
				this.routeDefault();
			}
		}
	},
	

	/**	For use with StateManager */
	doStateUpdate : function(state, options) {
		var controller,
			templatedUrl;
		this._routerState = state && puredom.extend({}, state);
		if (state && state.current) {
			controller = this.get(state.current);
			delete state.current;
			templatedUrl = this._templateUrl(controller.customUrl || controller.urlTemplate || controller.name, controller);
			if (templatedUrl.substring(0,1)!=='/') {
				templatedUrl = '/' + templatedUrl;
			}
			state.current_url = templatedUrl;
		}
		this.updateState(state, options);
	},
	
	
	/** @override */
	register : function(name, controller) {
		controller.updateState = controller.updateRouterState = this._controllerUpdateState;
		return puredom.ControllerManager.prototype.register.call(this, name, controller);
	},
	
	
	/** Attempt to route the given URL to a controller. */
	route : function(url) {
		var list = this._controllers,
			normUrl = url.replace(/^[#!\/]+/gm,'').replace(/#.+$/gm,''),
			item, i, p, urlTemplate, matches, params,
			partialMatchName;
		
		for (i=0; i<list.length; i++) {
			item = list[i];
			urlTemplate = item.customUrl || item.urlTemplate || item.name;
			matches = {};
			if (this._checkUrlMatch(urlTemplate, url, matches)===true) {
				params = {};
				for (p in matches) {
					if ((p+'').substring(0,7)==='params.') {
						params[p.substring(7)] = matches[p];
					}
				}
				return this.load(item.name, {
					params : params
				});
			}
			else if (this.allowPartialUrlFallback===true && this._checkUrlMatch(urlTemplate, url, matches, {partial:true})===true) {
				partialMatchName = item.name;
			}
		}
		
		if (partialMatchName) {
			return this.load(partialMatchName, {
				params : {}
			});
		}
		
		if (this.allowTemplateFallback!==false && this.get(normUrl)) {
			return this.load(normUrl, {
				params : {}
			});
		}
		
		this.fireEvent('routingError', [{
			attemptedFallback : this.allowTemplateFallback!==false,
			url : url,
			type : 'RoutingError'
		}]);
		
		return false;
	},
	

	/** Load a controller */
	/*
	load : function(name, options) {
		this.__super.prototype.load.apply(this, arguments);
		this.doStateUpdate();
		return this;
	},
	*/
	

	/** Attempt to route the given URL to a controller. */
	routeDefault : function(url) {
		return this.loadDefault();
	},
	

	/** Template a URL using values from the current controller. Non-matched fields are left unchanged.
	 *	@private
	 *	@param {String} tpl						The URL template
	 *	@param {Object} [controller=current]	Explicit controller reference.
	 *	@returns {String} templatedUrl
	 */
	_templateUrl : function(tpl, controller) {
		controller = controller || this.current();
		return puredom.template(tpl, controller, false);
	},

	
	/** Check if a URL template matches the given URL.
	 *	@private
	 *	@param {String} urlTemplate		A URL template, as used in Controller.customUrl
	 *	@param {String} url				The URL to test
	 *	@param {Object} matches			Optional Object to populate with the matched URL segments
	 *	@returns {Boolean} didMatch
	 */
	_checkUrlMatch : function(urlTemplate, url, matches, options) {
		var templateSegments = this._getUrlSegments(urlTemplate),
			urlSegments = this._getUrlSegments(url),
			tplFieldReg = /^\{([^{}]+)\}$/gim,
			isMatch = true,
			i;
		options = options || {};
		matches = matches || {};
		if (options.partial===true) {
			for (i=templateSegments.length; i--; ) {
				if (templateSegments[i].match(tplFieldReg)) {
					templateSegments.splice(i, 1);
				}
			}
			//console.log(urlSegments, templateSegments);
		}
		if (urlSegments.length===templateSegments.length) {
			for (i=0; i<urlSegments.length; i++) {
				if (urlSegments[i]===templateSegments[i] || templateSegments[i].match(tplFieldReg)) {
					matches[templateSegments[i].replace(tplFieldReg,'$1')] = urlSegments[i];
				}
				else {
					isMatch = false;
					break;
				}
			}
		}
		else {
			isMatch = false;
		}
		return isMatch;
	},
	

	/**	Normalize a URL for comparison
	 *	@private
	 */
	_getUrlSegments : function(url) {
		var segs = (url+'').split('/'),
			i;
		for (i=segs.length; i--; ) {
			if (segs[i].replace(/(\s|\/)/gm,'').length===0) {
				segs.splice(i, 1);
			}
		}
		return segs;
	}
	
});
/**	Generic namespaced state persistence with adapters for URL/history and Cookies.
 *	@constructor Creates a new StateManager instance.
 *	@param {String} [adapter=defaultAdapter]	Which persistence adapter to use
 *	@param {Object} options						Hashmap of options.
 *	@param {String} [options.adapter=defaultAdapter]	Which persistence adapter to use
 *	@param {String} [options.adapterOptions]			Configuration to pass to the adapter
 *	@param {String} [options.state]						Manually specify initial state
 *	@param {String} [options.objects]					Register a key-value list of objects using {@link puredom.StateManager#addObject}
 */
puredom.StateManager = function(adapter, options) {
	var x;
	if (!options && puredom.typeOf(adapter)==='object') {
		options = adapter;
		adapter = options.adapter || options.adaptor;
	}
	options = options || {};
	if (options.adaptor) {
		options.adapter = options.adaptor;
		options.adapter = null;
	}
	adapter = adapter || options.adapter;
	
	this.initialized = false;
	this.objects = {};
	this.states = {};
	
	if (!adapter || !this.adapters[adapter]) {
		adapter = this.defaultAdapter;
	}
	this.adapter = puredom.extend({}, this.adapters.none, this.adapters[adapter], {
		stateManager : this
	});
	if (this.adapter.init) {
		this.adapter.init(puredom.extend({}, options.adapterOptions || options.adaptorOptions || {}, {
			adapter : adapter
		}), this);
	}
	
	if (options.state) {
		this.adapter.setState(options.state);
		this.restoreFromState(options.state);
	}
	
	if (options.objects) {
		for (x in options.objects) {
			this.addObject(x, options.objects[x]);
		}
	}
};


puredom.extend(puredom.StateManager.prototype, /** @lends puredom.StateManager# */ {
	
	/** A time to wait (in milliseconds) before committing state updates. Can be overridden 
	 *	on a per-save basis by passing true as a second parameter to puredom#StateManager.save()
	 */
	saveQueueDelay : 50,
	

	/** If two save() calls occur within the specified number of milliseconds, overwrite the first
	 *	@private
	 */
	replaceTimeout : 0,
	

	/** List of available Adapters, keyed by ID. */
	adapters : /** @lends puredom.StateManager#adapters */ {

		/**	In-memory persistence adapter. */
		session : {
			getState : function(callback){
				callback(this.state);
			},
			setState : function(state, callback){
				this.state = state;
				callback(true);
			},
			state : {}
		},

		/**	Fallback abstract persistence adapter. */
		base : {
			getState : function(cb) {
				setTimeout(function() {
					throw(new Error("StateManager:: getState method not defined for the specified adapter."));
				}, 1);
				cb({});
			},
			setState : function(s,cb) {
				setTimeout(function() {
					throw(new Error("StateManager:: setState method not defined for the specified adapter."));
				}, 1);
				cb(true);
			}
		}

	},
	

	/**	Stores references to persisted instances.
	 *	@private
	 */
	objects : {},


	/**	@private */
	states : {},


	/**	@private */
	initialized : false,
	

	/**	Initialize the State Manager.
	 *	@param {Object} [options]				Hashmap of options
	 *	@param {String} [options.state]			Manually specify initial state
	 *	@param {String} [options.objects]		Register a key-value list of objects using {@link puredom.StateManager#addObject}
	 *	@param {String} [options.restore=true]	Immediately restore persisted state?
	 *	@returns {this}
	 */
	init : function(options) {
		if (this.initialized===true) {
			return this;
		}
		options = options || {};
		if (options.state) {
			this.adapter.setState(options.state);
			this.restoreFromState(options.state);
		}
		if (options.objects) {
			for (var x in options.objects) {
				this.addObject(x, options.objects[x]);
			}
		}
		this.initialized = true;
		if (options.restore!==false) {
			this.restore();
		}
		
		this.startPolling();
		
		return this;
	},
	

	/**	Dismantle and cleanup the instance. */
	destroy : function() {
		this.stopPolling();
		
		this.adapter.stateManager = null;
		this.adapter = this.states = this.objects = null;
		this.initialized = false;
	},
	

	/**	@private */
	startPolling : function() {
		if (this.adapter && this.adapter.startPolling) {
			this.adapter.startPolling();
		}
	},
	

	/**	@private */
	stopPolling : function() {
		if (this.adapter && this.adapter.stopPolling) {
			this.adapter.stopPolling();
		}
	},
	

	/**	Register an object for state persistence. <br />
	 *	<strong>Note:</strong> If stored state is already available for the specified <code>id</code>, it will be applied immediately.
	 *	@param {String} id				A meaningful identifier for the object
	 *	@param {Object} obj				The object to persist
	 *	@param {Function} [callback]	Called once the object's state has been restored
	 *	@returns {this}
	 */
	addObject : function(id, obj, callback) {
		var stateManager;
		if (this.objects.hasOwnProperty(id)) {
			setTimeout(function() {
				throw(new Error("Cannot add duplicate object ID '"+id+"' to state list."));
			}, 1);
			if (callback) {
				callback(false);
			}
		}
		else {
			stateManager = this;
			this.objects[id] = obj;
			this.states[id] = {};
			
			obj.updateState = function(stateUpdates, callback, now) {
				stateManager.setObjState(id, puredom.extend(
					{},
					stateManager.getObjState(id),
					stateUpdates
				), callback || stateManager.emptyFunc, now);
			};
			
			obj.setState = function(state, callback, now) {
				stateManager.setObjState(id, state, callback || stateManager.emptyFunc, now);
			};
			
			obj.getState = function() {
				return stateManager.getObjState(id);
			};
			
			obj.destroyStateManagerConnections = function() {
				this.updateState = this.setState = this.getState = this.destroyStateManagerConnections = stateManager.emptyFunc;
				stateManager = null;
				/*
				// much too harsh!
				delete this.updateState;
				delete this.setState;
				delete this.getState;
				delete this.destroyStateManagerConnections;
				*/
			};
			
			obj = null;
			
			// if the class is already initialized, we need to give an object its existing stored state back.
			if (this.initialized===true) {
				this.restoreOne(id, function() {
					//this.save(callback);
				});
			}
		}
		return this;
	},


	/**	@private */
	addObj : function() {
		return this.addObject.apply(this,arguments);
	},
	

	/**	Stop persisting state for the object given by <code>id</code>.
	 *	@param {String} id				The object id to remove from persistence
	 *	@param {Function} [callback]	Called once the removal is committed to the persistence layer
	 *	@returns {this}
	 */
	removeObject : function(id, callback) {
		if (this.objects.hasOwnProperty(id)) {
			if (this.objects[id].destroyStateManagerConnections) {
				this.objects[id].destroyStateManagerConnections();
			}
			this.objects[id] = null;
			this.states[id] = null;
			try {
				delete this.objects[id];
				delete this.states[id];
			}catch(err){}
			this.save(callback);
		}
		return this;
	},


	/**	@private */
	removeObj : function() {
		return this.removeObject.apply(this,arguments);
	},
	

	/**	@private
	 *	@returns {this}
	 */
	restoreFromState : function(state, callback, andSave) {
		var self=this, cb, id, total=0, count=0;
		if (callback) {
			cb = function() {
				count += 1;
				if (count>=total) {
					if (andSave!==false) {
						self.save(function(state) {
							if (callback) {
								callback(true);
							}
							self = callback = null;
						});
					}
					else {
						if (callback) {
							callback(true);
						}
						self = callback = null;
					}
				}
			};
		}
		else {
			cb = function(){};
		}
		if (puredom.typeOf(state)==='string') {
			state = puredom.json(state);
		}
		for (id in this.objects) {
			if (this.objects[id].restoreState) {
				total += 1;
				this.objects[id].restoreState(state[id]);
				cb();
			}
		}
		if (total===0) {
			if (callback) {
				callback(false);
			}
			self = callback = null;
		}
		return this;
	},
	
	
	/**	@private */
	disableSave : function() {
		this._saveDisabled = true;
	},


	/**	@private */
	enableSave : function() {
		this._saveDisabled = false;
	},
	
	
	/**	@private */
	restoreOne : function(id, callback) {
		var self = this;
		this.adapter.getState(function(state) {
			if (self.objects[id] && self.objects[id].restoreState) {
				self.objects[id].restoreState(state[id]);
			}
			self = null;
			if (callback) {
				callback();
			}
		});
	},
	

	/**	Restore state based on persisted values.
	 *	@param {Function} [callback]	Called once state is restored.
	 *	@returns {this}
	 */
	restore : function(callback) {
		var self = this;
		this._restoring = true;
		this.adapter.getState(function(state) {
			var newCurrentState = state && puredom.json(state);
			self._lastSaveTime = new Date().getTime();
			if (newCurrentState && newCurrentState!==self.currentState) {
				self.currentState = newCurrentState;
				self.restoreFromState(state, function() {
					self._restoring = false;
					if (callback) {
						callback();
					}
					self = null;
				}, false);
			}
			else {
				self.save(function() {
					self._restoring = false;
					self = null;
					if (callback) {
						callback(false);
					}
					callback = null;
				});
			}
		});
		return this;
	},
	

	/**	Save object state to the persistence layer.
	 *	@param {Function} callback		Called once the data is saved
	 *	@param {Boolean} [now=false]	By default, saves are buffered. Pass <code>true</code> to commit the save operation immediately.
	 *	@param {Object} [options]		Hashmap of save options
	 *	@param {Object} [options.replace=false]		By default, a new history entry is created for each unique save(). Passing <code>true</code> updates the current history entry in-place. This only affects adapters with history, such as the URL adapter.
	 *	@returns {this}
	 */
	save : function(callback, now, options) {
		var self = this;
		options = options || {};
		
		if (this.initialized===true && !this._saveDisabled) {		// NOTE: Disabled check only on sync saves?
			if (now===true) {										// --> && !this._saveDisabled
				if (this.currentSaveTimer) {
					clearTimeout(this.currentSaveTimer);
					delete this.currentSaveTimer;
				}
				this.getStateObj(function(state) {
					var newCurrentState = puredom.json(state),
						saveTime = new Date().getTime(),
						timeSinceLastSave = saveTime - (self._lastSaveTime || saveTime);
					self._lastSaveTime = saveTime;
					if (newCurrentState!==self.currentState) {
						self.currentState = newCurrentState;
						self.adapter.setState(state, function(success) {
							if (callback && puredom.typeOf(callback)==='function') {
								callback(!!success);
							}
							self = callback = options = null;
						}, {
							replace : options.replace===true || (self.replaceTimeout && timeSinceLastSave!==0 && timeSinceLastSave<self.replaceTimeout)
						});
					}
					else if (callback && puredom.typeOf(callback)==='function') {
						callback();
						self = callback = options = null;
					}
				});
			}
			else if (!this.currentSaveTimer) {
				this.currentSaveTimer = setTimeout(function() {
					self.save(callback, true, options);
					delete self.currentSaveTimer;
					self = callback = options = null;
				}, this.saveQueueDelay);
			}
		}
		return this;
	},
	

	/**	Overwrite state information for the given object ID.
	 *	@param {String} id				The object ID to update
	 *	@param {Object} state			Arbitrary state information
	 *	@param {Function} [callback]	Called once the data is committed to the persistence layer
	 *	@param {Boolean} [now=false]	Saves are buffered by default. Pass <code>true</code> to commit immediately.
	 */
	setObjState : function(id, state, callback, now) {
		var options;
		if (callback && typeof callback==='object') {
			options = callback;
		}
		this.states[id] = state;
		this.save(callback, options && options.now===true || callback===true, options);
	},
	

	/**	Looks like a mistake.
	 *	@private
	 */
	getObjState : function(id, state) {
		this.states[id] = state;
	},
	

	/**	@private */
	getStateObj : function(callback) {
		if (callback) {
			callback(this.states);
		}
		return this;
	},
	

	/**	@private */
	emptyFunc : function(){}
	
});



/**	URL persistence implemented via HTML5's history (pushState) API, with a #! fallback.
 *	@name puredom.StateManager#adapters.url
 */
puredom.StateManager.prototype.adapters.url = {
	init : function(options) {
		var self = this,
			_doPoll = this._doPoll,
			_doPollTimed = this._doPollTimed;
		this._doPoll = function() {
			return _doPoll.apply(self,arguments);
		};
		this._doPollTimed = function() {
			return _doPollTimed.apply(self,arguments);
		};
		
		this.usePreceedingSlash = options.usePreceedingSlash!==false;
		this.urlMapping = options.urlMapping;
		this.urlHistory = [];
		if (options.html5UrlPrefix) {
			this.html5UrlPrefix = options.html5UrlPrefix;
		}
		if (options.beforeParse) {
			this.beforeParse = options.beforeParse;
		}
		if (options.beforeCommit) {
			this.beforeCommit = options.beforeCommit;
		}
	},
	
	getPrefix : function() {
		if (this.html5UrlPrefix) {
			if (typeof this.html5UrlPrefix==='function') {
				return this.html5UrlPrefix();
			}
			else {
				return this.html5UrlPrefix;
			}
		}
		return '';
	},
	
	usePreceedingSlash : true,
	
	/** The default interval on which to poll for state changes (ie: back/forward in browser history) */
	pollInterval : 30,
	
	/** @private A history of state URLs */
	urlHistory : [],
	
	/** Start the location poller */
	startPolling : function() {
		if (!this.polling) {
			this.polling = true;
			this.getCurrentUrl(true);
			this.pollingTimer = setTimeout(this._doPollTimed, this.getPollInterval());
			puredom.addEvent(window, 'hashchange,pushstate,popstate', this._doPoll);
		}
	},
	
	/** Stop the location poller */
	stopPolling : function() {
		clearTimeout(this.pollingTimer);
		puredom.removeEvent(window, 'hashchange,pushstate,popstate', this._doPoll);
		this.polling = false;
	},
	
	getPollInterval : function() {
		return this.stateManager && (this.stateManager.pollInterval || this.stateManager.adapterPollInterval) || this.pollInterval;
	},
	
	/** @private Poll the location, this is a timer callback and requires explicit setting of context. */
	_doPoll : function() {
		var self = this,
			currentUrl = self.currentUrl || null,
			url = self.getCurrentUrl(true) || null;
		if (url!==currentUrl) {
			var startTime = new Date().getTime();
			self.stateManager.disableSave();
			self.stateManager.restore(function() {
				self.stateManager.enableSave();
				self = currentUrl = url = null;
			});
		}
	},
	_doPollTimed : function() {
		this._doPoll.apply(this,arguments);
		if (this.pollingTimer) {
			clearTimeout(this.pollingTimer);
		}
		if (this.polling) {
			this.pollingTimer = setTimeout(this._doPollTimed, this.getPollInterval());
		}
	},
	
	normalizeUrl : function(url) {
		return (this.usePreceedingSlash?'/':'') + url.replace(/^[#!\/]+/gm,'').replace(/#.+$/gm,'');
	},
	
	/** @private Get the relevant part of the page's current URL */
	getCurrentUrl : function(andSave) {
		var url = location.href + '',
			crunchbangIndex = url.indexOf('#!'),
			index = url.indexOf(location.host);
		/*
		// note: urlOverride gives apps a way to navigate to URLs without having to go through location.href, 
		// removing the need for manual save({replace:true}) calls for parameter guarding.
		if (this.stateManager._urlOverride) {
			url = this.stateManager._urlOverride.replace(/^([a-z]+\:\/\/[^\/]\/)?\/?(#!)?\/?/gim,'');
		}
		else */
		if (crunchbangIndex>-1) {
			url = url.substring(crunchbangIndex+2);
			if (window.history.replaceState) {
				window.history.replaceState(null, null, url);
			}
		}
		else if (index>-1) {
			url = url.substring(index+location.host.length);
		}
		else {
			url = null;
		}
		
		if (url || url==='') {
			url = this.normalizeUrl(url);
		}
		
		if (andSave===true) {
			if (url!==this.currentUrl && this.urlHistory[this.urlHistory.length-1]!==url) {
				this.urlHistory.push(url);
			}
			this.currentUrl = url;
		}
		return url || false;
	},
	
	setCurrentUrl : function(url, replace) {
		var currentUrl = this.getCurrentUrl(false),
			crunchedUrl,
			stateObj,
			prefix,
			isCurrentHistoryEntry;
		
		url = this.normalizeUrl(url);
		crunchedUrl = '#!' + url;
		isCurrentHistoryEntry = this.urlHistory.length>0 && this.urlHistory[this.urlHistory.length-1]===url;

		if (url!==currentUrl && !isCurrentHistoryEntry) {
			if (window.history.pushState) {
				// HTML5 History API
				if (url.substring(0,1)!=='/') {
					url = '/' + url;
				}
				prefix = this.getPrefix().replace(/\/$/,'');
				url = prefix + url;
				if (this.beforeCommit) {
					url = this.beforeCommit(url) || url;
				}

				if (replace===true && window.history.replaceState) {
					window.history.replaceState(null, null, url);
				}
				else {
					window.history.pushState(null, null, url);
				}
			}
			else {
				// Crunchbang history management
				if (window.location.href!==crunchedUrl) {
					if (replace===true && window.location.replace) {
						window.location.replace(crunchedUrl);
					}
					else {
						window.location.href = crunchedUrl;
					}
				}
			}
			
			// this adds the URL to our internal history:
			this.getCurrentUrl(true);
		}
	},
	
	/** Overwrites the given persisted state. Required by the StateManager adapter interface */
	setState : function(state, callback, options) {
		var url = location.href + '',
			index = url.indexOf('#!'),
			stateUrl,
			currentUrl = this.getCurrentUrl(false);
		options = options || {};
		stateUrl = this.stringify(state);
		
		this.setCurrentUrl(stateUrl, options.replace===true);
		
		callback(true);
	},
	
	/** Get the current persisted state. Required by the StateManager adapter interface */
	getState : function(callback) {
		var url = this.getCurrentUrl(true),
			state;
		if (url) {
			state = this.parse(url);
			callback(state);
		}
		else {
			callback(false);
		}
	},
	
	/** @private parse a URL and return a valid state Object. */
	parse : function(str) {
		var obj = {},
			a, prefix, parts, x, y, index, key, value, encodedValue, levelKey, level, mappedUrl, mappedUrlIndex,
			isArrayKey, autoConvertValue;
		
		isArrayKey = function(key) {
			return !!key.match(/^\-?[0-9]+$/);
		};
		
		/** auto-detects types by sniffing the content */
		autoConvertValue = function(value) {
			if (value==='undefined') {
				value = undefined;
			}
			else if (value==='null') {
				value = null;
			}
			else if (value.match(/^\-?[0-9]+$/)) {			// int
				value = parseInt(value,10);
			}
			else if (value.match(/^\-?[0-9\.]+$/)) {		// float
				value = parseFloat(value);
			}
			else if (value.match(/^(true|false)$/i)) {		// boolean
				value = value.toLowerCase()==='true';
			}
			else if (value.match(/^\[[a-z0-9%_\-]+(,[a-z0-9%_\-]+)*\]$/)) {
				value = value.substring(1, value.length-1).split(',');
				for (var x=0; x<value.length; x++) {
					value[x] = autoConvertValue(value[x]);
				}
			}
			return value;
		};
		
		if (this.beforeParse) {
			a = this.beforeParse(str);
			if (a || a==='') {
				str = a;
			}
		}
		
		prefix = this.getPrefix();
		// remove a preceeding slash if not disallowed:
		if (prefix && str.substring(0,prefix.length)===prefix) {
			str = str.substring(prefix.length);
		}
		if (this.usePreceedingSlash!==false && str.charAt(0)==='/') {
			str = str.substring(1);
		}
		
		// pick out the mappedUrl if it exists, and turn it back into the mapped parameter:
		mappedUrlIndex = str.indexOf('?');
		if (mappedUrlIndex===-1 && str.indexOf('=')===-1) {
			// this adds support for a parameter-less mappedUrl (ie: /app/#!preferences )
			mappedUrlIndex = str.length;
		}
		if (this.urlMapping && mappedUrlIndex>0) {
			mappedUrl = str.substring(0, mappedUrlIndex);
			str = encodeURIComponent(this.urlMapping) + '=' + encodeURIComponent(mappedUrl) + '&' + str.substring(mappedUrlIndex+1);
		}
		if (str.substring(0,1)==='?') {
			str = str.substring(1);
		}
		
		parts = str.split('&');
		for (x=0; x<parts.length; x++) {
			index = parts[x].indexOf('=');
			key = decodeURIComponent(parts[x].substring(0, index));
			encodedValue = decodeURIComponent(parts[x].substring(index+1));
			value = decodeURIComponent(encodedValue);
			
			// simple-arrays
			if (key.match(/\[\]$/g)) {
				key = key.substring(0, key.length-2);
				value = value.split(',');
				for (y=0; y<value.length; y++) {
					value[y] = decodeURIComponent(value[y]);
				}
			}
			else {
				// auto-detect types by sniffing the content:
				value = autoConvertValue(value);
			}
			
			// un-flatten the object into it's original nested equivalent:
			key = key.split('.');
			level = obj;
			for (y=0; y<key.length; y++) {
				levelKey = key[y];
				if (isArrayKey(levelKey)) {
					// this should work for whatever array-key format gets used, it just pulls out the integer.
					levelKey = parseInt(levelKey.replace(/[^0-9]/,''),10);
				}
				
				if (y<key.length-1) {
					// create the level if it doens't exist:
					if (!level[levelKey]) {
						// detect if an array is needed by looking at the inner assignments:
						if (isArrayKey(key[y+1])) {
							level[levelKey] = [];
						}
						else {
							level[levelKey] = {};
						}
					}
					
					// advance one level deeper:
					level = level[levelKey];
				}
				else {
					// assign the final value:
					level[levelKey] = value;
				}
			}
			
			// assign the final value:
			//level[key[key.length-1]] = value;
		}
		
		return obj;
	},
	
	/** @private Convert a state Object into it's serialized format for URL-based storage. */
	stringify : function(obj) {
		var str = '',
			p,
			serialize,
			mappedUrl = '',
			urlMapping = this.urlMapping;
		
		serialize = function(obj, id) {
			var p, isSimpleArray;
			switch (puredom.typeOf(obj)) {
				// objects get flattened into dot-separated keys
				case 'object':
					for (p in obj) {
						if (obj.hasOwnProperty(p)) {
							serialize(obj[p], (id?(id+'.'):'') + p);
						}
					}
					break;
				// arrays are treated almost identically to objects, but keys are done in square brackets (as a hint for the parser)
				case 'array':
					isSimpleArray = true;
					for (p=0; p<obj.length; p++) {
						t = puredom.typeOf(obj[p]);
						if (t!=='string' && t!=='number' && t!=='boolean') {
							isSimpleArray = false;
						}
					}
					if (isSimpleArray) {
						str += '&' + encodeURIComponent(id) + '[]=';
						for (p=0; p<obj.length; p++) {
							str += (p>0?',':'') + encodeURIComponent(obj[p]);
						}
						//str += '&' + encodeURIComponent(id) + '=' + encodeURIComponent('[' + obj.join(',') + ']');
					}
					else {
						for (p=0; p<obj.length; p++) {
							serialize(obj[p], (id?(id+'.'):'') + p);
							//serialize(obj[p], (id?(id+'.'):'') + '['+p+']');
						}
					}
					break;
				// do not include ill-formatted or missing values
				case 'null':
				case 'undefined':
				case 'function':
					break;
				default:
					if (urlMapping && id===urlMapping) {
						mappedUrl = obj;
					}
					else {
						str += '&' + encodeURIComponent(id) + '=' + encodeURIComponent(obj);
					}
			}
		};
		
		serialize(obj);
		serialize = obj = null;
		if (str.substring(0,1)==='&') {
			str = '?' + str.substring(1);
		}
		
		// add a preceeding slash if not disallowed:
		if (this.usePreceedingSlash!==false && mappedUrl.charAt(0)!=='/') {
			mappedUrl = '/' + mappedUrl;
		}
		
		return mappedUrl + str;
	}
};




/**	Ugly but simple JSON-in-URL-hash persistence.
 *	@name puredom.StateManager#adapters.urlbasic
 */
puredom.StateManager.prototype.adapters.urlbasic = {
	setState : function(state, callback, options) {
		var url = location.href + '',
			index = url.indexOf('#!');
		if (index>-1) {
			url = url.substring(0, index);
		}
		url += '#!' + this.serializeState(state);
		if (options && options.replace===true && typeof location.replace==='function') {
			location.replace(url);
		}
		else {
			location.href = url;
		}
		callback(true);
	},
	
	getState : function(callback) {
		var url = location.href + '',
			index = url.indexOf('#!'),
			state;
		if (index>-1) {
			url = url.substring(index+2);
			state = puredom.json.parse(url);
			callback(state);
		}
		else {
			callback(false);
		}
	},
	
	serializeState : function(state) {
		return puredom.json.stringify(state);
	}
};




puredom.StateManager.prototype.adapters.cookies = {
	init : function(options) {
		options = options || {};
		this.dbName = options.dbName || 'state';
	},
	
	setState : function(state, callback) {
		puredom.cookies.set(this.dbName, puredom.json.stringify(state));
		callback(true);
	},
	
	getState : function(callback) {
		var state = puredom.cookies.get(this.dbName);
		state = puredom.json.parse(state);
		callback(state);
	},
	
	serializeState : function(state) {
		return puredom.json.stringify(state);
	}
};
/**	Manages views, providing methods for loading, templating, caching and swapping.
 *	@constructor Creates a new ViewManager instance.
 *	@augments puredom.EventEmitter
 *	@param {Object} [options]		Hashmap of options to be given to the instance.
 *	@param {Object} [options.init=false]				Immediately calls init(options) for you
 *	@param {Object} [options.viewDomPrefix=views_]		Custom DOM cache ID prefix
 *	@param {Object} [options.cacheBase=document.body]	Move the DOM view cache
 */
puredom.ViewManager = function(options) {
	puredom.EventEmitter.call(this);
	this._htmlViews = {};
	this._postProcessors = [];
	if (options && options.init===true) {
		this.init(options);
	}
};


puredom.inherits(puredom.ViewManager, puredom.EventEmitter);


puredom.extend(puredom.ViewManager.prototype, /** @lends puredom.ViewManager# */ {

	/** ID prefix for view storage. */
	viewDomPrefix : 'views_',
	

	/**	@private */
	_regs : {
		node : /<(\/?)([a-z][a-z0-9]*)(\s+[a-z0-9._-]+=(['"]).*?\4)*\s*\/?>/gim
	},
	

	/**	Initialize the manager.
	 *	@param {Object} [options]		Hashmap of options.
	 *	@param {Object} [options.viewDomPrefix=views_]		Custom DOM cache ID prefix
	 *	@param {Object} [options.cacheBase=document.body]	Move the DOM view cache
	 */
	init : function(options) {
		options = options || {};
		if (this.initialized!==true) {
			this.initialized = true;
			if (options.viewDomPrefix) {
				this.viewDomPrefix = options.viewDomPrefix;
			}
			this.cacheBase = puredom.el({
				className : 'views_cacheBase',
				css : 'display: none;'
			}, options.cacheBase || document.body);
		}
	},
	

	/**	Teardown and cleanup the manager. */
	destroy : function() {
		if (this.initialized===true) {
			this.initialized = false;
			try {
				this.cacheBase.remove();
			} catch(err) {}
		}
	},
	

	/**	@private */
	log : function(msg, data) {
		if (this.logging===true) {
			puredom.log('ViewManager :: ' + msg, data);
		}
	},
	

	/**	Register a named view. */
	addView : function(name, view) {
		if (puredom.typeOf(view)==='string') {
			this._htmlViews[(name+'').toLowerCase()] = view;
		}
		else {
			this.load(name, false);
		}
	},
	

	/**	Check if a named view is registered. */
	exists : function(name) {
		return this._htmlViews.hasOwnProperty((name+'').toLowerCase());
	},
	

	/**	Load a view and immediately template it. <br />
	 *	See {@link puredom.ViewManager#load}
	 */
	template : function(name, fields, insertInto, insertBefore) {
		var ui, template;
		name = (name+'').toLowerCase();
		fields = fields || {};
		if (this._htmlViews.hasOwnProperty(name)) {
			template = this._htmlViews[name];
			//ui = this.buildViewFromHTML( puredom.template(template, fields) );
			ui = this.load(puredom.template(template, fields), insertInto, insertBefore, null, false);
		}
		return ui || false;
	},
	

	/**	Load a view.
	 *	@param {String} name					The named view to load
	 *	@param {HTMLElement} [insertInto]		Immediately insert the view into an parent
	 *	@param {HTMLElement} [insertBefore]		Inject view into the parent of this node, before this node.
	 *	@param {Boolean} [cloneOriginal=true]	Set this to false to hijack previously rendered DOM views.
	 *	@param {Boolean} [caching=true]			Set this to false to turn off view caching.
	 *	@returns {puredom.NodeSelection} view, or false on error.
	 */
	load : function(name, insertInto, insertBefore, cloneOriginal, caching) {
		var ui, lookup, cached, origName=name;
		if (name) {
			cached = caching!==false && this.getCachedView(name);
			if (cached) {
				this.log('Using cached view for "'+name+'".');
				ui = this.buildCachedView(cached);
			}
			else if (puredom.typeOf(name)==='string') {
				this._regs.node.lastIndex = 0;
				if (this._regs.node.test(name)) {										// build from an HTML string
					this.log('Parsing HTML view for "'+name+'".');
					ui = this.buildViewFromHTML(name);
					//console.log('TEST:::', name, arguments);
					name = null;
				}
				else if (this._htmlViews.hasOwnProperty((name+'').toLowerCase())) {		// build from stored HTML
					this.log('Loading stored HTML view for "'+name+'".');
					ui = this.buildViewFromHTML(this._htmlViews[(name+'').toLowerCase()]);
				}
				else {
					this.log('Looking up in-DOM view for "'+name+'"...');
					lookup = this.getViewFromDOM(name);									// build from a DOM tree
					if (lookup && lookup.exists()) {
						this.log('Lookup succeeded, view found.');
						ui = this.buildViewFromDOM(lookup, cloneOriginal!==false);		// clone rendered view
					}
					else {
						this.log('Lookup failed, no matching view found.');
					}
				}
			}
		}
		
		if (ui && ui.exists()) {
			if (name) {
				this.log('View "'+name+'" loaded.');
				// cache views if not retrieved from the cache:
				if (caching!==false) {
					this.cacheView(name, ui, cloneOriginal!==false);
				}
				
				ui.classify('views_'+name);
			}
			
			if (!ui.parent().exists()) {
				if (insertBefore) {
					insertBefore.parent().insertBefore(ui, insertBefore);
				}
				if (!insertBefore && insertInto) {
					ui.insertInto(insertInto);
				}
			}
			
			this.postProcessView(ui);
			
			return ui;
		}
		else {
			puredom.log('ViewManager :: Unable to find view "'+name+'".');
			return false;
		}
	},
	

	/**	Destroy a view. */
	unload : function(ui, unCache) {
		if (ui && ui.destroy) {
			ui.destroy();
		}
	},
	
	
	/** @private */
	_postProcessors : [],
	

	/**	Register a post-processor function that will be run on all loaded views. <br />
	 *	The function gets passed the view base as a {@link puredom.NodeSelection}.
	 */
	addViewPostProcessor : function(callback) {
		var i, exists=false;
		for (i=this._postProcessors.length; i--; ) {
			if (this._postProcessors[i]===callback) {
				exists = true;
				break;
			}
		}
		if (!exists) {
			this._postProcessors.push(callback);
		}
	},
	

	/**	Process a view after it has loaded.  Automatically called by load().
	 *	@private
	 */
	postProcessView : function(ui) {
		for (var i=0; i<this._postProcessors.length; i++) {
			this._postProcessors[i](ui);
		}
	},
	
	
	/**	@private */
	getViewFromDOM : function(def, customPrefix) {
		var el;
		customPrefix = customPrefix || this.viewDomPrefix;
		if (customPrefix.match(/[a-z0-9_-]/i)) {
			customPrefix = '#' + customPrefix;
		}
		def = def.replace(/[\s.\/\\]/gim, '');
		this.log('Lookup: prefix="'+customPrefix+'", def="'+def+'"');
		if (customPrefix) {
			el = puredom.el(customPrefix + def);
			if (el && el.exists()) {
				return el;
			}
		}
		return false;
	},
	
	
	/**	@private */
	buildViewFromHTML : function(html) {
		var node = puredom.el({
			innerHTML : html
		});
		node = node.children();
		node.remove();
		return node.exists() && node || false;
	},
	
	
	/**	@private */
	buildViewFromObj : function(obj) {
		var node;
		if (puredom.isArray(obj)) {
			node = tinyom.el({
				children : obj
			});
			node = node.children();
		}
		else {
			obj = puredom.extend({}, obj, {
				parent : null,
				insertBefore : null
			});
			node = puredom.el(obj);
		}
		return node.exists() && node || false;
	},

	
	/**	@private */
	buildViewFromDOM : function(domNodes, clone) {
		var node, html;
		domNodes = puredom.el(domNodes);
		if (clone===false) {
			return domNodes;
		}
		node = domNodes.clone(true);			// deep, no parent
		return node.exists() && node || false;
	},
	
	
	/**	@private */
	_htmlViews : {},
	
	
	/** The root node where cached DOM nodes are stored
	 *	@private
	 */
	cacheBase : null,
	

	/**	Attempt to retrieve a cached view
	 *	@private
	 */
	getCachedView : function(name) {
		var view = this.cacheBase.query('[data-viewname="'+name+'"]').first();
		return view.exists() && view || false;
	},
	

	/** Build a view from the cache, optionally retrieving it if not passed a reference.
	 *	@private
	 */
	buildCachedView : function(cached) {
		var view;
		if (puredom.typeOf(cached)==='string') {
			cached = this.getCachedView(cached);
		}
		view = cached && this.buildViewFromDOM(cached);
		if (view) {
			view.attr('id', this.viewDomPrefix + view.attr('data-viewname'));
		}
		return view;
	},
	

	/** Cache a view for future use.
	 *	@private
	 */
	cacheView : function(name, ui, copy) {
		/*
		if (copy===true) {
			ui = ui && this.buildViewFromDOM(ui);
		}
		this.cacheBase.query('[data-viewname='+name+']').destroy();
		ui.attr('data-viewname', name);
		ui.attr('id', null);
		ui._removeAllEvents();
		ui.insertInto(this.cacheBase);
		*/
		return false;
	}
	
});
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
			type		: options.method || (options.body ? "POST" : "GET"),
			callback	: callback || options.callback,
			body		: options.body,
			headers		: {
				'content-type' : 'application/x-www-form-urlencoded',
				'x-requested-with' : 'XMLHttpRequest'
			}
		});

		if (options.headers) {
			puredom.forEach(options.headers, function(value, key) {
				var h = req.headers;
				key = String(key).toLowerCase();
				if (value===undefined || value===null) {
					delete h[key];
				}
				else {
					h[key] = String(value);
				}
			});
		}

		if (options.contentTypeOverride) {
			req.contentTypeOverride = options.contentTypeOverride;
			// @todo: fixme
			delete options.contentTypeOverride;
		}

		if (options.responseType) {
			req.responseType = options.responseType;
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
			if (!xhr.responseType || xhr.responseType==='text') {
				req.responseText = req.response = xhr.responseText;
			}
			
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
					contentType = (xhr.getResponseHeader("Content-Type") || '').toLowerCase().split(';')[0];
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
				req.callback(req.status!==0 && req.status<400, req.response, req);
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

			if (req.responseType) {
				xhr.responseType = req.responseType;
			}

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


	/** Asynchronously create an XMLHttpRequest object.
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
/**	@class Storage adapter that persists data into HTML5 LocalStorage.
 *	@name puredom.LocalStorage.adapters.WebSQLAdapter
 */
puredom.LocalStorage.addAdapter('WebSQLAdapter', /** @lends puredom.LocalStorage.adapters.WebSQLAdapter */ {
	
	/** The default cookie ID to use for database storage */
	defaultName : 'db',
	
	
	/**	Default database identification info. */
	dbInfo : {
		name : 'PuredomLocalStorage',
		table : 'storage',
		version : '1.0',
		displayName : 'Cache, Settings and Storage',
		quota : 200000,					// 200 k
		minimumQuota : 10000			// 10 k
	},
	
	
	/**	This adapter is the fastest storage mechanism for Webkit. <br />
	 *	Web SQL has also be discontinued in favour of IndexedDB. Who knew SQL would turn out to be annoying? ... <br />
	 *	In terms of complexity, clearly LocalStorage is better, but for now this adapter can stay at the top of the list.
	 */
	rating : 80,
	
	
	/** Test if this adapter will work in the current environment */
	test : function(storage) {
		return !!window.openDatabase;
	},
	
	
	/** Load the persisted DB */
	load : function(storage, callback) {
		var db = this._getDatabase(storage),
			key = this._getKey(storage),
			table = this.dbInfo.table,
			errorCB;
		
		callback = callback || this._nullCallback;
		
		if (db) {
			errorCB = function(error) {
				if (error.message.indexOf('no such table')>-1) {
					callback();
				}
				else {
					puredom.log('WebkitSQLite Adapter Error (load): ' + error.message);
				}
			};
			
			db.transaction(function(tx) {
				if (tx) {
					tx.executeSql('SELECT key,value FROM '+table+' WHERE key=?', [key], function(tx, result) {
						var rows = [];
						if (result && result.rows) {
							for (var x=0; x<result.rows.length; x++) {
								rows.push(result.rows.item(x));
							}
						}
						if (rows.length>0) {
							callback(puredom.json.parse(rows[0].value));
						}
						else {
							callback();
						}
					});
				}
				else {
					callback(false);
				}
			}, errorCB);
		}
	},
	
	
	/** Save the DB to persistence. */
	save : function(storage, data, callback) {
		var key = this._getKey(storage),
			table = this.dbInfo.table;
		callback = callback || this._nullCallback;
		
		this._requireDatabase(storage, function(db) {
			var errorCB,
				jobs = 1,
				jobComplete;
			if (db) {
				errorCB = function(error) {
					puredom.log('WebkitSQLite Adapter Error (save): ' + error.message);
				};
				
				jobComplete = function() {
					jobs -= 1;
					if (jobs<=0) {
						if (callback) {
							callback(true);
						}
						callback = storage = data = errorCB = jobComplete = db = null;
					}
				};
				
				data = puredom.json.stringify(data);
				
				db.transaction(function(tx){
					tx.executeSql('INSERT OR REPLACE INTO '+table+' (key,value) VALUES(?,?)', [key,data], jobComplete);
				}, errorCB);
			}
			else {
				callback(false);
				callback = null;
			}
		});
	},
	
	
	/**	@private */
	_getDatabase : function(storage) {
		var quota = this.dbInfo.quota,
			db;
		if (this._currentDb) {
			return this._currentDb;
		}
		while (!db && quota>this.dbInfo.minimumQuota) {
			try {
				db = openDatabase(this.dbInfo.name, this.dbInfo.version, this.dbInfo.displayName, quota);
			}catch(err){}
			if (!db) {
				quota /= 10;
			}
		}
		if (db) {
			this._currentDb = db;
		}
		else {
			puredom.log('LocalStorage ERROR: WebkitSQLite Adapter failed to open database.');
		}
		return db || false;
	},
	
	
	/**	@private */
	_requireDatabase : function(storage, callback) {
		var self = this,
			db = this._getDatabase(storage),
			table = this.dbInfo.table;
		callback = callback || this._nullCallback;
		
		if (db) {
			self._createTable(db, function() {
				callback(db);
				self = callback = storage = db = null;
			});
		}
		else {
			callback(db, false);
			self = callback = storage = null;
		}
	},
	
	
	/**	@private */
	_createTable : function(db, callback) {
		var table = this.dbInfo.table;
		callback = callback || this._nullCallback;
		if (db) {
			db.transaction(function(tx) {
				tx.executeSql('CREATE TABLE IF NOT EXISTS '+table+' (key TEXT UNIQUE, value TEXT)', [], function(tx, result) {
					callback(true);
					callback = db = null;
				}, function(tx, error) {
					callback(false);
				});
			});
		}
		else {
			callback(false);
		}
	},
	
	
	/** Get the key for a storage object
	 *	@private
	 */
	_getKey : function(storage) {
		return (storage.id || this.defaultName || '') + '';
	},
	
	
	/** @private */
	_nullCallback : function(){}
	
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