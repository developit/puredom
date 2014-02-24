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





