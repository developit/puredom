window.doc = window.doc || {};

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
			left	= index.width({margin:true,padding:true,border:false}),
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
			/(\/\*[\s|\S]*?\*\/|\/\/.*)|(<h\/.+?\/\w*)|".*?"|'.*?'/g,function(m,c,x){return 'r'+p.push(s(c?'889':x?'8F0':'F71',m))+'>'},
			/((&\w+;|[-\/+*=?:.,;()\[\]{}|%^!])+)/g,s('09F'),
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
			var text = item.attr('data-name') || item.text(),
				ha = Math.round(item.attr('data-h'));
			if (!filter || !text || priv.contains(text, filter)) {
				item.css({ opacity:1, left:'0%', height:ha+'px' }, {tween:150});
			}
			else {
				item.css({ opacity:0.5, left:'-15%', height:'0px' }, {tween:150});
			}
		});
	};
	
	priv.onPageLoad = function() {
		var page = document.title.split(' ')[0];
		priv.currentPage = page;
		
		if (page) {
			
			// Update the Classes/Files nav to show current top-level state
			var filesSection = !!location.href.match(/\/(files\.html|symbols\/src\/.*)$/gim);
			puredom('.indexLinks a').each(function(a) {
				var f = a.text()==='Files';
				a.classify(f===filesSection?'current':'noncurrent');
				a.declassify(f===filesSection?'noncurrent':'current');
			});
			
			// Update the class menu to expand/collapse items based on heirarchy
			puredom(".menu nav li a").each(function(item) {
				var breakCount = item.query('span.break').count(),
					dent = Math.round(item.attr('data-indent')) || breakCount,
					name = item.attr('data-name') || item.text(),
					parent = item.attr('data-parent-name'),
					cur = priv.mush(priv.currentPage),
					t = priv.mush(name),
					pt = priv.mush(parent);
				
				if (breakCount) {
					var basename = item.text().replace(/^.+\.\s*/g,'');
					item.attr('data-name', name);
					item.html('<span style="opacity:0.35;">↳</span> '+puredom.text.htmlEntities(basename));
					/*
					item.text('').appendChild(
						puredom({
							type : 'span',
							html : '↳',
							css : 'opacity:0.5;'
						})
					).appendChild(
						puredom({
							type : 'span',
							text : basename
						})
					);
					*/
					item.css({
						'text-indent' : (breakCount-1)*10 + 'px'
					});
				}
				
				var show = dent<2 || cur.substring(0, t.length)===t || cur.substring(0, pt.length)===pt,
					hidden = show?'false':'true';
				if (item.attr('hidden')!==hidden) {
					item.attr('hidden', hidden);
					item.parent().css({
						height : (show ? item.height({margin:false,padding:true,border:false}) : 0) + 'px',
						opacity : show ? 1 : 0
					}, {tween:100});
				}
				
				if (t===cur) {
					item.parent().classify('current');
				}
				else {
					item.parent().declassify('current');
					if (t==='_global_') {
						item.parent().destroy();
					}
				}
			});
			
			// Add a link to the top of the page
			var top = puredom({
				type : 'a',
				attributes : {
					id : 'top',
					name : 'top'
				},
				insertBefore : puredom('.content>.innerContent').firstChild()
			});
			
		}
		
		
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
	};
	
	
	
	
	priv.loadPage = function(url, options) {
		var pageUrl,
			b = priv.urlBase.replace(/^\//,'');
		options = options || {};
		
		url = url.replace(/^(https|http)\:\/\/[^\/]+/gim,'').replace(/^\//,'');
		
		url = url.replace(/^\.\.\//gm,'');
		
		if (b.length>0 && url.substring(0,b.length)===b) {
			url = '/' + url;
		}
		else {
			url = priv.urlBase + url;
		}
		pageUrl = url.replace(/#.+/gim,'');
		
		if (pageUrl===priv.currentUrl.replace(/#.+/gim,'')) {
			return false;
		}
		
		puredom.net.get(pageUrl, function(success, data) {
			var doc = HTMLParser.parse(data),
				puredoc = puredom(doc),
				html = puredoc.query('div.content').first().html() || puredoc.query('body').first()	.html();
			
			if (options.pushState!==false) {
				history.pushState(null, document.title, url);
			}
			document.title = puredoc.query('title').first().html();
			
			/*
			var styles = puredom('head style');
			puredoc.query('head style').each(function(style) {
				var text = style.text() || style.html(),
					found = false,
					g;
				styles.each(function(s) {
					var t = s.text() || s.html();
					if (t===text) {
						found = true;
						return false;
					}
				});
				if (!found) {
					g = puredom.el({
						type : 'style',
						attributes : {
							rel : 'stylesheet',
							type : 'text/css'
						},
						html : text
					}, puredom('head'));
					if (!g.html()) {
						g._nodes[0].appendChild(document.createTextNode(text));
					}
					if (g._nodes[0].stylesheet) {
						g._nodes[0].stylesheet.cssText = text;
					}
				}
			});
			*/
			
			//puredom('div.content').hide().html(html).fadeIn('fast');
			
			puredom('div.content').first().fadeOut(100, function(c) {
				c.html(html);
				priv.onPageLoad();
				c.wait(100, function() {
					c.query('>pre').classify('sourceViewBase');
					this.fadeIn(100);
					html = puredoc = c = null;
				});
			}, false);
		}, {
			contentTypeOverride : 'text/plain'
		});
	};
	
	exports.init = function() {
		
		priv.urlBase = (location.href.substring(0,location.href.lastIndexOf('/')) || '') + '/' + (puredom('body').attr('data-url-base') || '');
		priv.urlBase = priv.urlBase.replace(/[^\/]+\/\.\./gim,'').replace(/^(https|http)\:\/\/[^\/]+/gim,'').replace(/\/+$/,'') + '/';
		
		priv.onPageLoad();
		
		setTimeout(function() {
			puredom.addEvent(window, 'popState', function() {
				priv.loadPage(location.href, { pushState:false });
			});
		}, 100);
		
		
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
				else {
					priv.loadPage(href);
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













/** HTML DOM parser.
 *	@class
 */
var HTMLParser = (function() {
		/**	@lends exports as HTMLParser# */
	var exports = {},
		util = {},
		splitAttrsTokenizer = /([a-z0-9_\:\-]*)\s*?=\s*?(['"]?)(.*?)\2\s+/gim,
		domParserTokenizer = /<(\/?)([a-z][a-z0-9\:]*)(?:\s([^>]*?))?((?:\s*\/)?)>/gim,
		splitAttrs;
	
	util.extend = function(a, b) {
		for (var x in b) {
			if (b.hasOwnProperty(x)) {
				a[x] = b[x];
			}
		}
		return a;
	};
	
	util.selfClosingTags = {img:1, meta:1, link:1, base:1};
		
	util.getElementsByTagName = function(el, tag) {
		var els=[], c=0, i, n, j;
		if (!tag) {
			tag = '*';
		}
		tag = tag.toLowerCase();
		for (i=0; i<el.childNodes.length; i++) {
			n = el.childNodes[i];
			if (tag==='*' || n.nodeName===tag) {
				els[c++] = n;
			}
			Array.prototype.splice.apply(els, [els.length, 0].concat(util.getElementsByTagName(n, tag)));
			c = els.length;
		}
		return els;
	};
	
	util.splitAttrs = function(str) {
		var obj={}, token;
		if (str) {
			splitAttrsTokenizer.lastIndex = 0;
			//str = ' ' + (str+'').replace(/^\s*(.*?)\s*$/gim,'$1') + ' ';
			str = ' '+(str || '')+' ';
			while (token=splitAttrsTokenizer.exec(str)) {
				obj[token[1]] = token[3];
			}
		}
		return obj;
	};
	
	
	function HTMLElement() {
		this.nodeType = 1;
		this.childNodes = [];
	};
	util.extend(HTMLElement.prototype, {
		getElementsByTagName : function(tag) {
			return util.getElementsByTagName(this, tag);
		}
	});
	
	exports.HTMLElement = HTMLElement;
	
	
	/** Parse a string of HTML into an HTML DOM.
	 *	@param {String} str		A string containing HTML
	 */
	exports.parse = function(str) {
		var tags, doc, parent, content, token, tag;
		tags = [];
		domParserTokenizer.lastIndex = 0;
		
		parent = doc = util.extend(new HTMLElement(), {
			nodeName : '#document'
		});
		
		while (token=domParserTokenizer.exec(str)) {
			//console.log(token);
			if (token[1]!=='/') {
				tag = util.extend(new HTMLElement(), {
					nodeName : (token[2]+'').toLowerCase(),
					attributes : util.splitAttrs(token[3]),
					parentNode : parent,
					documentPosition : {
						openTag : {
							start : domParserTokenizer.lastIndex - token[0].length,
							end : domParserTokenizer.lastIndex
						}
					}
				});
				tag.className = tag.attributes['class'];
				tags.push(tag);
				tag.parentNode.childNodes.push(tag);
				if ((token[4] && token[4].indexOf('/')>-1) || util.selfClosingTags.hasOwnProperty(tag.nodeName)) {
					tag.documentPosition.closeTag = tag.documentPosition.openTag;
					tag.isSelfClosingTag = true;
					tag.innerHTML = '';
					tag.outerHTML = str.substring(tag.documentPosition.openTag.start, tag.documentPosition.closeTag.end);
				}
				else {
					parent = tag;
				}
			}
			else {
				if ((token[2]+'').toLowerCase()===parent.nodeName) {
					tag = parent;
					parent = tag.parentNode;
					//parent = parent.parentNode;
					//tag = tags.pop();
					delete tag.isSelfClosingTag;
					tag.documentPosition.closeTag = {
						start : domParserTokenizer.lastIndex - token[0].length,
						end : domParserTokenizer.lastIndex
					};
					tag.innerHTML = str.substring(tag.documentPosition.openTag.end, tag.documentPosition.closeTag.start);
					tag.outerHTML = str.substring(tag.documentPosition.openTag.start, tag.documentPosition.closeTag.end);
				}
				else {
					console.warn('tag mismatch: ', token[2], ' vs ', tag.nodeName, tag);
				}
			}
		}
		return doc;
	};
	
	return exports;
}());