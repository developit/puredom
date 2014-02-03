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