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