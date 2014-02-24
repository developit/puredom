/** @namespace Networking functionality. */
puredom.net = puredom.extend(new puredom.EventEmitter(), /** @lends puredom.net */ {
	
	/**	@class Represents an HTTP request.
	 *	The raw XMLHttpRequest object is accessible through a *request* property.
	 */
	HttpRequest : function HttpRequest(options){
		puredom.extend(this, options);
	},
	
	
	/**	Make a GET request. <br />
	 *	This is a convenience wrapper around {@link puredom.net.request}.
	 *	@param {String} url				URL to request
	 *	@param {Function} callback		Called on completion. Gets passed <code>(success, response, request)</code>.
	 *	@param {Object} [options]		Additional configuration. See options for {@link puredom.net.request}.
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 *	@example
	 *		puredom.net.get("/ajax?f=1", function(success, response) {
	 *			console.log(success===true, response);
	 *		});
	 */
	get : function(url, callback, options) {
		return this.request(puredom.extend({
			url : url,
			method : 'GET'
		}, options || {}), callback);
	},
	
	
	/**	Make a POST request. <br />
	 *	This is a convenience wrapper around {@link puredom.net.request}.
	 *	@param {String} url				URL to request
	 *	@param {Object|String} body		Request body.  If an <code>Object</code>, will be serialized based on the request's Content-Type (defaulting to form-encoded)
	 *	@param {Function} callback		Called on completion. Gets passed <code>(success, response, request)</code>.
	 *	@param {Object} [options]		Additional configuration. See options for {@link puredom.net.request}.
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 *	@example
	 *		puredom.net.get("/ajax?f=2", { foo:'bar' }, function(success, res, req) {
	 *			console.log(success===true, res, req.status, req.responseHeaders);
	 *		});
	 */
	post : function(url, body, callback, options) {
		return this.request(puredom.extend({
			url : url,
			method : 'POST',
			body : body
		}, options || {}), callback);
	},
	
	
	/**	Construct and send an HTTP request based on the specified options.
	 *	@param {Object} options			Request options.
	 *	@param {String} options.url						URL to request
	 *	@param {String} [options.method="GET"]			HTTP method to use
	 *	@param {String|Object} [options.body]			Request body. If a <code>String</code> is passed, it is considered pre-serialized.  
	 *													If an <code>Object</code> is passed, it will be serialized based on the request's 
	 *													<code>Content-Type</code> header.
	 *	@param {Any} [options.bodySerialized]			If set, gets assigned unmodified as the request body.  If you're sending something like Blob data, this is for you.
	 *	@param {Object} [options.headers]				A key-value list of request headers to send.
	 *	@param {Object} [options.contentTypeOverride]	If set, overrides the response's <code>Content-Type</code> header with the given value.
	 *	@param {Object} [options.callback]				Alias of <code>callback</code>, a function to call on completion. Gets passed <code>(success, response, request)</code>.
	 *	@param {Function} [callback]	Called on completion. Gets passed <code>(success, response, request)</code>.  If set, takes precidence over <code>options.callback</code>.
	 *	@returns {puredom.net.HttpRequest} An HTTP request object
	 */
	request : function(options, callback) {
		var self = this,
			req;
		options = options || {};

		if (!options.url) {
			return false;
		}

		if (!options.method && options.type) {
			options.method = options.type;
			console.warn('puredom.net.request: The `type` option is deprecated. Use `method`.');
		}

		if (!options.body && options.post) {
			options.body = options.post;
			console.warn('puredom.net.request: The `post` option is deprecated. Use `body`.');
		}

		req = new puredom.net.HttpRequest({
			url			: options.url,
			type		: options.method || (body ? "POST" : "GET"),
			callback	: callback || options.callback,
			body		: options.body,
			headers		: {
				'content-type' : 'application/x-www-form-urlencoded',
				'x-requested-with' : 'XMLHttpRequest'
			}
		});

		if (options.headers) {
			puredom.forEach(options.headers, function(value, key) {
				req.headers[String(key).toLowerCase()] = String(value);
			});
		}

		if (options.contentTypeOverride) {
			req.contentTypeOverride = options.contentTypeOverride;
			// @todo: fixme
			delete options.contentTypeOverride;
		}

		options = callback = null;

		/** @ignore */
		function handleReadyState() {
			var xhr = req.request,
				typeMap = {
					json : 'JSON',
					document : 'XML'
				},
				headerReg = /^([a-z\-\.\_])\s*?\:/gim,
				head, contentType, resType, key;
			
			if (xhr.readyState!==4) {
				return;
			}
			self.fireEvent('before:response', req);
			
			req.status = xhr.status;
			req.responseType = 'text';
			req.responseText = req.response = xhr.responseText;
			
			req.responseHeaders = {};
			headerReg.lastIndex = 0;
			head = xhr.getAllResponseHeaders();
			while ( (key=headerReg.exec(head)) ) {
				req.responseHeaders[key[1].toLowerCase()] = xhr.getResponseHeader(key[1]);
			}

			if (req.contentTypeOverride) {
				contentType = req.contentTypeOverride.toLowerCase();
			}
			else {
				try {
					contentType = (xhr.getResponseHeader("Content-Type")).toLowerCase();
				} catch(err) {}
				contentType = contentType || "";
			}
			
			resType = xhr.responseType;
			if (resType) {
				req.responseType = resType;
				req.response = xhr.response;
				key = 'response' + (typeMap[resType] || resType.charAt(0).toUpperCase()+resType.substring(1));
				req[key] = req.response;
			}
			else if (contentType.match(/(^|\/)(json|javascript)$/gm)) {
				req.responseType = 'json';
				try {
					req.response = req.responseJSON = JSON.parse(xhr.responseText.replace(/^[^\[\{]*(.*)[^\[\{]*$/g,'$1'));
				} catch(parseError) {
					req.jsonParseError = parseError;
				}
			}
			else if (contentType==='application/xml' || contentType==='xml') {
				req.responseType = 'document';
				req.response = req.responseXML = xhr.responseXML;
			}
			
			if (typeof req.callback==='function') {
				req.callback(req.status<400, req.response, req);
			}
		}
		
		/**	@ignore */
		this.createXHR(req, function(xhr) {

			/**	A reference to the request's underlying XMLHttpRequest instance
			 *	@name puredom.net.HttpRequest#xhr
			 *	@object
			 */
			req.xhr = xhr;

			req.request = xhr;
			
			xhr.onreadystatechange = handleReadyState;

			xhr.open(req.type, req.url, req.async!==false);

			puredom.forEach(req.headers, function(value, key) {
				xhr.setRequestHeader(key, value);
			});

			if (!req.bodySerialized && req.body && puredom.typeOf(req.body)==='object') {
				self.serializeRequestBody(req);
			}

			xhr.send(req.bodySerialized || req.body || null);
		});

		return req;
	},


	/**	Lookup for request serialization methods. 
	 *	Each must expose a stringify() or encode() method. 
	 *	Keys are strings to find within a request's content-type header (lowercase'd).
	 *	@private
	 */
	requestSerializers : {
		json : puredom.json,

		xml : puredom.xml,

		'form-encoded' : puredom.querystring
	},


	/**	Serialize a request body. Adds a <code>bodySerialized</code> property to <code>req</code>.
	 *	@param {puredom.net.HttpRequest} req
	 *	@private
	 */
	serializeRequestBody : function(req) {
		var contentType = (req.headers['content-type'] || 'application/x-www-form-urlencoded').toLowerCase();
		puredom.forEach(this.serializers, function(api, type) {
			if (contentType.indexOf(type)>-1) {
				req.bodySerialized = (api.stringify || api.encode || api)(req.body);
				return false;
			}
		});
	},


	/** Asynchronously create an XMLHttpRequest object, automatically instantiating it from within an iframe if the TLD matches the page's TLD.
	 *	@private
	 */
	createXHR : function(req, callback, context) {
		var xhr;
		context = context || window;
		
		if (context.XMLHttpRequest) {
			xhr = new context.XMLHttpRequest();
		}
		else {
			try {
				xhr = new context.ActiveXObject("Msxml2.XMLHTTP");
			} catch(err2) {
				xhr = new context.ActiveXObject("Microsoft.XMLHTTP");
			}
		}

		callback(xhr);
		return xhr;
	}
	
	
});