window.puredom = window.puredom || {};

/**
 *	Generate a functional JavaScript interface on top of a REST-like API from a JSON API description.
 *	@param {Object} api		The API description
 *	@returns {Object}		A complex object with methods corresponding to the REST API object's method descriptions.
 */

puredom.NativeAPI = function(api) {
	var self = (this.constructor===arguments.callee ? this : api) || {},		/* can be used as a method OR a class */
		priv = {},
		globalParameters = {},
		authParameters = {},
		getQueryStringFromObj,
		shallowObjectCopy,
		isArray,
		objConstructor = ({}).constructor,
		createApiMethod,
		NativeAPIMethod,
		MessageStringWithData,
		createNativeAPIResponse,
		emptyFunc = function(){},
		log;
	
	log = function(text) {
		if (self.enableLogging!==false && window.console && window.console.log) {
			window.console.log(text);
		}
	};
	
	
	getQueryStringFromObj = function (obj) {
		var querystring = "",
			x, i;
		for (x in obj) {
			if (obj[x]!==null && obj[x]!==undefined && obj[x].constructor!==Function && obj[x].constructor!==objConstructor && puredom.typeOf(obj[x])!=='object' && !isArray(obj[x])) {
				querystring += "&" + encodeURIComponent(x) + "=" + encodeURIComponent(obj[x]);
			}
			else if (obj[x] && isArray(obj[x])) {
				for (i=0; i<obj[x]; i++) {
					querystring += "&" + encodeURIComponent(x) + "[]=" + encodeURIComponent(obj[x]);
				}
			}
		}
		return querystring;
	};
	
	shallowObjectCopy = function(base, args) {
		var i, p, obj;
		for (i=1; i<arguments.length; i++) {
			obj = arguments[i];
			for (p in obj) {
				if (obj.hasOwnProperty(p)) {
					base[p] = obj[p];
				}
			}
		}
		return base;
	};
	
	isArray = function(what) {
		return Object.prototype.toString.apply(what)==="[object Array]";
	};
	
	NativeAPIMethod = function NativeAPIMethod(){};
	
	self.MessageStringWithData = MessageStringWithData = function MessageStringWithData(data, message){
		this.message = message || '';
		shallowObjectCopy(this, data);
	};
	MessageStringWithData.prototype.toString = MessageStringWithData.prototype.toSource = function(){
		return this.message;
	};
	
	createNativeAPIResponse = function(data, originalResponse) {
		var response;
		if (puredom.isArray(data.data) && data.data.length===0) {
			data.data = {};
		}
		
		function NativeAPIResponse(){}
		shallowObjectCopy(NativeAPIResponse.prototype, {
			getData : function() {
				return puredom.extend({}, this);
			},
			getResponse : function() {
				return this.constructor.prototype._originalResponse;
			},
			_originalResponse : originalResponse
		});
		
		response = new NativeAPIResponse();
		shallowObjectCopy(response, data);
		return (function() {
			data = response = originalResponse = NativeAPIResponse = null;
			return arguments[0];
		}(response));
	};
	
	self.setGlobalParameter = function (key, value) {
		if (value===undefined || arguments.length<2) {
			delete globalParameters[key];
		}
		else {
			globalParameters[key] = value;
		}
	};
	
	self.setAuthParameter = function (key, value) {
		if (value===undefined || arguments.length<2) {
			delete authParameters[key];
		}
		else {
			authParameters[key] = value;
		}
	};
	
	
	
	priv.cache = {};
	
	//window._inspectNativeApiCache = function(){ return priv.cache; };
	
	
	/** @private */
	priv.getCacheKey = function(method, options) {
		var key = '', list=[], i, props=[];
		options = puredom.extend({}, options || {});
		delete options.callback;
		key = (method.type || '') + '||' + method.endpoint + '||';
		for (i in options) {
			if (options.hasOwnProperty(i) && i!=='_cache' && i!=='_nocache' && i!=='_cache_deleteonly' && i!=='callback') {
				props.push(i);
			}
		}
		props.sort();
		for (i=0; i<props.length; i++) {
			list.push(encodeURIComponent('o_'+props[i]) + '=' + encodeURIComponent(options[props[i]]+''));
		}
		key += list.join('&');
		return key;
	};
	
	/** @private Get the cached request if it exists */
	priv.getCached = function(method, options) {
		var key = priv.getCacheKey(method, options),
			entry = priv.cache.hasOwnProperty(key) ? puredom.json.parse(priv.cache[key]) : null;
		if (self.enableCacheLogging===true) {
			console.log('CACHE: Getting ['+method.type+'] '+method.endpoint, options, ' --> ', entry);
			//console.log('CACHE->GET: ', key, ' --> ', entry);
		}
		return entry;
	};
	
	/** @private Delete a cache entry */
	priv.uncache = function(method, options, response) {
		var key = priv.getCacheKey(method, options);
		if (self.enableCacheLogging===true) {
			console.log('CACHE: Clearing ['+method.type+'] '+method.endpoint, options);
		}
		delete priv.cache[key];
	};
	
	/** @private Cache a response, overwriting existing */
	priv.cacheResponse = function(method, options, response) {
		var key = priv.getCacheKey(method, options);
		if (self.enableCacheLogging===true) {
			console.log('CACHE: Storing ['+method.type+'] '+method.endpoint, options, ' --> ', response);
			//console.log('CACHE->SET: ', key, ' --> ', response);
		}
		priv.cache[key] = puredom.json.stringify(response);
	};
	
	/** @public Purge the internal request cache */
	self.clearCache = function() {
		if (self.enableCacheLogging===true) {
			console.log('CACHE: Purging all entries');
		}
		priv.cache = {};
	};
	
	
	/** @private Validate submitted values against an API method definition */
	priv.validateParameters = function(options, method) {
		var requiredParams, name, p, pType, errorType, inputField, error,
			response = {
				errors : [],
				message : ''
			},
			baseErrorMessage = {
				nativeApiError : true,
				clientSideError : true
			};
		
		if (method.parameters) {
			requiredParams = {};
			for (name in method.parameters) {
				if (method.parameters.hasOwnProperty(name)) {
					p = method.parameters[name];
					pType = puredom.typeOf(p);
					// convert direct references to constructors to their lowercase'd names:
					if (pType==='function' && p.name) {
						pType = 'string';
						p = p.name.toLowerCase();
					}
					else if (pType==='regexp' || p.constructor===RegExp) {
						pType = 'string';
						p = '/' + p.source + '/' + (p.global?'g':'') + (p.ignoreCase?'i':'') + (p.multiline?'m':'');
					}
					// all validation types are strings
					if (pType==='string') {
						if (p.substring(0,1)==='/') {
							p = (/^\/(.*?)\/([gim]*?)$/gim).exec(p);
							requiredParams[name] = {
								validate : 'regex',
								against : new RegExp(p[1] || '', p[2] || '')
							};
						}
						else {
							requiredParams[name] = {
								validate : 'type',
								against : p.toLowerCase()
							};
						}
					}
				}
			}
		}
		
		//console.log(requiredParams);
		if (requiredParams) {
			for (name in requiredParams) {
				if (requiredParams.hasOwnProperty(name)) {
					pType = requiredParams[name].validate;
					p = requiredParams[name].against;
					inputField = options[name];
					error = null;
					if (pType==='regex') {
						p.lastIndex = 0;
					}
					if (!options.hasOwnProperty(name) || inputField===null || inputField===undefined || inputField==='') {
						error = {
							field : name,
							type : 'RequiredError',
							message : '{fieldnames.' + name + '} is required'
						}
					}
					else if (pType==='regex' && !p.test(inputField+'')) {
						error = {
							field : name,
							type : 'ValidationError',
							message : '{fieldnames.' + name + '} is invalid'
						};
					}
					else if (pType==='type' && p!==puredom.typeOf(inputField)) {
						error = {
							field : name,
							type : 'TypeError',
							message : '{fieldnames.' + name + '} is invalid'
						};
					}
					if (error) {
						error.missingParameter = error.field;
						response.message += (response.message.length>0?', ':'') + error.message + ' ('+error.type+')';
						response.errors.push(puredom.extend(error, baseErrorMessage));
					}
					
					//if (!options.hasOwnProperty(p) || options[p]===null || options[p]===undefined)) || (typeof(options[p])+'').toLowerCase()!==requiredParams[p]) {
					//	log("api."+subject+"."+action+": Required parameter '"+p+"' is missing or not a "+requiredParams[p]+". Cannot complete request.", 9);
					//	if (options.callback) {
					//		response.errors.push({
					//			nativeApiError : true,
					//			clientSideError : true,
					//			missingParameter : p,
					//			requiredParamType : requiredParams[p],
					//			message : p+" is required."
					//		});
					//	}
					//}
				}
			}
		}
		
		//console.log('PREvalidationResponse', response);
		
		response.failed = response.errors.length>0;
		return response;
	};
	
	
	
	createApiMethod = function(subject, action, method) {
		self[subject][action] = function (options) {
			var validationResponse = priv.validateParameters(options=options||{}, method),
				callback, req, type, querystring, x, i,
				funcs, postData, requestParameters,
				isLongPolling = method.longPolling===true || (method.allowLongPolling===true && options.longPolling===true),
				optionsHasLongPollingProperty = options.hasOwnProperty('longPolling'),
				optionsLongPollingProperty = options.longPolling,
				unCache;
			
			//console.log('validationResponse', validationResponse);
			
			// Check for a failed validation
			if (validationResponse.failed) {
				log("api."+subject+"."+action+": Errors: " + validationResponse.message, 9);
				
				// for historical reasons, return the first error on its own, then return the error collection as a third param:
				options.callback(false, validationResponse.errors[0], validationResponse.errors);
				return false;
			}
			
			// callback for JSONp (or other request methods)
			callback = function callback(json, extraData) {
				var success = json && (json[api.statusProperty || 'success']===true || json[api.statusProperty || 'success']===1),			// The response.success property MUST be Boolean TRUE or Integer 1  <---
					data = json.data || json || null,
					message = json.errorMessage || json.message || null,
					sval = json[api.statusProperty || 'success'],
					optionsLongPollingRef,
					enhancedMessage;
				
				// Some enhanced functionality used by error messages.
				extraData = extraData || {};
				extraData.apiMethod = method.endpoint;
				
				if (extraData.cached!==true && method.cache===true && self.enableCache===true) {
					priv.cacheResponse(method, options, json);
				}
				
				if (method.verifyResult) {
					success = method.verifyResult(json);
				}
				else if ((sval!==true && sval!==false && sval!==0 && sval!==1) || (json.constructor!==objConstructor && !isArray(json))) {
					success = (json.constructor===objConstructor || isArray(json)) ? true : false;
					data = json;
					message = null;
				}
				
				// Long Polling!
				if (isLongPolling) {
					// Did the server respond with "timedout":true?
					if (success && json.timedout===true) {
						// Looks like we need to re-initiate the request:
						optionsLongPollingRef = options;
						
						setTimeout(function() {
							self[subject][action](optionsLongPollingRef);
							callback = optionsLongPollingRef = success = json = data = message = sval = null;
						}, 1);
						// We'll respond later.
						return true;
					}
				}
				
				// Complex response objects allow for passing more data using the existing structure:
				data = createNativeAPIResponse(data, json, extraData);
				enhancedMessage = new MessageStringWithData(json, message);
				
				if (extraData.parseError===true) {
					success = false;
					data = data.message || data;
					if (api.onParseError) {
						api.onParseError(json, extraData);
					}
				}
				
				(method.onbeforecomplete || method.onBeforeComplete || method.precallback || emptyFunc)(success, success===true?data:enhancedMessage, json);
				if (success===true) {
					(options.onsuccess || method.onsuccess || emptyFunc).call(api.endpoints[subject][action], data, json);
				}
				else {
					(options.onerror || method.onerror || emptyFunc).call(api.endpoints[subject][action], message, data, json);
				}
				(options.oncomplete || options.callback || emptyFunc).call(api.endpoints[subject][action], success,success===true?data:enhancedMessage, json);
				(method.oncomplete || method.onComplete || method.callback || emptyFunc)(success, success===true?data:enhancedMessage, json);
				if (api.onRequestCompleted) {
					api.onRequestCompleted(subject+'.'+action, data, success, requestParameters, options);
				}
				callback = req = type = querystring = x = i = funcs = postData = requestParameters = isLongPolling = optionsHasLongPollingProperty = optionsLongPollingProperty = unCache = enhancedMessage = null;
				options = p = null;
			};//-callback
			
			// general request prep
			type = (method.type && method.type.toLowerCase()) || "";
			querystring = method.endpoint;
			if (method.formatSuffix) {
				querystring += method.formatSuffix;
			}
			else if (api.formatSuffix) {
				querystring += api.formatSuffix;
			}
			if (!querystring.match(/^(http|https|ftp)\:/)) {
				querystring = api.root + querystring;
			}
			
			unCache = options._cache===false || options._nocache===true;
			//delete options._cache;
			//delete options._nocache;
			
			if (isLongPolling) {
				options.longPolling = null;
				try{ delete options.longPolling; }catch(err){}
				options.timeout = options.timeout || method.longPollingTimeout || self.longPollingTimeout || 60;
			}
			else if (method.cache===true && self.enableCache===true) {
				//console.log(method.endpoint, puredom.extend({}, options));
				if (unCache) {
					priv.uncache(method, options);
					if (options._cache_deleteonly===true) {
						return;
					}
				}
				else {
					i = priv.getCached(method, options);
					if (i) {
						setTimeout(function() {
							callback(i, {
								cached : true,
								fresh : false
							});
						}, 1);
						return;
					}
				}
			}
			
			//console.log('NativeAPI::querystring = ' + querystring);
			if (options) {
				querystring = querystring.replace(/\{([a-z0-9\-\._]+)\}/gim, function(s, i) {
					//console.log('NativeAPI::tpl('+i+', '+((options.hasOwnProperty(i) && options[i]!==null && options[i]!==undefined)?'true':'false')+')');
					if (options.hasOwnProperty(i) && options[i]!==null && options[i]!==undefined) {
						try {
							delete options[i];
						} catch(err) {
							options[i] = null;
						}
						return options[i];
					}
					return s;
				});
			}
			
			
			// specific request prep
			switch (type) {
				case "xdr":
					log("Cross-domain requests are not yet supported.", 7);
					break;
				
				case "post":
					funcs = {};
					for (i in options) {
						if (options.hasOwnProperty(i) && Object.prototype.toString.apply(options[i])==="[object Function]") {
							funcs[i] = options[i];
							options[i] = null;
							try{ delete options[i]; }catch(err2){}
						}
					}
					requestParameters = postData = shallowObjectCopy(
						{},
						globalParameters,
						method.auth===true ? authParameters : {},
						method.defaultParameters || {},
						options
					);
					for (i in funcs) {
						if (funcs.hasOwnProperty(i)) {
							options[i] = funcs[i];
						}
					}
					funcs = null;
					
					// make the POST request
					puredom.net.request({
						url : querystring,
						type : "POST",
						post : postData,
						callback : function(success, response) {
							if (success && response) {
								callback(response);
							}
							else {
								if (this.jsonParseError===true) {
									callback({status:false, message:"Unable to parse server response", rawdata:this.responseText}, {parseError:true, clientsideErrorDetection:true});
								}
								else {
									callback({status:false, message:"Connection error "+this.status}, {clientsideErrorDetection:true});
								}
							}
						},
						contentTypeOverride : 'application/json'
					});
					break;
				
				case "jsonp":
					// TODO: re-write the following line, it does not handle arrays properly:
					requestParameters = shallowObjectCopy(
						{},
						globalParameters,
						method.auth===true ? authParameters : {},
						method.defaultParameters || {},
						options
					);
					querystring += getQueryStringFromObj(requestParameters);
					
					// replace the first "&" with a "?"
					if (querystring.indexOf("?")===-1 || querystring.indexOf("?")>querystring.indexOf("&")) {
						querystring = querystring.replace("&","?");
					}
					
					//console.log('puredom.net.jsonp(', querystring, callback, ');');
					
					// make the JSONp call
					req = puredom.net.jsonp(querystring, callback);
					break;
				
				//case "get":
				default:
					// TODO: re-write the following line, it does not handle arrays properly:
					requestParameters = shallowObjectCopy(
						{},
						globalParameters,
						method.auth===true ? authParameters : {},
						method.defaultParameters || {},
						options
					);
					querystring += getQueryStringFromObj(requestParameters);
					
					// replace the first "&" with a "?"
					if (querystring.indexOf("?")===-1 || querystring.indexOf("?")>querystring.indexOf("&")) {
						querystring = querystring.replace("&","?");
					}
					
					// make the GET request
					puredom.net.request({
						url : querystring,
						type : "GET",
						callback : function(success, response) {
							if (success && response) {
								callback(response);
							}
							else {
								if (this.jsonParseError===true) {
									callback({status:false, message:"Unable to parse server response", rawdata:this.responseText}, {parseError:true, clientsideErrorDetection:true});
								}
								else {
									callback({status:false, message:"Connection error "+this.status}, {clientsideErrorDetection:true});
								}
							}
						},
						contentTypeOverride : 'application/json'
					});
					break;
			}
			
			if (optionsHasLongPollingProperty) {
				options.longPolling = optionsLongPollingProperty;
			}
			
			return req;
		};
	};
	
	
	if (self.constructor===({}).constructor) {
		self = (function(obj) {
			function NativeAPI(){}
			for (var i in obj) {
				if (obj.hasOwnProperty(i)) {
					NativeAPI.prototype[i] = obj[i];
				}
			}
			return new NativeAPI();
		}(self));
	}
	
	
	var subject, action;
	for (subject in api.endpoints) {
		if (api.endpoints.hasOwnProperty(subject)) {
			self[subject] = new NativeAPIMethod();
			for (action in api.endpoints[subject]) {
				if (api.endpoints[subject].hasOwnProperty(action)) {
					createApiMethod(subject, action, api.endpoints[subject][action]);
				}
			}
		}
	}
	
	if (self.globalParameters) {
		for (var o in self.globalParameters) {
			if (self.globalParameters.hasOwnProperty(o)) {
				self.setGlobalParameter(o, self.globalParameters[o]);
			}
		}
	}
	
	if (this.constructor!==arguments.callee) {
		return self;
	}
};
