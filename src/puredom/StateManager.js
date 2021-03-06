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