window.doc = window.doc || {};
window.mobileScroll_showBars = false;

puredom(function() {
	doc.controller.init();
});



doc.controller = (function() {
	var exports = {},
		priv = {
			replaceNonNames : /([^\w\._@-]|[\r\n\s])/gim,
			md : {}
		};
	
	priv.mush = function(s) {
		return s && (priv.md[s] || (priv.md[s]=s.toLowerCase().replace(priv.replaceNonNames,''))) || '';
	};
	
	priv.contains = function(a, b) {
		return !!(a && b && priv.mush(a).indexOf(priv.mush(b))>=0);
	};
	
	priv.updateFilter = function() {
		exports.filterClasses(priv.filter);
	};
	
	priv.getItems = function() {
		if (!priv.items) {
			priv.items = puredom.el('#ClassList li, #ClassList2 li, #FileList li, #MethodsList li, #MethodsListInherited dd>a');
			priv.items.css({position:'relative',overflow:'hidden'}).each(function(item) {
				var h = item.height();
				item.height(h);
				item.attr('data-h', h);
			});
		}
		return priv.items;
	};
	
	priv.updateFromUrl = function() {
		var href = location.href,
			j = href.indexOf('#');
		if (j>=0) {
			priv.goToAnchor(href.substring(j+1), false);
		}
		else if (priv.currentUrl.indexOf('#')>=0) {
			priv.goToAnchor('top', false);
		}
	};
	
	priv.goToAnchor = function(anchor, updateUrl) {
		var c, target, top, max, t, p, newAnchor;
		c = puredom('.content');
		anchor = anchor || 'top';
		newAnchor = anchor==='top' ? '' : ('#'+anchor);
		target = puredom('a[name="'+anchor+'"], [id="'+anchor+'"]').first();
		if (target && target.exists()) {
			top = 0;
			t = target;
			do {
				p = t.getStyle('position');
				//console.log(t+'', p, t.y(), t.getStyle('margin-top'), Math.round((t.getStyle('margin-top') || '').replace(/[^0-9\.\-]/gim,'') || 0));
				if (t===target || p==='relative' || p==='absolute' || p==='fixed') {
					//top += Math.round(t.y() || 0) + Math.round((t.getStyle('margin-top') || '').replace(/[^0-9\.\-]/gim,'') || 0);
					top += Math.round(t.y() || 0);
					//if (p==='fixed') {
					//	break;
					//}
				}
			} while((t=t.parent()) && t.nodeName()!=='body');
			max = (c.prop('scrollHeight') || (c.children().sumOf('height') + Math.round(c.lastChild().getStyle('margin-bottom').replace(/[^0-9\.\-]/gim,'') || 0))) - c.height();
			/*
			top = Math.max(0, Math.min(top, max));
			*/
			c.children().css({position:'relative',top:'0px'}).css({
				top : -top + 'px'
			}, {tween:'fast', callback:function(n) {
				c.scrollTop(top);
				n.css({
					top : '0px'
				});
				if (updateUrl!==false) {
					if (history.pushState) {
						history.pushState(null, document.title, (/^[a-z0-9]*\:\/\/[^\/]+(\/[^\#]*)/gim).exec(location.href)[1] + newAnchor);
					}
					else {
						location.href = '#';
					}
				}
				priv.currentUrl = location.href;
				c.scrollTop(top);
			}});
		}
	};
	
	priv.resized = function() {
		var index	= puredom('.index').first(),
			winW	= window.innerWidth || (document.documentElement || document.body).offsetWidth,
			winH	= index.height(),
			left	= index.width({margin:true,padding:true,border:true}),
			top		= puredom('h2.heading1').height();
		puredom('.content').css({
			left	: left + 'px',
			width	: (winW-left) + 'px'
		});
		index.query('nav').css({
			top		: top + 'px',
			height	: (winH-top) + 'px'
		});
	};
	
	priv.highlightSource = (function(){
		var v, p=[], i, x, s;
		s = function(c,r){
			return '<span style="color:#'+c+';">'+(r||'$1')+'</span>'
		};
		x = [
			/&/g,'&amp;',
			/</g,'&lt;',
			/>/g,'&gt;',
			/\\./g,function(m){return 'r'+p.push(m)+'>'},
			/([\[({=:+,]\s*)\/(?![\/\*])/g,'$1<h/',
			/(\/\*[\s|\S]*?\*\/|\/\/.*)|(<h\/.+?\/\w*)|".*?"|'.*?'/g,function(m,c,x){return 'r'+p.push(s(c?'444':x?'8F0':'F71',m))+'>'},
			/((&\w+;|[-\/+*=?:.,;()\[\]{}|%^!])+)/g,s('07C'),
			/\b(break|case|catch|continue|default|delete|do|else|false|finally|for|function|if|in|instanceof|new|return|switch|this|throw|true|try|typeof|var|void|while|with)\b/gi,s('D0F'),
			/\b(0x[\da-f]+|\d+)\b/g,s('F00'),
			/r(\d+)>/g,function(m,n){return p[n-1].replace(x[18],x[19])},
			/<h/g,''
		];
		return function(source) {
			v = source;
			for (i=0;i<x.length+2;) {
				v = v.replace(x[i++],x[i++]);
			}
			return v;
		};
	}());
	
	exports.filterClasses = function(filter) {
		var items = priv.getItems();
		items.each(function(item) {
			var text = item.text(),
				ha = Math.round(item.attr('data-h'));
			if (!filter || !text || priv.contains(text, filter)) {
				item.css({ opacity:1, left:'0%', height:ha+'px' }, {tween:150});
			}
			else {
				item.css({ opacity:0.5, left:'-15%', height:'0px' }, {tween:150});
			}
		});
	};
	
	exports.init = function() {
		var page = document.title.split(' ')[0];
		if (page) {
			puredom(".menu nav li a").each(function(item) {
				var t = priv.mush(item.text());
				if (t===priv.mush(page)) {
					item.parent().classify('current');
				}
				else if (t==='_global_') {
					item.parent().destroy();
				}
			});
		}
		
		var top = puredom({
			type : 'a',
			attributes : {
				id : 'top',
				name : 'top'
			},
			insertBefore : puredom('.content>.innerContent').firstChild()
		});
		
		priv.currentUrl = location.href;
		priv.urlPoller = setInterval(function() {
			var href = location.href;
			if (href!==priv.currentUrl) {
				priv.updateFromUrl();
			}
		}, 200);
		puredom.addEvent(history, 'popstate', priv.updateFromUrl);
		puredom.addEvent(window, 'hashchange', priv.updateFromUrl);
		
		puredom('body').on('click', function(e) {
			var t=e.target, a, href, c, j, winurl, target, top, max, resolvedHref;
			winurl = location.href.replace(/#.*$/gim,'');
			do {
				if ((t.nodeName+'').toLowerCase()==='a' && t.getAttribute('href')) {
					a = t;
					break;
				}
			} while((t=t.parentNode) && t!==document.body);
			if (a) {
				href = a.getAttribute('href');
				resolvedHref = a.href;
				c = puredom('.content');
				j = href.indexOf('#');
				if (j>=0 && resolvedHref.replace(/#.*$/gim,'')===winurl) {
					priv.goToAnchor(href.substring(j+1));
					return e.cancel();
				}
			}
		});
		
		puredom('#ClassFilter').on('keyup,change', function() {
			priv.filter = this.value;
			if (priv.filterUpdateTimer) {
				clearTimeout(priv.filterUpdateTimer);
			}
			priv.filterUpdateTimer = setTimeout(priv.updateFilter, 160);
		});
		exports.filterClasses(puredom.el('#ClassFilter').value() || '');
		
		puredom("pre,code,div.fixedFont").each(function(c) {
			var text = c.text(),
				html = c.html(),
				m = html.match(/^\t+/gim),
				tabs = m && m[0] && m[0].replace(/\t/gm,'\\t');
			if (tabs) {
				html = html.replace(new RegExp('(\r?\n|^)'+tabs,'gim'), '$1');
				c.html(html);
			}
			text = text.replace(/^(?:\s|\r|\n)*(.*?)(?:\s|\r|\n)*$/gim,'$1');
			if (!c.hasClass('nomultiline') && text.split('\n').length>1) {
				c.classify('multiline');
			}
		});
		
		puredom("pre.code").each(function(pre) {
			/*
			var text = pre.text(),
				tabs = text.match(/^\t+/gim)[0].replace(/\t/gm,'\\t');
			text = text.replace(new RegExp('(\r?\n|^)'+tabs,'gim'), '$1');
			pre.html(priv.highlightSource(text));
			*/
			pre.html(priv.highlightSource(pre.text()));
		});
		
		puredom('.indexLinks>a').each(function(n) {
			var u = (n.attr('href').match(/[^\/]+$/gim) || [])[0],
				g = (location.href.match(/[^\/]+$/gim) || [])[0];
			if (u && g) {
				n.classify(u===g ? 'current' : 'noncurrent');
			}
		})
		
		puredom.addEvent(window, 'resize', priv.resized);
		priv.resized();
	};
	
	return exports;
}());




