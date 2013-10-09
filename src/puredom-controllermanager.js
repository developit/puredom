
/**	Manages controllers, providing a means for separating functionality into feature-centric modules.
 *	@constructor Creates a new ControllerManager instance.
 *	@param {Object} [options]		Hash of options to be given to the instance.
 */
puredom.ControllerManager = function(options) {
	puredom.EventEmitter.call(this);
	
	this.controllerOptions = puredom.extend({}, this.controllerOptions);
	this._messageListeners = [];
	this._controllers = [];
	this._current = null;
	
	if (options) {
		if (options.controllerOptions) {
			puredom.extend(this.controllerOptions, options.controllerOptions);
		}
		if (puredom.typeOf(options.singular)==='boolean') {
			this.singular = options.singular;
		}
		if (puredom.typeOf(options.allowLoadDefault)==='boolean') {
			this.allowLoadDefault = options.allowLoadDefault;
		}
	}
};

puredom.extend(puredom.ControllerManager.prototype, {

	/** @public */
	controllerOptions : {},

	
	restoreState : function(state) {
		if (this.initialized!==true) {
			this._initState = state;
		}
		else {
			if (state && state.current) {
				this.load(state.current);
			}
			else {
				this.loadDefault();
			}
		}
	},

	
	doStateUpdate : function(state, options) {
		if (this.updateState) {
			this.updateState(state, options);
		}
	},

	
	/**	Initialize the registry. */
	init : function(options) {
		var autoRestore = true;
		if (this.initialized!==true) {
			this.initialized = true;
			if (options) {
				if (options.controllerOptions) {
					puredom.extend(this.controllerOptions, options.controllerOptions);
				}
				if (puredom.typeOf(options.singular)==='boolean') {
					this.singular = options.singular;
				}
				if (puredom.typeOf(options.allowLoadDefault)==='boolean') {
					this.allowLoadDefault = options.allowLoadDefault;
				}
				if (options.autoRestoreOnInit===false) {
					autoRestore = false;
				}
			}
			if (this._initState && autoRestore) {
				this.restoreState(this._initState);
			}
			this._initState = null;
			try {
				delete this._initState;
			}catch(err){}
			if (this.allowLoadDefault!==false && !this.current()) {
				this.loadDefault();
			}
		}
	},

	
	/**	Destroy the registry. */
	destroy : function() {
		var current, x;
		// supress errors for destructors to avoid chained memory leaks
		try {
			current = this.current();
			if (current) {
				if (current.unload) {
					current.unload();
				}
			}
			for (x=this._controllers.length; x--; ) {
				if (this._controllers[x].destroy) {
					this._controllers[x].destroy();
				}
			}
		}catch(err){}
		this.controllerOptions = {};
		this._controllers = [];
		this._messageListeners = [];
		this._current = null;
	},

	
	/**	Register a named module. */
	register : function(name, controller) {
		controller = controller || {};
		if (puredom.typeOf(name)==='string') {
			controller.name = name;
		}
		else {
			controller = name;
		}
		this._controllers.push(controller);

		this._fireEvent('add', [this.getIdFromName(controller.name)]);
	},


	/**	Load the given named module. */
	load : function(name, options) {
		var sandboxController, previousController, params, newController, eventResponse, response, loadResponse, unloadResponse;
		
		name = (name+'').toLowerCase();
		previousController = this.singular===true && this.current();
		
		if (previousController && previousController.name.toLowerCase()===name) {
			if (previousController.handleRepeatLoad) {
				previousController.handleRepeatLoad(options || {});
			}
			return true;
		}
		
		sandboxController = this._createControllerSandbox(name);
		params = puredom.extend({
				previousController : previousController
			}, 
			this.controllerOptions || {}, 
			options || {},
			sandboxController.sandbox
		);
		newController = name && this.get(name);
		
		if (newController) {
			puredom.extend(newController, sandboxController.sandbox);
			if (this.singular===true) {
				unloadResponse = this._unloadCurrent();
				if (unloadResponse===false) {
					return false;
				}
			}
			response = newController;
			if (newController.load) {
				eventResponse = this._fireEvent('beforeload', [newController.name]);
				if (eventResponse===false || (eventResponse.falsey && !eventResponse.truthy)) {
					return false;
				}
				loadResponse = newController.load(params);
				if (loadResponse!==null && loadResponse!==undefined) {
					response = loadResponse;
				}
			}
			// if the new controller doens't load, go back to the old one
			if (loadResponse===false) {
				eventResponse = this._fireEvent('loadcancel', [newController.name]);
				if (eventResponse===false || (eventResponse.falsey && !eventResponse.truthy)) {
					return false;
				}
				if (this.singular===true && params.previousController) {
					this.load(params.previousController.name, options);
				}
				else {
					this.loadDefault(options);
				}
			}
			else {
				this._current = this.getIdFromName(name);
				this._fireEvent('load', [name]);
				this._fireEvent('change', [name]);
				this.doStateUpdate({
					current : name
				});
			}
			return response;
		}
		return false;
	},


	/**	Load the default module (the module with isDefault=true).
	 *	@returns {Boolean} defaultWasLoaded
	 */
	loadDefault : function(options) {
		for (var x=this._controllers.length; x--; ) {
			if (this._controllers[x].isDefault===true) {
				return this.load(this._controllers[x].name, options);
			}
		}
		return false;
	},


	/** Load the controller that was previously loaded. <br />
	 *	<strong>Note:</strong> This is not actual history, it only remembers one item.
	 */
	loadPrevious : function(options) {
		if (this._previousController) {
			this.load(this._previousController, options);
		}
	},
	

	/**	Unload the current controller if one exists. */
	none : function() {
		this._unloadCurrent();
	},


	/**	Reload the current controller if one exists. */
	reloadCurrent : function() {
		var current = this.current();
		
		if (current) {
			this._unloadCurrent();
			this.load(current.name, this.controllerOptions);
		}
	},


	/**	@private */
	_unloadCurrent : function() {
		var current = this.current(),
			time, ret;
		if (current && current.unload) {
			ret = this._fireEvent('beforeunload', [current.name]);
			if (ret===false || (ret.falsey && !ret.truthy)) {
				return false;
			}
			ret = current.unload();
			if (ret===false) {
				return false;
			}
			this._fireEvent('unload', [current.name]);
			this._current = null;
		}
	},
	

	/**	Get the definition for a given named controller.
	 *	@param {String} name					The controller name to find
	 *	@param {Boolean} [returnIndex=false]	If true, returns the index instead of a reference.
	 */
	get : function(name, returnIndex) {
		name = (name+'').toLowerCase();
		for (var x=this._controllers.length; x--; ) {
			if (this._controllers[x].name.toLowerCase()===name) {
				return returnIndex===true ? x : this._controllers[x];
			}
		}
		return false;
	},
	

	/**	Post a message to the current controller if it exists. */
	postMessage : function(type, msgObj) {
		var current = this.current();
		if (current && current.onmessage) {
			//this._fireEvent('postMessage', [type, msgObj]);
			current.onmessage(type, msgObj);
			return true;
		}
		return false;
	},


	/**	Handle a message from a controller.
	 *	@private
	 */
	onMessage : function(type, handler, controller) {
		var obj = {
			type : (type+'').toLowerCase().replace(/^on/gim,''),
			handler : handler
		};
		if (controller) {
			if (puredom.typeOf(controller)==='string') {
				obj.controller = controller.toLowerCase();
			}
			else if (controller.hasOwnProperty('name')) {
				obj.controller = (controller.name + '').toLowerCase();
			}
		}
		this._messageListeners.push(obj);
	},


	/** Get a list of registered controllers
	 *	@param {Array} [properties]		Other properties to include in the list from each controller.
	 *	@returns {Array} controllerList
	 */
	getList : function(properties) {
		var map = [],
			i, j, ob;
		properties = (properties || []);
		for (i=0; i<this._controllers.length; i++) {
			ob = {
				name : this._controllers[i].name
			};
			for (j=0; j<properties.length; j++) {
				ob[properties[j]] = this._controllers[i][properties[j]];
			}
			map.push(ob);
		}
		return map;
	},


	/**	Get a reference to the current controller if it exists. */
	current : function() {
		return puredom.typeOf(this._current)==='number' && this._controllers[this._current] || false;
	},
	

	/**	@private */
	getIdFromName : function(name) {
		return this.get(name, true);
	},


	/**	@private */
	getNameFromId : function(id) {
		var controller = puredom.typeOf(id)==='number' && this._controllers[id];
		return controller && controller.name || false;
	},


	/** @private */
	_createControllerSandbox : function(name) {
		var controllerManager = this,
			sandbox,
			sandboxController,
			muted = false,
			throwListenerControllerError;
		
		name = (name + '').toLowerCase();
		
		/** Throw an error from a listener without blocking other listeners */
		throwListenerControllerError = function(listener, error) {
			var customError = new Error(
				'Listener error encountered in ControllerManager#sandbox.postMessage() :: ' + error.message,
				error.fileName,
				error.lineNumber
			);
			setTimeout(function() {
				var e = customError;
				error = customError = listener = null;
				throw(e);
			}, 1);
		};
		
		/** A sandbox that can be safely passed to a controller */
		sandbox = {
			controllerManager : controllerManager,
			manager : controllerManager,
			postMessage : function(type, msgObj) {
				var listener, x;
				msgObj = puredom.extend({}, msgObj, {
					controller	: name,
					type		: (type + '').replace(/^on/gim,'')
				});
				if (!muted) {
					controllerManager._fireEvent('message', msgObj);
					controllerManager._fireEvent(msgObj.type, msgObj);
					for (x=0; x<controllerManager._messageListeners.length; x++) {
						listener = controllerManager._messageListeners[x];
						if (!listener.controller || listener.controller===name.toLowerCase()) {
							try {
								listener.handler(msgObj);
							} catch(err) {
								throwListnerError(listener, err);
							}
						}
					}
				}
			}
		};
		
		/** A privileged manager/controller for the sandbox */
		sandboxController = {
			setName : function(newName) {
				name = (newName + '').toLowerCase();
			},
			mute : function() {
				muted = true;
			},
			unmute : function() {
				muted = false;
			},
			destroy : function() {
				for (var x in this.sandbox) {
					if (this.sandbox.hasOwnProperty(x)) {
						this.sandbox[x] = null;
					}
				}
				delete this.sandbox;
				controllerManager = null;
			},
			sandbox : sandbox
		};
		
		/** cleanup pointless refs: */
		setTimeout(function() {
			sandboxController = sandbox = null;
		}, 1);
		
		return sandboxController;
	},


	/** @private */
	_postMessageFromController : function(type, msgObj) {
	},
	
	/** @private */
	_controllers : [],
	
	/** @private */
	_messageListeners : [],

	/** @private */
	_current : null
});


puredom.inherits(puredom.ControllerManager, puredom.EventEmitter);
















/*
switchControllerAsync : function(name, callback) {
	var self = this,
		params = {
			previousController : this.currentController(),
			parent : this.controllerParent
		},
		newController = name && this.getController(name),
		loadNewController;
	
	if (newController) {
		loadNewController = function() {
			newController.load(params);
			self._current = self.getControllerIdFromName(name);
			self = newController = params = loadNewController = null;
		};
		if (params.previousController && params.precontrollerController.unload) {
			params.previousController.unload(loadNewController);
		}
		else {
			loadNewController();
		}
		return true;
	}
	return false;
},
*/
