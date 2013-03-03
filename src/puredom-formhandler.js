puredom.FormHandler = function(form, options) {
	var me = this;

	options = options || {};
	if (arguments.length===1 && typeof(form)==='object' && form.constructor!==puredom.NodeSelection) {
		options = form;
		form = options.form;
	}
	
	puredom.EventEmitter.call(this);
	
	this._customTypes = [].concat(this._customTypes);
	if (form) {
		this.setForm(form);
	}
	if (options.enhance===true) {
		this.enhance();
	}
	if (options.data) {
		this.setData(options.data);
	}
	if (options.onsubmit && typeof(options.onsubmit)==='function') {
		this.on('submit', options.onsubmit);
		this._constructorSubmitHandler = options.onsubmit;
	}
	if (options.oncancel && typeof(options.oncancel)==='function') {
		this.on('cancel', options.oncancel);
		this._constructorCancelHandler = options.oncancel;
	}
	if (options.submitButton && ('on' in options.submitButton)) {
		options.submitButton.on('click', this._defaultSubmitButtonHandler);
		this._constructorSubmitButton = options.submitButton;
	}
	
	if (options.cancelButton && options.cancelButton.on) {
		options.cancelButton.on('click', function(e){
			me.cancel();
			return puredom.cancelEvent(e);
		});
		this._constructorCancelButton = options.cancelButton;
	}
};

puredom.extend(puredom.FormHandler.prototype, {
	
	errorMessageSelector : '.errorMessage, .generalForm_errorMessage',
	
	setForm : function(form) {
		var self = this;
		this.form = puredom.el(form);
		
		if (!this.action) {
			this.action = this.form.attr('action');
		}
		if (!this.method) {
			this.method = this.form.attr('method');
		}
		
		// <input type="submit" /> is required in order to fire submit on forms. Add a hidden one:
		puredom.el({
			type : 'input',
			attributes : {
				type : 'submit'
			},
			css : 'position:absolute; left:0; top:-999em; width:1px; height:1px; font-size:1px; visibility:hidden;'
		}, this.form);
		
		
		this.form.on('submit', function(e) {
			self.submit();
			return e.cancel();
		});
		
		this._kill = function() {
			self = null;
		};
		
		return this;
	},
	
	enhance : function() {
		var self = this,
			fields = this._getFields();
		if (fields) {
			fields.each(function(input) {
				var customType = self._getCustomType(input);
				if (customType && customType.enhance) {
					customType.enhance(input);
				}
			});
		}
		self = fields = null;
		return this;
	},
	
	disable : function() {
		this.disabled = true;
		this._getFields().disable();
		return this;
	},
	
	enable : function() {
		this.disabled = false;
		this._getFields().enable();
		return this;
	},
	
	destroy : function() {
		var self = this,
			fields = this._getFields();
		if (fields) {
			fields.each(function(input) {
				var customType = self._getCustomType(input);
				if (customType && customType.destroy) {
					customType.destroy(input);
				}
			});
		}
		if (this._constructorSubmitHandler) {
			this.removeEventListener('submit', this._constructorSubmitHandler);
		}
		if (this._constructorSubmitButton) {
			this._constructorSubmitButton.removeEvent('click', this._defaultSubmitButtonHandler);
		}
		if (this._constructorCancelHandler) {
			this.removeEventListener('cancel', this._constructorCancelHandler);
		}
		if (this._constructorCancelButton) {
			this._constructorCancelButton.removeEvent('click', this._constructorCancelHandler);
		}
		self = fields = null;
		return this;
	},
	
	clear : function() {
		this.setData({}, true);
		this.clearErrors();
		return this;
	},
	reset : function(){ return this.clear.apply(this,arguments); },
	
	submit : function() {
		var data, eventResponse;
		if (this.disabled===true) {
			puredom.log('Notice: Not submitting disabled form.');
			return this;
		}
		this.clearErrors(false);
		data = this.getData();
		this._hasErrors = false;
		if (data) {
			eventResponse = this._fireEvent('submit', [data]);
		}
		else {
			eventResponse = this._fireEvent('submitfailed', [data]);
		}
		if (!this._hasErrors && (!eventResponse || eventResponse.falsy!==true)) {
			this.clearErrors();
		}
		return this;
	},
	
	cancel: function() {
		if (this.disabled===true) {
			puredom.log('Notice: Not cancelling on disabled form.');
			return this;
		}
		
		this.clearErrors();
		this._fireEvent('cancel');
		
		return this;
	},
	
	clearErrors : function(clearMessage) {
		this._getFields().each(function(node) {
			node.parent().declassify('error');
		});
		if (clearMessage!==false) {
			this._hasErrors = false;
			this.form.query(this.errorMessageSelector).first().css({
				height : 0,
				opacity : 0
			}, {tween:'fast', callback:function(sel) {
				sel.hide();
			}});
		}
	},
	
	showFieldErrors : function(fields) {
		var self = this;
		
		this._hasErrors = true;
		
		// @TODO: multi-field errors and display error messages beside fields.
		
		puredom.forEach(fields, function(value, key) {
			var message;
			value = (value || 'Error') + '';
			value = value.replace(/\{fieldnames\.([^\}]+)\}/gim, function(s, n) {
				var id = n && self.form.query('[name="'+n+'"]').attr('id'),
					label = id && self.form.query('label[for="'+id+'"]');
				if (label && label.exists()) {
					return (label._nodes[0].textContent || label._nodes[0].innerText || label._nodes[0].innerHTML || '').replace(/\:\s*?$/g,'');
				}
				return n;
			});
			self.form.query('[name="'+key+'"]').focus().parent().classify('error');
			if (value.indexOf(' ')===-1) {
				value = puredom.i18n(value.toUpperCase());
			}
			message = self.form.query(self.errorMessageSelector).first();
			message.html('<div class="formHandlerErrorMessage">'+value+'</div>');
			message.css({
				height : Math.round(message.prop('offsetHeight')) || 0,
				opacity : 0
			}).show().css({
				height : message.children().first().height()+'px',
				opacity : 1
			}, {tween:'medium'});
			return false;
		});
		
		self = null;
	},
	
	getData : function() {
		var data = null,
			self = this,
			fields = this._getFields();
		if (fields) {
			data = {};
			fields.each(function(input) {
				var name = input.attr('name');
				if (name) {
					data[name] = self._getInputValue(input);
				}
			});
		}
		self = fields = null;
		return data;
	},
	
	setData : function(data, includeMissing) {
		var touched = [],
			self = this,
			fields = this._getFields();
		if (data && fields) {
			fields.each(function(input) {
				var name = input.attr('name');
				if (data.hasOwnProperty(name)) {
					touched.push(name);
					self._setInputValue(input, data[name]);
				}
				else if (includeMissing===true) {
					self._setInputValue(input, null);
				}
			});
		}
		self = fields = null;
		return this;
	},
	
	
	addCustomType : function(typeDefinition) {
		var self = this,
			fields = this._getFields();
		
		// actually add the type:
		this._customTypes.push(typeDefinition);
		
		// adding a type after initial enhance should still enhance matched fields:
		if (fields && typeDefinition.enhance) {
			fields.each(function(input) {
				var customType = self._getCustomType(input);
				if (customType===typeDefinition) {
					customType.enhance(input);
				}
			});
		}
		
		self = fields = null;
		return this;
	},
	
	
	/** @protected */
	_getFields : function() {
		var fields = null;
		if (this.form) {
			fields = this.form.query('input,textarea,select');		// {logging:true}
		}
		return fields;
	},
	
	/** @protected */
	_setInputValue : function(el, value) {
		var customType = this._getCustomType(el);
		if (value===undefined || value===null) {
			value = '';
		}
		if (customType && customType.setValue) {
			customType.setValue(el, value);
		}
		else {
			el.value(value);
		}
		return this;
	},
	
	/** @protected */
	_getInputValue : function(el) {
		var customType = this._getCustomType(el);
		if (customType && customType.getValue) {
			return customType.getValue(el);
		}
		else {
			return el.value();
		}
	},
	
	/** @protected */
	_getCustomType : function(el) {
		var x, type, nodeName, customType;
		if (el.attr('customtype')) {
			type = (el.attr('customtype')+'').toLowerCase();
		}
		else if (el.attr('type')) {
			type = (el.attr('type')+'').toLowerCase();
		}
		nodeName = (el.prop('nodeName')+'').toLowerCase();
		for (x=0; x<this._customTypes.length; x++) {
			customType = this._customTypes[x];
			//console.log('customType for', el, '<>', customType);
			if ( (customType.types && this._arrayIndexNC(customType.types,type)>-1) 
				|| (customType.type && (customType.type+'').toLowerCase()===type)
				|| (customType.nodeNames && this._arrayIndexNC(customType.nodeNames,nodeName)>-1)
				|| (customType.nodeName && (customType.nodeName+'').toLowerCase()===nodeName) ) {
				return customType;
			}
		}
		return false;
	},
	
	/** @protected */
	_arrayIndexNC : function(arr, val) {
		val = (val + '').toLowerCase();
		for (var x=0; x<arr.length; x++) {
			if ((arr[x]+'').toLowerCase()===val) {
				return x;
			}
		}
		return -1;
	},
	
	/** @private A DOM event handler that triggers the form to submit */
	_defaultSubmitButtonHandler : function(e) {
		var node = puredom.el(this);
		do {
			if (node.nodeName()==='form') {
				node.submit();
				break;
			}
		} while((node=node.parent()).exists() && node.nodeName()!=='body')
		return puredom.cancelEvent(e);
	},
	
	/** @protected */
	_customTypes : []
	
});


puredom.inherits(puredom.FormHandler, puredom.EventEmitter);





/** @static */
puredom.FormHandler.addCustomType = function(typeDefinition) {
	this.prototype._customTypes.push(typeDefinition);
};
