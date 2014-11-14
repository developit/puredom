var express = require('express'),
	compress = require('compression'),
	serveStatic = require('serve-static'),
	app = express(),
	port = process.env.PORT || 8080;

app.use(compress());

app.use(function(req, res, next) {
	if (req.path==='/docs/') {
		return res.redirect('/docs/symbols/puredom.html');
	}
	next();
});

app.use(serveStatic('website'));
app.use('/docs', serveStatic('docs'));
app.use('/dist', serveStatic('dist'));
app.use('/src', serveStatic('src'));
app.use('/test', serveStatic('test'));

app.listen(port, function() {
	console.log('Server listening on localhost:'+port);
});
