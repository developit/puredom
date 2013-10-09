/** @ignore */
window.puredom = window.puredom || {};


/** @namespace Networking functionality. */
puredom.net = /** @lends puredom.net */ {
	
	/**	@class Represents an HTTP request.
	 *	The raw XMLHttpRequest object is accessible through a *request* property.
	 */
	HttpRequest : function HttpRequest(options){
		puredom.extend(this, options);
	},
	
	
	/**	Make an HTTP GET request. This is a convenience wrapper around {@link puredom.net.request}.
	 *	@param {String} url				The URL to which a request should be sent.
	 *	@param {Function} callback		A function to be called when the request has completed, with signature: function({Boolean} success, {Object|String|Document} data)
	 *	@param {Object} [options]		Additional configuration. See {@link puredom.net.request}.
	 *	@example
	 *	puredom.net.get("/ajax?f=1", function(success, response) {
	 *		console.log(success===true, response);
	 *	});
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 */
	get : function(url, callback, options) {
		return this.request(puredom.extend({
			url : url,
			type : "GET",
			callback : callback
		}, options || {}));
	},
	
	
	/**	Make an HTTP POST request. This is a convenience wrapper around {@link puredom.net.request}. <br />
	 *	<strong>Post value type conversion:</strong> <br />
	 *		Object: Objects get automatically converted to a querystring-encoded Strings through {puredom.querystring.stringify}.
	 *		String: Strings are used as the POST body, without any conversion.
	 *	@param {String} url				The URL to which a request should be sent.
	 *	@param {Object|String} post		POST body (see description). If this value is set, the request type will be POST unless overridden via <code>options.type</code>.
	 *	@param {Function} callback		A function to be called when the request has completed, with signature: function({Boolean} success, {Object|String|Document} data)
	 *	@param {Object} [options]		Additional configuration. See {@link puredom.net.request}.
	 *	@example
	 *	puredom.net.get("/ajax?f=2", { foo:'bar' }, function(s, data) {
	 *		console.log(s===true, data);
	 *	});
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 */
	post : function(url, post, callback, options) {
		return this.request(puredom.extend({
			url : url,
			type : "POST",
			post : post,
			callback : callback
		}, options || {}));
	},
	
	
	/**	Make multiple HTTP requests in order, firing the callback only when all have completed.
	 *	<br /><b>Callback Format:</b><br />
	 *	<code>
	 *	callback(
	 *		success   // {Boolean} - did *any* requests succeed?
	 *		responses // {Array}   - responses corresponding to the provided resources.
	 *		successes // {Number}  - how many requests succeeded (status<400)
	 *		failures  // {Number}  - how many requests failed (status>=400)
	 *	);
	 *	</code>
	 *	@param {Object[]} resources		An array of resource objects, with format as described in {@link puredom.net.request} options.
	 *	@param {Function} [callback]	A function to call once all requests have completed, with signature <code>function(success, responses, successes, failures)</code>. [See description]
	 *	@returns {Boolean} returns false if no resources were provided.
	 */
	multiLoad : function(resources, callback) {
		if (!resources) {
			return false;
		}
		var cur = -1,
			max = resources.length,
			allData = [],
			trues = 0,
			falses = 0,
			loaded, loadNext;
		
		/** @inner */
		loaded = function(result, data) {
			if (result && data) {
				var res = resources[cur],
					d = data;
				if (res.process && res.process.call) {
					d = res.process(d);
					if (d===undefined) {
						d = data;
					}
				}
				allData.push(d);
				if (callback) {
					callback(trues>0, allData, trues, falses);
				}
				loaded = loadNext = resources = allData = callback = null;
			}
			else {
				loadNext();
			}
		};
		
		/** @inner */
		loadNext = function() {
			cur += 1;
			var res = resources[cur],
				d = typeof(res)==='string' ? {url:res} : res;
			if (d) {
				http.request(d, loaded);
			}
			else {
				if (cur<max) {
					loadNext();
				}
				else {
					callback(false, null, null, "No resources were available.");
				}
			}
		};
		
		loadNext();
		
		return true;
	},
	
	
	/**	Construct and send an HTTP request based on a configuration object (options). <br />
	 *	<strong>Options:</strong> <br />
	 *		<table class="options"><tbody>
	 *		<tr><td>{String}</td><td><b>url</b></td><td>Required. A URL to which the request should be sent.</td></tr>
	 *		<tr><td>{String}</td><td><b>type</b></td><td>An explicit request type (HTTP verb). Generally "GET" or "POST". Overrides other methods of setting request type.</td></tr>
	 *		<tr><td>{Object|String}</td><td><b>post</b></td><td>Post body. {Object}s are converted to a form-encoded body using {@link puredom.parameterize}. {String}s are used as the POST body with no manipulation. If this value is set, the request type will be POST unless overridden by *type*.</td></tr>
	 *		<tr><td>{Function}</td><td><b>callback</b></td><td>A function to be called when the request has completed, with signature: <code>function({Boolean} success, {Object|String|Document} data)</code></td></tr>
	 *		<tr><td>{Object}</td><td><b>headers</b></td><td>Hashmap of request headers. (key-value)</td></tr>
	 *		<tr><td>{String}</td><td><b>contentTypeOverride</b></td><td>If set, overrides the *Content-Type* header returned by the server.</td></tr>
	 *		</tbody></table>
	 *	@param {Object} options			Define request options
	 *	@param {Function} [callback]	A callback function, used if options.callback is not set.
	 *	@returns {puredom.net.HttpRequest}</td><td>An HTTP request object
	 */
	request : function(options) {
		var opt, self;
		if (!options.url) {
			return false;
		}
		self = this;
		options = options || {};
		opt = new puredom.net.HttpRequest({
			url			: options.url,
			type		: options.type || (options.post ? "POST" : "GET"),
			callback	: options.callback || arguments[1] || function(){},
			post		: options.post,
			headers		: options.headers
		});
		if (options.contentTypeOverride) {
			opt.contentTypeOverride = options.contentTypeOverride;
			delete options.contentTypeOverride;
		}
		
		this.createXHR(opt.url, function(xhrCarrier) {
			opt.request = xhrCarrier.xhr;
			opt._xdrFrame = xhrCarrier.frame;
			xhrCarrier = null;
			
			if (opt.post && puredom.typeOf(opt.post)==='object') {
				opt.post = puredom.parameterize(opt.post);
				if (opt.post.substring(0,1)==='?') {
					opt.post = opt.post.substring(1);
				}
			}
			/** @private */
			opt.request.onreadystatechange = function() {
				var contentType, data, i;
				
				// for proxied XHR only:
				if (opt.request._orig) {
					opt.request.readyState = opt.request._orig.readyState;
					opt.request.status = opt.request._orig.status;
					opt.request.responseText = opt.request._orig.responseText;
					opt.request.responseXML = opt.request._orig.responseXML;
				}
				
				if (opt.request.readyState===4) {
					// The cross-domain frame can now be re-used.
					if (opt._xdrFrame) {
						setTimeout(function() {
							self._freeIframes.push(opt._xdrFrame);
							self = null;
						}, 100);
					}
					
					opt.status = opt.request.status;
					if (opt.contentTypeOverride) {
						contentType = opt.contentTypeOverride.toLowerCase();
					}
					else {
						try {
							contentType = (opt.request.getResponseHeader("Content-Type")).toLowerCase();
						} catch(err) {}
						contentType = contentType || "";
					}
					opt.responseText = opt.request.responseText;
					
					if (contentType.match(/\/(json|javascript)$/gm) || contentType==="json") {
						opt.responseType = "json";
						data = opt.responseJSON = null;
						try {
							data = opt.responseJSON = JSON.parse(opt.request.responseText.replace(/^[^\[\{]*(.*)[^\[\{]*$/g,'$1'));
						}catch(jsonParseError){
							opt.jsonParseError = true;
						}
					}
					else if (contentType==="application/xml" || contentType==="xml") {
						opt.responseType = "xml";
						data = opt.responseXML = opt.request.responseXML;
					}
					else {
						opt.responseType = "text";
						data = opt.responseText;
					}
					
					if (opt.callback) {
						opt.callback(opt.request.status<400, data);
					}
				}
			};
			opt.request.open(opt.type, opt.url, opt.async!==false);
			opt.request.setRequestHeader('content-type', 'application/x-www-form-urlencoded');
			opt.request.setRequestHeader('x-requested-with', 'XMLHttpRequest');
			if (opt.headers) {
				for (var h in opt.headers) {
					if (opt.headers.hasOwnProperty(h)) {
						try {
							opt.request.setRequestHeader(h, opt.headers[h]);
						} catch(err) {}
					}
				}
			}
			opt.request.send(opt.post || null);
		});
		return opt;
	},
	
	
	/**	Make a JSONp call (GET-only, works across domains, server must support the JSONp pattern). <br />
	 *	<strong>Options:</strong> <br />
	 *		<table class="options"><tbody>
	 *		<tr><td>{String}</td><td><b>url</b></td><td></td></tr>
	 *		<tr><td>{Object}</td><td><b>params</b></td><td>Request parameters as an object. Serialized to URL using {@link puredom.querystring.stringify}</td></tr>
	 *		<tr><td>{Function}</td><td><b>callback</b></td><td>A function to handle the data once received.</td></tr>
	 *		<tr><td>{Number}</td><td><b>timeout</b></td><td>Maximum number of seconds to wait before assuming failure. Default is 10.</td></tr>
	 *		</tbody></table>
	 *	@function
	 *	@param {String} url			The service URL, including querystring parameters.
	 *	@param {Object} options		A hash of available options.
	 *	@param {Function} callback	A function that gets called when the request returns.
	 *	@returns {Boolean} Was the request initiated?
	 */
	jsonp : (function() {
		/** @namespace JSONp-related functionality.
		 *	@name puredom.net.jsonp
		 *	@private
		 */
		var jsonp = function() {
				return jsonp.get.apply(jsonp, arguments);
			},
			reqIndex = 0;
		
		/** @private */
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
			
			requestObj = {
				id : callbackId,
				/** @inner */
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
	}()),
	
	
	/** @private */
	_freeIframes : [],
	
	
	/** @private */
	_xhrIndex : 0,
	
	
	/** Asynchronously create an XMLHttpRequest object, automatically instantiating it from within an iframe if the TLD matches the page's TLD.
	 *	@private
	 */
	createXHR : function(url, callback) {
		var isCrossDomain = false,
			self = this,
			domain, frame, xhr, _loadHandler, timer, i;
		this._xhrIndex += 1;
		if (url) {
			domain = (/^[a-z]{3,9}\:\/\/([^\/\?#]+)/gim).exec(url);
			domain = domain && domain[1];
			if (domain && domain!==location.hostname) {
				isCrossDomain = true;
				document.domain = location.hostname.match(/[^.]+\.[^.]+$/gim)[0];
				for (i=0; i<this._freeIframes.length; i++) {
					if (this._freeIframes[i].getAttribute('data-xhr-domain')===domain) {
						frame = this._freeIframes.splice(i,1)[0];
						break;
					}
				}
				if (frame) {
					callback(self._createXHRObj(frame.contentWindow, frame));
				}
				else {
					frame = document.createElement('iframe');
					frame.style.cssText = "position:absolute; left:0; top:-1000px; width:1px; height:1px; border:none; overflow:hidden;";
					/** @inner */
					_loadHandler = function() {
						var win, body;
						try {
							win = frame.contentWindow;
							body = win && win.document && win.document.domain===document.domain && win.document.body;
						}catch(err){
							body = null;
						}
						if (body && body.innerHTML) {
							clearInterval(timer);
							frame.onload = frame.onerror = null;
							callback(self._createXHRObj(win, frame));
							self = callback = xhr = frame = domain = _loadHandler = timer = null;
						}
					};
					frame.onload = frame.onerror = _loadHandler;
					frame.setAttribute('src', location.protocol+'//'+domain+'/xd_receiver.html');
					frame.setAttribute('role', 'presentation');
					frame.setAttribute('tabindex', '-1');
					frame.setAttribute('data-xhr-domain', domain);
					document.body.appendChild(frame);
					timer = setInterval(_loadHandler, 50);
				}
			}
		}
		if (!isCrossDomain) {
			xhr = this._createXHRObj();
			callback(xhr);
			return xhr;
		}
	},
	
	
	/** @private */
	_createXHRObj : function(win, frame) {
		var xmlHttp;
		win = win || window;
		
		try {
			xmlHttp = new win.XMLHttpRequest();
		} catch(err) {
			try {
				xmlHttp = new win.ActiveXObject("Msxml2.XMLHTTP");
			} catch(err2) {
				xmlHttp = new win.ActiveXObject("Microsoft.XMLHTTP");
			}
		}
		return {
			xhr : xmlHttp,
			frame : frame
		};
	}
	
};
