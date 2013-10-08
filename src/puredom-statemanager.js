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
puredom.extend(puredom.StateManager.prototype, {
	
	/** @public A time to wait (in milliseconds) before committing state updates. Can be overridden 
	 *	on a per-save basis by passing true as a second parameter to puredom#StateManager.save()
	 */
	saveQueueDelay : 50,
	
	/** @public If two save() calls occur within the specified number of milliseconds, overwrite the first
	 *	@notes: This is no longer used, just supply a larger value for saveQueueDelay
	 */
	replaceTimeout : 0,		//125,
	
	/** List of available Adapters, keyed by ID. */
	adapters : {
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
	
	objects : {},
	states : {},
	initialized : false,
	
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
	
	destroy : function() {
		this.stopPolling();
		
		this.adapter.stateManager = null;
		this.adapter = this.states = this.objects = null;
		this.initialized = false;
	},
	
	startPolling : function() {
		if (this.adapter && this.adapter.startPolling) {
			this.adapter.startPolling();
		}
	},
	
	stopPolling : function() {
		if (this.adapter && this.adapter.stopPolling) {
			this.adapter.stopPolling();
		}
	},
	
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
	addObj : function(){ return this.addObject.apply(this,arguments); },
	
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
	},
	removeObj : function(){ return this.removeObject.apply(this,arguments); },
	
	restoreFromState : function(state, callback, andSave) {
		var self=this, cb, id, total=0, count=0;
		if (callback) {
			cb = function() {
				//console.log('cb(', count,',', total,')');
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
		//if (puredom.typeOf(state)==='object') {
			for (id in this.objects) {
				if (/*state[id] &&*/ this.objects[id].restoreState) {
					total += 1;
					//this.objects[id].restoreState(state[id], cb);
					this.objects[id].restoreState(state[id]);
					cb();
				}
			}
		//}
		if (total===0) {
			if (callback) {
				callback(false);
			}
			self = callback = null;
		}
		return this;
	},
	
	
	//_disableSaveCount : 0,
	disableSave : function() {
		//this._disableSaveCount += 1;
		this._saveDisabled = true;
	},
	enableSave : function() {
		//this._disableSaveCount = Math.max(this._disableSaveCount-1, 0);
		//this._saveDisabled = this._disableSaveCount<=0;
		this._saveDisabled = false;
	},
	
	
	restoreOne : function(id, callback) {
		var self = this;
		this.adapter.getState(function(state) {
			if (/*state[id] &&*/ self.objects[id] && self.objects[id].restoreState) {
				self.objects[id].restoreState(state[id]);
			}
			self = null;
			if (callback) {
				callback();
			}
		});
	},
	
	restore : function(callback) {
		//console.log('StateManager.restore');
		var self = this;
		this._restoring = true;
		//puredom.log('StateManager::restore');
		this.adapter.getState(function(state) {
			//console.log('StateManager.restore#.adapter.getState::callback', state);
			var newCurrentState = state && puredom.json(state);
			self._lastSaveTime = new Date().getTime();
			//console.log('this.adapter.getState::callback', state);
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
	
	save : function(callback, now, options) {
		var self = this;
		options = options || {};
		//console.log('save :: ', puredom.json(options), this.initialized===true && !this._saveDisabled);
		
		if (this.initialized===true && !this._saveDisabled) {		// NOTE: Disabled check only on sync saves?
			if (now===true) {										// --> && !this._saveDisabled
				if (this.currentSaveTimer) {
					clearTimeout(this.currentSaveTimer);
					delete this.currentSaveTimer;
				}
				//puredom.log('StateManager::save');
				this.getStateObj(function(state) {
					var newCurrentState = puredom.json(state),
						saveTime = new Date().getTime(),
						timeSinceLastSave = saveTime - (self._lastSaveTime || saveTime);
					//console.log(saveTime, self._lastSaveTime, timeSinceLastSave);
					self._lastSaveTime = saveTime;
					if (newCurrentState!==self.currentState) {
						//console.log('save>commit :: ', puredom.json(options), newCurrentState);
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
	
	setObjState : function(id, state, callback, now) {
		var options;
		//console.log('puredom#StateManager.setObjState', id, state);
		if (callback && typeof(callback)==='object') {
			options = callback;
		}
		this.states[id] = state;
		this.save(callback, options && options.now===true || callback===true, options);
	},
	
	getObjState : function(id, state) {
		this.states[id] = state;
	},
	
	getStateObj : function(callback) {
		if (callback) {
			callback(this.states);
		}
		return this;
	},
	
	emptyFunc : function(){}
	
	/*
	getStateObj : function(callback) {
		var cb, id, total=0, count=0;
		if (callback) {
			cb = function() {
				count += 1;
				if (count>=total) {
					if (callback) {
						callback();
					}
				}
			};
		}
		else {
			cb = function(){};
		}
		for (id in this.objects) {
			if (this.objects.hasOwnProperty(id) && this.objects[id].getState) {
				total += 1;
				this.objects[id].getState(cb);
			}
		}
		if (total===0) {
			callback();
		}
		return this;
	}
	*/
	
	/*
	,
	setObjState : function(id, state) {
		this.objects[id].state = state;
	}
	*/
});



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
			if (typeof(this.html5UrlPrefix)==='function') {
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
			//puredom.log('Initializing poller.');
			this.polling = true;
			this.getCurrentUrl(true);
			this.pollingTimer = setTimeout(this._doPollTimed, this.getPollInterval());
			puredom.addEvent(window, 'hashchange,pushstate,popstate', this._doPoll);
		}
	},
	
	/** Stop the location poller */
	stopPolling : function() {
		//puredom.log('Stopping poller.');
		clearTimeout(this.pollingTimer);
		puredom.removeEvent(window, 'hashchange,pushstate,popstate', this._doPoll);
		this.polling = false;
	},
	
	getPollInterval : function() {
		return this.stateManager && (this.stateManager.pollInterval || this.stateManager.adapterPollInterval) || this.pollInterval;
	},
	
	/** @private Poll the location, this is a timer callback and requires explicit setting of context. */
	_doPoll : function() {
		var self = this,		// arguments.callee._self || 
			currentUrl = self.currentUrl || null,
			url = self.getCurrentUrl(true) || null;
		if (url!==currentUrl) {
			//puredom.log('poll::changed: ', currentUrl, ' --> ', url);
			var startTime = new Date().getTime();
			self.stateManager.disableSave();
			self.stateManager.restore(function() {
				self.stateManager.enableSave();
				self = currentUrl = url = null;
				/*
				setTimeout(function() {
					var time = new Date().getTime() - startTime;
					//puredom.log('StateManager::UrlAdapter::time = ' + time);
					self.stateManager.enableSave();
					self = currentUrl = url = null;
				}, Math.round(self.getPollInterval()*1.5));
				*/
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
			//url = url.substring(index+2);
			url = url.substring(index+location.host.length);
		}
		else {
			url = null;
		}
		
		if (url || url==='') {
			url = this.normalizeUrl(url);
		}
		
		/*
		var url = location.href + '',
			index = url.indexOf('#!');
		if (index>-1) {
			url = url.substring(index+2);
		}
		else {
			url = null;
		}
		*/
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
		//isCurrentHistoryEntry = false;
		
		//console.log('url='+url + ', currentUrl='+currentUrl + ', isCurrent='+isCurrentHistoryEntry);
		if (url!==currentUrl && !isCurrentHistoryEntry) {
			//puredom.log('Changing URL to: ' + url);
			
			if (window.history.pushState /*&& !navigator.userAgent.match(/\bandroid\b/gim)*/) {
				// HTML5 History API
				if (url.substring(0,1)!=='/') {
					url = '/' + url;
				}
				prefix = this.getPrefix().replace(/\/$/,'');
				url = prefix + url;
				if (this.beforeCommit) {
					url = this.beforeCommit(url) || url;
				}
				//console.log(this.html5UrlPrefix, url);
				/*
				stateObj = {
					url : url,
					title : ''
				};
				*/
				//console.log('pushing html5 history entry: ', url);
				if (replace===true && window.history.replaceState) {
					window.history.replaceState(null, null, url);
				}
				else {
					window.history.pushState(null, null, url);
				}
			}
			else {
				//console.log('adding #! history entry: ', crunchedUrl);
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
		
		//console.log('puredom#StateManager::URLAdaptor::setState', state, index);
		/*
		if (index>-1) {
			url = url.substring(0, index);
		}
		
		stateUrl = this.stringify(state);
		url += '#!' + stateUrl;
		if (this.urlHistory.length<=1 || this.urlHistory[this.urlHistory.length-1]!==stateUrl) {
			if (location.href!==url) {
				location.href = url;
			}
			this.getCurrentUrl(true);
		}
		*/
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
		/*
		var url = location.href + '',
			index = url.indexOf('#!'),
			state;
		if (index>-1) {
			url = url.substring(index+2);
			state = this.parse(url);
			callback(state);
		}
		else {
			callback(false);
		}
		*/
		//console.log('puredom#StateManager::URLAdapter::getState', state, index);
	},
	
	/** @private parse a URL and return a valid state Object. */
	parse : function(str) {
		var obj = {},
			a, prefix, parts, x, y, index, key, value, encodedValue, levelKey, level, mappedUrl, mappedUrlIndex,
			isArrayKey, autoConvertValue;
		
		isArrayKey = function(key) {
			return !!key.match(/^\-?[0-9]+$/);
			//return !!levelKey.match(/^\[[0-9]+\]$/);
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
		
		//console.log('STR:: '+str+' || OBJ:: '+puredom.json(obj));
		
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
					//str += '&' + encodeURIComponent(id).replace('%5B','[').replace('%5D',']') + '=' + encodeURIComponent(obj);
			}
		};
		
		/*
		mappedUrl = puredom.delve(obj, urlMapping);
		console.log(mappedUrl);
		*/
		
		serialize(obj);
		serialize = obj = null;
		if (str.substring(0,1)==='&') {
			str = '?' + str.substring(1);
		}
		
		/*
		if (mappedUrl.indexOf('{')>-1) {
			mappedUrl.replace(/\{([^\\\/\'\"\{\}\(\)]+)\}/gim,funciton(str, ) {
				
			});
		}
		*/
		
		// add a preceeding slash if not disallowed:
		if (this.usePreceedingSlash!==false && mappedUrl.charAt(0)!=='/') {
			mappedUrl = '/' + mappedUrl;
		}
		
		return mappedUrl + str;
	}
};




puredom.StateManager.prototype.adapters.urlbasic = {
	setState : function(state, callback) {
		var url = location.href + '',
			index = url.indexOf('#!');
		//console.log('puredom#StateManager::URLAdapter::setState', state, index);
		if (index>-1) {
			url = url.substring(0, index);
		}
		url += '#!' + this.serializeState(state);
		location.href = url;
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
		//console.log('puredom#StateManager::URLAdapter::getState', state, index);
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