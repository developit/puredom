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
