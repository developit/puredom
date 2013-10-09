/** Provides a managed notification/toast display area.
 *	@constructor Creates a new Notifier instance.
 *	@augments puredom.EventEmitter
 *	@param {Object} [options]	Hashmap of options
 *	@param {puredom.NodeSelection} [options.parent]		Construct the display area within a given element.
 */
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


puredom.inherits(puredom.Notifier, puredom.EventEmitter);


puredom.extend(puredom.Notifier.prototype, /** @lends puredom.Notifier# */ {

	/**	Show a notification.
	 *	@param {Object} config	Describes what to display
	 *	@param {Object} [config.message]	The text to display
	 *	@param {Object} [config.icon]		Icon/image to show next to the text
	 *	@param {Object} [config.image]		Icon/image to show next to the text
	 *	@param {Object} [config.timeout=Notifier.timeout]	How many seconds to wait before auto-dismissing the notification
	 */
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
	

	/**	@private */
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
	

	/**	@private */
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
	

	/**	@private */
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
	

	/**	@private*/
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
	

	/**	@private */
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
	

	/** Get a notification by ID */
	get : function(id) {
		return id && this._data.list.hasOwnProperty(id+'') && this._data.list[id+''] || false;
	},
	

	/**	@private */
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
	

	/**	@private */
	timeout : 15,
	

	/**	@private */
	_data : {
		counter : 0,
		list : {}
	}
});