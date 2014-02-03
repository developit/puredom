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