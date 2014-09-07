(function($) {
	/** @exports $ as puredom */

	/**	Creates a new EventEmitter instance.
	 *	@class Fire events and listen for fired events.
	 */
	$.EventEmitter = function EventEmitter() {
		this._eventRegistry = [];
	};

	var proto = $.EventEmitter.prototype;

	function multi(inst, func, type, handler, collector) {
		var o = typeof type,
			t, i, ret;
		if (o==='object' && type) {
			for (i in type) {
				if (type.hasOwnProperty(i)) {
					ret = inst[func](i, type[i]);
					if (collector) {
						collector.push(ret);
					}
				}
			}
			return true;
		}
		if (o==='string' && type.indexOf(',')>-1) {
			t = type.split(',');
			for (i=0; i<t.length; i++) {
				ret = inst[func](t[i], handler);
				if (collector) {
					collector.push(ret);
				}
			}
			return true;
		}
		return false;
	}

	function normalizeType(type) {
		return String(type).toLowerCase().replace(/(^on|\s+)/gim,'');
	}

	$.extend(proto, /** @lends puredom.EventEmitter# */ {

		/** Register an event listener on the instance.
		 *	@param {String} type		An event type, or a comma-seprated list of event types.
		 *	@param {Function} handler	A function to call in response to events of the given type.
		 *	@returns {this}
		 */
		on : function(type, handler) {
			type = normalizeType(type);
			if (!multi(this, 'on', type, handler)) {
				this._eventRegistry.push({
					type : type,
					handler : handler
				});
			}
			return this;
		},


		/**	A version of {@link puredom.EventEmitter#on .on()} that removes handlers once they are called.
		 *	@see puredom.EventEmitter#on
		 *	@param {String} type		An event type, or a comma-seprated list of event types.
		 *	@param {Function} handler	A function to call in response to events of the given type.  Will only be called once.
		 *	@returns {this}
		 */
		once : function(type, handler) {
			type = normalizeType(type);
			if (!multi(this, 'once', type, handler)) {
				this.on(type, function onceProxy() {
					this.removeListener(type, onceProxy);
					return handler.apply(this, arguments);
				});
			}
			return this;
		},


		/** Remove an event listener from the instance.
		 *	@param {String} type		An event type, or a comma-seprated list of event types.
		 *	@param {Function} handler	A reference to the handler, as was originally passed to {puredom.EventEmitter#addEventListener}.
		 *	@returns {this}
		 */
		removeListener : function(type, handler) {
			var x, r;
			type = normalizeType(type);
			if (!multi(this, 'removeListener', type, handler)) {
				for (x=this._eventRegistry.length; x--; ) {
					r = this._eventRegistry[x];
					if (r.type===type && r.handler===handler) {
						this._eventRegistry.splice(x, 1);
						break;
					}
				}
			}
			return this;
		},


		/** Fire an event of a given type. <br />
		 *	Pass a comma-separated list for <code>type</code> to fire multiple events at once.
		 *	@param {String} type	Event type, or a comma-seprated list of event types.
		 *	@param {Array} [args]	Arguments to pass to each handler. Non-Array values get auto-boxed into an Array.
		 *	@returns {Array} an Array of handler return values. The Array also has "truthy" and "falsey" properties indicating if any handlers returned <code>true</code> or <code>false</code>, respectively.
		 */
		emit : function(type, args) {
			var returns = [],
				x, r, rval;
			type = normalizeType(type);
			args = Array.prototype.slice.call(arguments, 1);
			if (multi(this, 'emit', type, args, returns)) {
				return Array.prototype.concat.apply([], returns);
			}
			for (x=this._eventRegistry.length; x--; ) {
				r = this._eventRegistry[x];
				if (r.type===type) {
					if (returns.length===0) {
						returns.falsy = returns.falsey = returns.truthy = true;
					}
					rval = r.handler.apply(this, args);
					returns.push(rval);
					if (rval===true) {
						returns.falsy = returns.falsey = false;
					}
					else if (rval===false) {
						returns.truthy = false;
					}
					if (rval===false) {
						break;
					}
				}
			}
			return returns;
		},

		/**	Deprecated alternative version of {@link puredom.EventEmitter#emit emit()} that
		 *	accepts an Array of event parameters as the second argument.
		 *	@function
		 *	@private
		 *	@deprecated
		 */
		fireEvent : function(type, args) {
			return this.emit.apply(this, ([type]).concat(args));
		}

	});


	$.forEach(/** @lends puredom.EventEmitter# */{

		/**	Alias of {@link puredom.EventEmitter#on on()}
		 *	@function
		 *	@private
		 */
		addListener : 'on',

		/**	Alias of {@link puredom.EventEmitter#on on()}
		 *	@function
		 *	@private
		 */
		addEventListener : 'on',

		/**	Alias of {@link puredom.EventEmitter#removeListener removeListener()}
		 *	@function
		 *	@private
		 */
		removeEventListener : 'removeListener',

		/**	Alias of {@link puredom.EventEmitter#emit emit()}
		 *	@function
		 *	@private
		 */
		trigger : 'emit'

	}, function(alias, key) {
		proto[key] = proto[alias];
	});

}(puredom));
