
/**	Manages views, providing methods for loading, templating, caching and swapping.
 *	@param options {Object}		A hash of options to be given to the instance.
 */

puredom.ViewManager = function(options) {
	puredom.EventEmitter.call(this);
	this._htmlViews = {};
	this._postProcessors = [];
	if (options && options.init===true) {
		this.init(options);
	}
};

puredom.extend(puredom.ViewManager.prototype, {
	/** public: */
	
	viewDomPrefix : 'views_',
	
	_regs : {
		node : /<(\/?)([a-z][a-z0-9]*)(\s+[a-z0-9._-]+=(['"]).*?\4)*\s*\/?>/gim
	},
	
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
	
	destroy : function() {
		if (this.initialized===true) {
			this.initialized = false;
			// ...
		}
	},
	
	log : function(msg, data) {
		if (this.logging===true) {
			puredom.log('ViewManager :: ' + msg, data);
		}
	},
	
	addView : function(name, view) {
		if (puredom.typeOf(view)==='string') {
			this._htmlViews[(name+'').toLowerCase()] = view;
		}
		else {
			this.load(name, false);
		}
	},
	
	exists : function(name) {
		return this._htmlViews.hasOwnProperty((name+'').toLowerCase());
	},
	
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
		
		/*
		if (window.console) {
			console.log('views.'+(name || '[untitled]'), {
				orig_name : origName,
				'ui' : ui+'',
				'ui.parent' : ui && ui.parent()+'',
				'insertBefore' : insertBefore+'',
				'insertInto' : insertInto+''
			});
		}
		*/
		
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
	
	unload : function(ui, unCache) {
		if (ui && ui.destroy) {
			ui.destroy();
		}
	},
	
	
	/** @private */
	_postProcessors : [],
	
	/** @public Add a post-processor function that will be run on all loaded views. 
	 *	The function gets passed the view base as a {puredom#NodeSelection} object.
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
	
	/** @public Process a view after it has loaded.  Automatically called by load() */
	postProcessView : function(ui) {
		for (var i=0; i<this._postProcessors.length; i++) {
			this._postProcessors[i](ui);
		}
	},
	
	
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
	
	
	buildViewFromHTML : function(html) {
		var node = puredom.el({
			innerHTML : html
		});
		node = node.children();
		node.remove();
		return node.exists() && node || false;
	},
	
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
	
	buildViewFromDOM : function(domNodes, clone) {
		var node, html;
		domNodes = puredom.el(domNodes);
		if (clone===false) {
			return domNodes;
		}
		node = domNodes.clone(true);			// deep, no parent
		/*
		if (document.filters) {
			html = '';
			domNodes.each(function(node) {
				html += node.html();
			});
			node = this.buildViewFromHTML(html);
		}
		else {
			node = domNodes.clone(true);			// deep, no parent
		}
		*/
		return node.exists() && node || false;
	},
	
	
	_htmlViews : {},
	
	
	/** Old Reference-Based Caching */
	
	/** @private The root node where cached DOM nodes are stored */
	cacheBase : null,
	
	/** @private Attempt to retrieve a cached view */
	getCachedView : function(name) {
		var view = this.cacheBase.query('[data-viewname="'+name+'"]').first();
		return view.exists() && view || false;
	},
	
	/** @private Build a view from the cache, optionally retrieving it if not passed a reference */
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
	
	/** @private Cache a view for future use */
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


puredom.inherits(puredom.ViewManager, puredom.EventEmitter);


