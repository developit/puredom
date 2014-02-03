/**	When called as a function, <code>puredom.net.jsonp()</code> is an alias of {@link puredom.net.jsonp.get}.
 *	@namespace JSONP Implementation. <br />
 *		JSONP only supports GET requests, but works across domains. <br />
 *		The server must support sending {@link http://en.wikipedia.org/wiki/JSONP JSONP} callbacks.
 *	@function
 *	@returns {puredom.net.jsonp.Request} jsonpRequest
 */
puredom.net.jsonp = (function() {

	/** @namespace JSONp-related functionality.
	 *	@name puredom.net.jsonp
	 *	@private
	 */
	var jsonp = function() {
			return jsonp.get.apply(jsonp, arguments);
		},
		reqIndex = 0;
	
	/**	Initiate a JSONP request.
	 *	@name puredom.net.jsonp.get
	 *	@function
	 *	@param {String} url			The service URL, including querystring parameters.
	 *	@param {Object} [options]		A hash of available options.
	 *	@param {String} [options.url=url]		The service URL
	 *	@param {Object} [options.params]		GET parameters as an object.
	 *	@param {Function} [options.callback]	A function to handle the data once received.
	 *	@param {Number} [options.timeout=10]	A number of seconds to wait before triggering failure.
	 *	@param {Function} callback	A function that gets called when the request returns.
	 *	@returns {puredom.net.jsonp.Request} jsonpRequest
	 */
	jsonp.get = function(url, options, callback) {
		var script, requestObj, callbackId, tmp;
		
		if (puredom.typeOf(options)==='function') {
			if (callback && puredom.typeOf(callback)==='object') {
				tmp = callback;
			}
			callback = options;
			if (tmp) {
				options = tmp;
			}
		}
		options = options || {};
		if (options.callback && !callback) {
			callback = options.callback;
		}
		if (!options.timeout) {
			options.timeout = 10;
		}
		url = url || options.url;
		
		if (!url) {
			return false;
		}
		
		if (options.params && puredom.parameterize) {
			url += (url.indexOf('?')>-1?'&':'?') + puredom.querystring.stringify(options.params);
		}
		
		reqIndex += 1;
		
		options.callback = callbackId = "puredom_net_jsonp_"+reqIndex;
		(function(jsonp, reqIndex) {
			/**	@ignore */
			window[options.callback] = function(data) {
				var e;
				if (callback) {
					try {
						callback(data);
					} catch(err) {
						e = err;
					}
					callback = null;
				}
				if (requestObj) {
					requestObj.stop();
					requestObj = null;
				}
				if (e) {
					throw(e);
				}
			};
		}());
		
		if (url.indexOf('{!callback}')>-1) {
			url = url.replace('{!callback}', callbackId);
		}
		else {
			url += (url.indexOf('?')<0?'?':'&') + encodeURIComponent(options.callbackParam || 'callback') + '=' + encodeURIComponent(callbackId);
		}
		
		if (!this._head) {
			tmp = document.getElementsByTagName('head');
			this._head = tmp && tmp[0];
		}
		
		script = puredom.el({
			type : 'script',
			attributes : {
				src		: url,
				async	: 'async',
				type	: 'text/javascript'
			},
			parent : this._head || document.body
		});
		
		/**	@class Represents a JSONp request.
		 *	@name puredom.net.jsonp.Request
		 */
		requestObj = /** @lends puredom.net.jsonp.Request# */ {
			/**	The request's callback ID */
			id : callbackId,
			
			/**	Attempt to stop the request. */
			stop : function() {
				if (requestObj._timer) {
					clearTimeout(requestObj._timer);
				}
				window[callbackId] = null;
				try {
					delete window[callbackId];
				}catch(err){}
				callback = null;
				script.attr('src', 'about:blank').remove();
				callbackId = requestObj = script = null;
			}
		};
		
		if (options.timeout && options.timeout>0) {
			requestObj._timer = setTimeout(function() {
				if (callback) {
					callback({
						_requestTimedOut : true,
						_jsonpTimedout : true,
						success : false,
						result : false
					});
				}
				if (requestObj) {
					requestObj.stop();
				}
			}, Math.round(options.timeout*1000));
		}
		
		url = options = tmp = null;
		
		return requestObj;
	};
	
	return jsonp;
}());