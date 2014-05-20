puredom
=======
*Current version:* **1.2.6**  
[![Master Build Status](https://travis-ci.org/developit/puredom.png?branch=master)](https://travis-ci.org/developit/puredom)
[![Dependency Status](https://david-dm.org/developit/puredom.png?theme=shields.io)](https://david-dm.org/developit/puredom)
[![devDependency Status](https://david-dm.org/developit/puredom/dev-status.png?theme=shields.io)](https://david-dm.org/developit/puredom#info=devDependencies)
[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/developit/puredom/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

develop: [![Build Status](https://travis-ci.org/developit/puredom.png?branch=develop)](https://travis-ci.org/developit/puredom)  



---

What is Puredom?
================
puredom is a fast, chainable, extensible JavaScript library for web applications.

In plain english, it makes building developing rich apps using JavaScript, HTML and CSS much easier.


---

Installation via Package Managers
=================================
**Bower:**  
`bower install puredom`


**Component:**  
`component install developit/puredom`


---

Documentation
=============
- For a list of functions you can call on a puredom selection see the simple [selector function list](http://puredom.org/docs/symbols/puredom.NodeSelection.html).  
- For class docs, check out the full [puredom documentation](http://puredom.org/docs/).  


---

Plugins
=======
puredom provides a plugin API for extending the core selection object, and for extending the CSS selector engine.

- [Available Plugins](http://puredom.org/plugins/)  
- [Plugin Documentation](http://puredom.org/building-plugins/)  


Example NodeSelection Plugin
----------------------------
Selector Engine plugins extend the CSS selector syntax with new functionality.  
```JavaScript
// Add a new :log() filter
puredom.addNodeSelectionPlugin(
	"someFunctionName",				// gets pinned to every selection
	function(args){
		// <this> is the NodeSelection
		// arguments passed to the function are passed on to your plugin
	}
);

// Use it
puredom(".foo").someFunctionName();	// call your plugin method
```


Example Selector Engine Plugin
------------------------------
Selector Engine plugins extend the CSS selector syntax with new functionality.  
```JavaScript
// Add a new :log() filter
puredom.selectorEngine.addSelectorFilter(
	/^\:log\(\)/gim,		// regex to match your rule (similar to a route)
	function(matches, nodes, config){
		console.log(nodes);
		// Returning an Array here overwrites the selection.
		// To mutate the selection, operate directly on <nodes>.
	}
);

// Use it
puredom(".foo .bar:log()>div");	// logs the collection's contents at the given position
```

---

Download
========
Download a pre-built copy of the puredom light or full libraries.

puredom - Light Version
-----------------------
>	**[Core](http://puredom.org/docs/symbols/puredom.html)**  
>	*Selector engine, filters, events, [NodeSelection](http://puredom.org/docs/symbols/puredom.NodeSelection.html)*  
>	
>	**[EventEmitter](http://puredom.org/docs/symbols/puredom.EventEmitter.html)**  
>	*Add event support to objects and classes*  
>	
>	**[LocalStorage](http://puredom.org/docs/symbols/puredom.LocalStorage.html)**  
>	*Persistent client-side stroage with adapters*  
>	
>	**[net](http://puredom.org/docs/symbols/puredom.net.html)**  
>	*HTTP communication (AJAX and JSONP)*  
>	
>	**[date](http://puredom.org/docs/symbols/puredom.date.html)**  
>	*Parse and format time and date*  
>	
>	**Formats**  
>	*Work with [JSON](http://puredom.org/docs/symbols/puredom.json.html), [XML](http://puredom.org/docs/symbols/puredom.xml.html), [querystrings](http://puredom.org/docs/symbols/puredom.querystring.html),
>	[text](http://puredom.org/docs/symbols/puredom.text.html) and [cookies](http://puredom.org/docs/symbols/puredom.cookies.html)*  

**Download:** [puredom.light.js](http://puredom.org/download/latest/puredom.light.js)


puredom - Full Version
----------------------
Includes everything from the light version, plus:

>	**ControllerManager**  
>	*Work with controllers in an MVC configuration*  
>	
>	**RouteManager**  
>	*Manage controllers based on URL patterns*  
>	
>	**ViewManager**  
>	*Register, store, load and template HTML, or JSON views*  
>	
>	**FormHandler**  
>	*Manage form population, submission and error handling*  
>	
>	**i18n**  
>	*Internationalization & localization*  
>	
>	**Notifier**  
>	*Show stylized notifications within the browser window*  
>	
>	**NativeAPI** *(deprecated)*  
>	*Dynamically create models for APIs using a simple JSON structure*  
>	*For an alternative, try [puredom.model](http://github.com/developit/puredom.model) or [puredom.rest](http://github.com/developit/puredom.rest)*  
>	
>	**TestSuite** *(deprecated)*  
>	*Run & automate asynchronous tests*  

**Download:** [puredom.js](http://puredom.org/download/latest/puredom.js)


---

Building
========
Puredom is built using Grunt.  
Both the full and light versions are built at the same time, as light is just a subset of the full library.  

**Install Dependencies:**  
```
npm install
```

**Install the Grunt CLI and JSHint:**  
If you haven't already, install grunt-cli and jshint globally  
```
sudo npm install -g grunt-cli jshint
```

**Build the library:**  
Just run grunt to build everything.  
```
grunt
```
Builds output to `dist/`  


---

License
=======
**puredom is released under a BSD-3-Clause License.**

>	Copyright (c) Socialseek Inc. All rights reserved.
>	
>	Redistribution and use in source and binary forms, with or without modification, 
>	are permitted provided that the following conditions are met:  
>	*	Redistributions of source code must retain the above copyright notice, 
>		this list of conditions and the following disclaimer.  
>	*	Redistributions in binary form must reproduce the above copyright notice, 
>		this list of conditions and the following disclaimer in the documentation 
>		and/or other materials provided with the distribution.  
>	*	Neither the name of Socialseek Inc. nor the names of its contributors may be used to endorse 
>		or promote products derived from this software without specific prior written permission.  
>	THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS 
>	OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY 
>	AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER 
>	OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL 
>	DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, 
>	DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER 
>	IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY 
>	OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.


---

Changelog
=========
**Version 1.2.6** *(May 18, 2014)*  
- Fix puredom.mixin() regression introduced in version 1.2.1
- Added support for alternative "decorator-first" mixin() syntax

**Version 1.2.5** *(May 17, 2014)*  
- Add Bower & Component support

**Version 1.2.4** *(Apr 8, 2014)*  
- Account for encoding specified in a Content-Type response header  

**Version 1.2.3** *(Apr 8, 2014)*  
- Fix exception thrown from net.request()  
- Passing undefined or null for a header value will now delete the header if it exists  

**Version 1.2.2** *(Feb 23, 2014)*  
- Refactored `EventEmitter` module.  
- Fixed issue with textual HTTP responses.  

**Version 1.2.1** *(Feb 9, 2014)*  
- Performance improvements for selectors & selections.  

**Version 1.2.0** *(Feb 2, 2014)*  
- Distribution for 1.2.0  
- puredom 1.2.0: rewritten puredom.net and reorganized files.  

**Version 1.1.9** *(Jan 3, 2014)*  
- Remove ridiculous blacklist of mobile devices for CSS3 transitions  
- Add automatic vendor prefixing for transform, transition, perspective and box-sizing CSS properties  
- Add support for passing HTML to the puredom() function to create a node.  

**Version 1.1.8** *(Nov 15, 2013)*  
- Fixed silly "getAnimationCound" error.  
- Documentation, build & website fixes.  
- Added `puredom.templateAttributeName` option, which defaults to `data-tpl-id`  

**Version 1.1.7** *(Oct 8, 2013)*  
- Lint, build & website fixes.  

**Version 1.1.6** *(Mar 3, 2013)*  
- Make puredom.DOMEvent an actual class. Instance it and pass it to fireEvent for better insight into handler responses.  

**Version 1.1.5** *(Feb 26, 2013)*  
- Accommodate null callback option for .css() [was throwing in Firefox]  

**Version 1.1.4** *(Feb 25, 2013)*  
- Feature: .css() now accepts CSS strings. sel.css('left:5px','fast');  
- Bugfix: CSS animation of -vendor-transform is correctly turned off after completion.  