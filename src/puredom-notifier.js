(function(){  this.puredom = this.puredom || {}; }());

/** @inherits puredom#EventEmitter */
puredom.Notifier = function(options) {
	var self = this;
	
	puredom.EventEmitter.call(this);
	this._data = {
		counter : 0,
		list : {}
	};
	
	this._notificationClickHandler = function(e) {
		self._performAction(puredom.el(this).attr('data-notification-id'), 'notificationclick', e);
		return puredom.cancelEvent(e);
	};
	
	options = options || {};
	if (options.parent) {
		this._createBase(options.parent);
	}
};

puredom.extend(puredom.Notifier.prototype, {
	show : function(config) {
		var notify;
		if (config) {
			this._data.counter += 1;
			notify = {
				id : this._data.counter + '',
				timeout : config.timeout || this.timeout
			};
			this._data.list[notify.id] = notify;
			
			notify.base = this._build(notify.id, config);
			this._show(notify.id);
			
			if (notify.timeout) {
				this._resetTimeout(notify.id);
			}
			return notify;
		}
		return false;
	},
	
	_createBase : function(parent) {
		if (this.notifications_base) {
			this.notifications_base.remove();
			this.notifications_base.appendTo(parent);
		}
		else {
			this.notifications_base = puredom.el({
				className : 'notifications_base'
			}, parent);
		}
	},
	
	_build : function(id, options) {
		var base, iconSrc;
		base = puredom.el({
			className : "notification",
			css : 'height:0; opacity:0;',
			attributes : {
				'data-notification-id' : id
			},
			children : [
				{ className:'notification_top' },
				{
					className : 'notification_inner',
					children : [
						{ className:'notification_inner_top' },
						{
							className : 'notification_closeButton',
							children : [
								{ className:'label', innerHTML:this.closeButtonLabel || '&times;' }
							]
						},
						{
							className : 'notification_message',
							children : [
								{ className:'label', innerHTML:options.message || options.text }
							]
						},
						{ className:'notification_inner_bottom' }
					]
				},
				{ className:'notification_bottom' }
			],
			onclick : this._notificationClickHandler
		}, this.notifications_base);
		
		// add an icon if specified
		iconSrc = options.icon || options.image;
		if (iconSrc!==false && this.defaultIcon) {
			iconSrc = this.defaultIcon;
		}
		if (iconSrc) {
			puredom.el({
				type : 'img',
				className : 'notification_message',
				attributes : {
					src : options.icon || options.image || this.defaultIcon
				}
			}, base.query('.notification_inner'));
		}
		
		if (options.userDismiss===false) {
			base.query('.notification_closeButton').hide(true);
		}
		
		return base;
	},
	
	_show : function(id) {
		var notify = this.get(id);
		if (notify) {
			notify.base.css({
				opacity : 0
			}).css({
				opacity : 1,
				height : notify.base.children().height()
			}, {tween:this.showTween || 'medium'});
		}
	},
	
	_hide : function(id) {
		var notify = this.get(id);
		if (notify) {
			notify.base.css({
				opacity : 0,
				height : 0
			}, {tween:this.hideTween || 'medium', callback:function() {
				notify.base.remove();
				notify = null;
			}});
		}
	},
	
	_resetTimeout : function(id) {
		var notify = this.get(id),
			self = this;
		if (notify) {
			if (notify._hideTimer) {
				clearTimeout(notify._hideTimer);
			}
			if (notify.timeout) {
				notify._hideTimer = setTimeout(function() {
					self._hide(id);
					self = id = null;
				}, notify.timeout*1000);
			}
			notify = null;
		}
	},
	
	/** @public Get a notification by ID */
	get : function(id) {
		return id && this._data.list.hasOwnProperty(id+'') && this._data.list[id+''] || false;
	},
	
	_performAction : function(id, action, args) {
		var notify = this.get(id),
			ret;
		if (!puredom.isArray(args)) {
			args = [args];
		}
		if (action && notify) {
			args = [id].concat(args);
			ret = this._fireEvent(action, args);
			if (ret!==false) {
				switch (action.toLowerCase()) {
					case 'notificationclick':
					case 'notificationclicked':
						this._hide(id);
						break;
				}
			}
		}
	},
	
	timeout : 15,
	
	_data : {
		counter : 0,
		list : {}
	}
});


puredom.inherits(puredom.Notifier, puredom.EventEmitter);


