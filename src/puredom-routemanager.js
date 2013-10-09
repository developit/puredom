/**	Manages controllers, providing a means for separating functionality into feature-centric modules.
 *	@constructor Creates a new RouteManager instance.
 *	@augments puredom.ControllerManager
 *	@param {Object} [options]	Hashmap of options to be given to the instance.
 *	@param {Boolean} [options.allowTemplateFallback=false]		If no URL templates match, attempt to load by name.
 *	@param {Boolean} [options.useBest=false]					If no URL templates match, attempt to load by name.
 *	@param {Boolean} [options.allowPartialUrlFallback=false]	Use the longest URL template match, even if it isn't a perfect match.
 */
puredom.RouteManager = function(options) {
	var self = this;
	options = options || {};
	puredom.ControllerManager.call(this);
	
	this.allowTemplateFallback = options.allowTemplateFallback===true || options.useBest===true;
	this.allowPartialUrlFallback = options.allowPartialUrlFallback===true;
	
	/**	@ignore */
	this._controllerUpdateState = function(options) {
		self.doStateUpdate(self._routerState, options);
	};
};


puredom.inherits(puredom.RouteManager, puredom.ControllerManager);


puredom.extend(puredom.RouteManager.prototype, /** @lends puredom.RouteManager# */ {
	
	/** RouteManagers are singular by default, because a browser can only navigate to one URL at a time. */
	singular : true,
	

	/** @public */
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
	

	/**	For use with StateManager */
	restoreState : function(state) {
		if (this.initialized!==true) {
			this._initState = state;
		}
		else {
			if (state && state.current_url) {
				this.route(state.current_url);
			}
			else {
				this.routeDefault();
			}
		}
	},
	

	/**	For use with StateManager */
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
			state.current_url = templatedUrl;
		}
		this.updateState(state, options);
	},
	
	
	/** @override */
	register : function(name, controller) {
		controller.updateState = this._controllerUpdateState;
		return puredom.ControllerManager.prototype.register.call(this, name, controller);
	},
	
	
	/** Attempt to route the given URL to a controller. */
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
				partialMatchName = item.name;
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
	

	/** Load a controller */
	/*
	load : function(name, options) {
		this.__super.prototype.load.apply(this, arguments);
		this.doStateUpdate();
		return this;
	},
	*/
	

	/** Attempt to route the given URL to a controller. */
	routeDefault : function(url) {
		return this.loadDefault();
	},
	

	/** Template a URL using values from the current controller. Non-matched fields are left unchanged.
	 *	@private
	 *	@param {String} tpl						The URL template
	 *	@param {Object} [controller=current]	Explicit controller reference.
	 *	@returns {String} templatedUrl
	 */
	_templateUrl : function(tpl, controller) {
		controller = controller || this.current();
		return puredom.template(tpl, controller, false);
	},

	
	/** Check if a URL template matches the given URL.
	 *	@private
	 *	@param {String} urlTemplate		A URL template, as used in Controller.customUrl
	 *	@param {String} url				The URL to test
	 *	@param {Object} matches			Optional Object to populate with the matched URL segments
	 *	@returns {Boolean} didMatch
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
	

	/**	Normalize a URL for comparison
	 *	@private
	 */
	_getUrlSegments : function(url) {
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