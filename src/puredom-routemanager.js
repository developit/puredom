
/**	Manages controllers, providing a means for separating functionality into feature-centric modules.
 *	@param options {Object}		A hash of options to be given to the instance.
 *	@inherits {puredom#ControllerManager}
 */

puredom.RouteManager = function(options) {
	var self = this;
	puredom.ControllerManager.call(this);
	
	this.allowTemplateFallback = options.allowTemplateFallback===true || options.useBest===true;
	this.allowPartialUrlFallback = options.allowPartialUrlFallback===true;
	
	this._controllerUpdateState = function(options) {
		self.doStateUpdate(self._routerState, options);
	};
};

puredom.extend(puredom.RouteManager.prototype, {
	
	/** @public RouteManagers are singular by default, because a browser can only navigate to one URL at a time. */
	singular : true,
	
	/** @public  */
	rewrites : [
		/*
		{
			inbound : {
				pattern : /^\/?urlToChange(?:\/(.*?))?$/gim,
				replace : '/final/url/$1'
			}
			//outbound	: //gim,
		}
		*/
	],
	
	restoreState : function(state) {
		if (this.initialized!==true) {
			this._initState = state;
		}
		else {
			//puredom.log('RouteManager::restoreState('+puredom.json(state)+')');
			if (state && state.current_url) {
				this.route(state.current_url);
			}
			else {
				this.routeDefault();
			}
		}
	},
	
	doStateUpdate : function(state, options) {
		var controller,
			templatedUrl;
		this._routerState = state && puredom.extend({}, state);
		if (state && state.current) {
			controller = this.get(state.current);
			delete state.current;
			templatedUrl = this._templateUrl(controller.customUrl || controller.urlTemplate || controller.name, controller);
			if (templatedUrl.substring(0,1)!=='/') {
				templatedUrl = '/' + templatedUrl;
			}
			//console.log(templatedUrl);
			state.current_url = templatedUrl;
		}
		//puredom.log('RouteManager::updateState('+puredom.json(state)+')');
		this.updateState(state, options);
	},
	
	
	/** @override */
	register : function(name, controller) {
		//controller.setState = this._controllerSetState;
		controller.updateState = this._controllerUpdateState;
		return puredom.ControllerManager.prototype.register.call(this, name, controller);
	},
	
	
	/** @public Attempt to route the given URL to a controller. */
	route : function(url) {
		var list = this._controllers,
			normUrl = url.replace(/^[#!\/]+/gm,'').replace(/#.+$/gm,''),
			item, i, p, urlTemplate, matches, params,
			partialMatchName;
		
		for (i=0; i<list.length; i++) {
			item = list[i];
			urlTemplate = item.customUrl || item.urlTemplate || item.name;
			matches = {};
			if (this._checkUrlMatch(urlTemplate, url, matches)===true) {
				//puredom.log('Controller["'+item.name+'"].tpl = "'+urlTemplate+'" --> true');
				params = {};
				for (p in matches) {
					if ((p+'').substring(0,7)==='params.') {
						params[p.substring(7)] = matches[p];
					}
				}
				return this.load(item.name, {
					params : params
				});
			}
			else if (this.allowPartialUrlFallback===true && this._checkUrlMatch(urlTemplate, url, matches, {partial:true})===true) {
				//puredom.log('Controller["'+item.name+'"].tpl = "'+urlTemplate+'" --> PARTIAL');
				partialMatchName = item.name;
			}
			else {
				//puredom.log('Controller["'+item.name+'"].tpl = "'+urlTemplate+'" --> false');
			}
		}
		
		if (partialMatchName) {
			return this.load(partialMatchName, {
				params : {}
			});
		}
		
		if (this.allowTemplateFallback!==false && this.get(normUrl)) {
			return this.load(normUrl, {
				params : {}
			});
		}
		
		this._fireEvent('routingError', [{
			attemptedFallback : this.allowTemplateFallback!==false,
			url : url,
			type : 'RoutingError'
		}]);
		
		return false;
	},
	
	/** @public Load a controller */
	/*
	load : function(name, options) {
		this.__super.prototype.load.apply(this, arguments);
		this.doStateUpdate();
		return this;
	},
	*/
	
	/** @public Attempt to route the given URL to a controller. */
	routeDefault : function(url) {
		return this.loadDefault();
	},
	
	/** @private Template a URL using values from the current controller. Non-matched fields are left unchanged.
	 *	@param tpl {String}				The URL template
	 *	@param [controller {Object}]	Optional explicit controller reference. Defaults to current()
	 *	@returns {String}				The templated URL
	 */
	_templateUrl : function(tpl, controller) {
		controller = controller || this.current();
		return puredom.template(tpl, controller, false);
	},
	
	/** @private Check if a URL template matches the given URL.
	 *	@param urlTemplate {String}		A URL template, as used in Controller.customUrl
	 *	@param url {String}				The URL to test
	 *	@param &matches {Object}		Optional PBR Object, populated with the matched segments
	 *	@returns {Boolean}
	 */
	_checkUrlMatch : function(urlTemplate, url, matches, options) {
		var templateSegments = this._getUrlSegments(urlTemplate),
			urlSegments = this._getUrlSegments(url),
			tplFieldReg = /^\{([^{}]+)\}$/gim,
			isMatch = true,
			i;
		options = options || {};
		matches = matches || {};
		if (options.partial===true) {
			for (i=templateSegments.length; i--; ) {
				if (templateSegments[i].match(tplFieldReg)) {
					templateSegments.splice(i, 1);
				}
			}
			//console.log(urlSegments, templateSegments);
		}
		if (urlSegments.length===templateSegments.length) {
			for (i=0; i<urlSegments.length; i++) {
				if (urlSegments[i]===templateSegments[i] || templateSegments[i].match(tplFieldReg)) {
					matches[templateSegments[i].replace(tplFieldReg,'$1')] = urlSegments[i];
				}
				else {
					isMatch = false;
					break;
				}
			}
		}
		else {
			isMatch = false;
		}
		return isMatch;
	},
	
	/** @private Normalize a URL for comparison */
	_getUrlSegments : function(url) {
		//var reg = new RegExp('^\\/\*?(.*?)\/\*?$', 'gim');
		//return (url+'').replace(reg, '').split('/');
		var segs = (url+'').split('/'),
			i;
		for (i=segs.length; i--; ) {
			if (segs[i].replace(/(\s|\/)/gm,'').length===0) {
				segs.splice(i, 1);
			}
		}
		return segs;
	}
	
});


puredom.inherits(puredom.RouteManager, puredom.ControllerManager);

