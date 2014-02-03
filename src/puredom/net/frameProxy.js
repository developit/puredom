/**	@namespace Adds support for iframe-based cross-subdomain requests.
 *	This technique uses an HTML page called xd_receiver.html
 *	@function
 */
puredom.net.frameProxy = (function() {
	/**	@exports exports as puredom.net.frameProxy */

	var exports = {
			/**	The relative path of an HTML proxy page to load from subdomains.
			 *	@default "xd_receiver.html"
			 */
			htmlPage : '/xd_receiver.html',

			/**	Maximum amount of time to wait for proxy pages to load, in milliseconds.
			 *	@default 10000
			 */
			timeout : 10000
		},
		pool = [],
		hostnameReg = /^[a-z]{3,9}\:\/\/([^\/\?:#]+)/gim,
		oldCreateXHR;


	function init() {
		puredom.net.on('before:response', pool.reclaim);

		document.domain = location.hostname.match(/[^.]+\.[^.]+$/gim)[0];

		oldCreateXHR = puredom.net.createXHR;
		puredom.net.createXHR = createXHR;
	}


	pool.reclaim = function(frame) {
		frame = frame.request && frame.request._xdrFrame || frame;
		setTimeout(function() {
			pool.push(frame);
			frame = null;
		}, 100);
	};


	pool.get = function(hostname) {
		for (var i=0; i<pool.length; i++) {
			if (pool[i].getAttribute('data-xhr-domain')===hostname) {
				return pool.splice(i, 1)[0];
			}
		}
	};


	function createXHR(req, callback) {
		var hostname = req.url && getHostname(req.url),
			done, frame;
		
		if (!hostname) {
			return oldCreateXHR(req, callback);
		}

		done = function(xhr) {
			xhr._xdrFrame = frame;
			callback(xhr);
			req = callback = done = frame = hostname = null;
		};

		frame = pool.get(hostname);
		if (frame) {
			return oldCreateXHR(req, done, frame.contentWindow);
		}

		frame = document.createElement('iframe');
		frame.style.cssText = "position:absolute; left:0; top:-1000px; width:1px; height:1px; border:none; overflow:hidden;";
		frame.created = new Date().getTime();

		/** @inner */
		frame.onload = function() {
			var time = new Date().getTime(),
				timeout = exports.timeout || 10000,
				win, body;

			try {
				win = frame.contentWindow;
				body = win && win.document && win.document.domain===document.domain && win.document.body;
			} catch(err) {
				win = body = null;
			}

			// If we time out, dump the frame reference
			if ((time-frame.created)>timeout) {
				if (frame.parentNode) {
					frame.parentNode.removeChild(frame);
				}
				frame = null;
			}

			if (body && body.innerHTML || !frame) {
				frame.onload = frame.onerror = null;
				clearInterval(frame.timer);

				oldCreateXHR(req, done, win);
			}
		};
		frame.onerror = frame.onload;
		frame.timer = setInterval(frame.onload, 50);

		frame.setAttribute('src', location.protocol + '//'+hostname+'/' + (exports.htmlPage || 'xd_receiver').replace(/^\/+/g,''));
		frame.setAttribute('role', 'presentation');
		frame.setAttribute('tabindex', '-1');
		frame.setAttribute('data-xhr-domain', hostname);
		(document.body || document.createElement('body')).appendChild(frame);
	}


	function getHostname(url) {
		hostnameReg.lastIndex = 0;
		var hostname = domainReg.exec(url);
		return hostname && hostname[1] || false;
	}


	if (puredom.net) {
		init();
	}
	else {
		setTimeout(init, 1);
	}
	return exports;
}());