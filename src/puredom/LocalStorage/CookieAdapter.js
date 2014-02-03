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