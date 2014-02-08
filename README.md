puredom
=======
*Current version:* **1.2.0**


---

What is Puredom?
================
puredom is a fast, chainable, extensible JavaScript library for web applications.

In plain english, it makes building developing rich apps using JavaScript, HTML and CSS much easier.


---

Documentation
=============
- For a list of functions you can call on a puredom selection see the simple [selector function list](http://puredom.org/selector-functions.html) (or [PDF](http://puredom.org/selector-functions.pdf)).  
- For class docs, check out the full [puredom documentation](http://puredom.org/docs/).  


---

Plugins
=======
puredom provides a plugin API for extending the core selection object, and for extending the CSS selector engine.

- [Available Plugins](http://puredom.org/plugins/)  
- [Plugin Documentation](#awww) - *not done yet :(*


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

puredom Light
-------------
>	- Puredom Core (selector engine, filters, events, all built-in selection functions)
>	- EventEmitter (add eventing to objects and classes)
>	- Cache (persistence with adapters)
>	- net (http/ajax/jsonp)
>	- date (parse & format)
>	- Utils:
>		- json
>		- xml
>		- text
>		- querystring
>		- cookies

**Download:** [puredom.light.js](http://puredom.org/download/latest/puredom.light.js)


puredom Full
------------
*Everything from the light version, plus:*  
>	- ControllerManager (work with controllers in an MVC configuration)
>	- RouteManager (Manage controllers based on URL patterns)
>	- ViewManager (Register, store, load and template HTML, or JSON views)
>	- FormHandler (Manage form population, submission and error handling)
>	- i18n (Internationalization & localization)
>	- NativeAPI (Dynamically create models for APIs using a simple JSON structure)
>	- Notifier (Show stylized notifications within the browser window)
>	- TestSuite (Run & automate asyncronous tests)

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
sudo npm install -g grunt-cli
sudo npm install -g jshint
```

**Build the library:**  
Just run grunt to build everything.  
```
grunt
```
Builds output to `dist/<VERSION>`  


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
**Version 1.2.0** *(Feb 2nd 2014)*
- Distribution for 1.2.0
- puredom 1.2.0: rewritten puredom.net and reorganized files.

**Version 1.1.9** *(Jan 3rd 2014)*
- Remove ridiculous blacklist of mobile devices for CSS3 transitions
- Add automatic vendor prefixing for transform, transition, perspective and box-sizing CSS properties
- Add support for passing HTML to the puredom() function to create a node.

**Version 1.1.8** *(Nov 15th 2013)*
- Fixed silly "getAnimationCound" error.
- Documentation, build & website fixes.
- Added `puredom.templateAttributeName` option, which defaults to `data-tpl-id`

**Version 1.1.7** *(Oct 8th 2013)*  
- Lint, build & website fixes.

**Version 1.1.6** *(Mar 3rd 2013)*  
- Make puredom.DOMEvent an actual class. Instance it and pass it to fireEvent for better insight into handler responses.

**Version 1.1.5** *(Feb 26th 2013)*  
- Accommodate null callback option for .css() [was throwing in Firefox]

**Version 1.1.4** *(Feb 25th 2013)*  
- Feature: .css() now accepts CSS strings. sel.css('left:5px','fast');
- Bugfix: CSS animation of -vendor-transform is correctly turned off after completion.


[![Bitdeli Badge](https://d2weczhvl823v0.cloudfront.net/developit/puredom/trend.png)](https://bitdeli.com/free "Bitdeli Badge")

