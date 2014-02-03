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