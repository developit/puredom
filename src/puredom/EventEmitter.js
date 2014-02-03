/**	Fire events and listen for fired events. <br />
 *	Let's just assume every framework provides one of these now.
 *	@constructor Creates a new EventEmitter instance.
 */
puredom.EventEmitter = function EventEmitter() {
	this._eventRegistry = [];
};


/** Register an event listener on the instance.
 *	@param {String} type		An event type, or a comma-seprated list of event types.
 *	@param {Function} handler	A function to call in response to events of the given type.
 *	@returns {this}
 */
puredom.EventEmitter.prototype.addEventListener = function(type, handler) {
	var t, i;
	type = (type + '').toLowerCase().replace(/\s+/gim,'');
	if (type.indexOf(',')>-1) {
		t = type.split(',');
		for (i=0; i<t.length; i++) {
			this.addEventListener(t[i],handler);
		}
		return this;
	}
	type = type.replace(/^on/,'');
	this._eventRegistry.push({
		type : type,
		handler : handler
	});
	return this;
};

/**	Alias of {@link puredom.EventEmitter#addEventListener}
 *	@function
 *	@private
 */
puredom.EventEmitter.prototype.addListener = puredom.EventEmitter.prototype.addEventListener;

/**	Alias of {@link puredom.EventEmitter#addEventListener}
 *	@function
 */
puredom.EventEmitter.prototype.on = puredom.EventEmitter.prototype.addEventListener;


/** Remove an event listener from the instance.
 *	@param {String} type		An event type, or a comma-seprated list of event types.
 *	@param {Function} handler	A reference to the handler, as was originally passed to {puredom.EventEmitter#addEventListener}.
 *	@returns {this}
 */
puredom.EventEmitter.prototype.removeEventListener = function(type, handler) {
	var x, r, t, i;
	type = (type + '').toLowerCase().replace(/\s+/gim,'');
	if (type.indexOf(',')>-1) {
		t = type.split(',');
		for (i=0; i<t.length; i++) {
			this.removeEventListener(t[i],handler);
		}
		return this;
	}
	type = type.replace(/^on/,'');
	for (x=this._eventRegistry.length; x--; ) {
		r = this._eventRegistry[x];
		if (r.type===type && r.handler===handler) {
			this._eventRegistry.splice(x, 1);
			break;
		}
	}
	return this;
};

/**	Alias of {@link puredom.EventEmitter#removeEventListener}
 *	@function
 *	@private
 */
puredom.EventEmitter.prototype.removeListener = puredom.EventEmitter.prototype.removeEventListener;


/** Fire an event of a given type. <br />
 *	Pass a comma-separated list for <code>type</code> to fire multiple events at once.
 *	@param {String} type	An event type, or a comma-seprated list of event types.
 *	@param {Array} args		An Array of arguments to pass to each handler. Non-Array values get auto-boxed into an Array.
 *	@returns {Array} an Array of handler return values. The Array also has "truthy" and "falsey" properties indicating if any handlers returned <code>true</code> or <code>false</code>, respectively.
 */
puredom.EventEmitter.prototype.fireEvent = function(type, args) {
	var x, r, errors=[], rval, returns=[];
	type = (type+'').toLowerCase().replace(/^on/,'');
	if (!puredom.isArray(args)) {
		args = [args];
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
	errors = null;
	return returns;
};

/**	Alias of {@link puredom.EventEmitter#fireEvent}
 *	@deprecated
 *	@private
 */
puredom.EventEmitter.prototype._fireEvent = puredom.EventEmitter.prototype.fireEvent;
