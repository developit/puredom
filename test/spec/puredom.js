describe('puredom', function() {
	it('should be a function', function() {
		expect(puredom).to.exist;
		expect(puredom).to.be.a.function;
	});

	it('should call puredom.el when invoked with a selector', function() {
		expect( puredom('body') ).to.be.an.instanceof( puredom.NodeSelection );
		expect( puredom('body') ).to.deep.equal( puredom.el('body') );
	});

	//it('should call puredom.createElement when invoked with HTML', function() {
	//	expect( puredom('<div>') ).to.deep.equal( new puredom.NodeSelection(puredom.createElement('<div>')) );
	//});

	it('should accept a function as a page ready handler', function() {
		function fn(){}
		puredom(fn);
		setTimeout(function() {
			expect(fn).to.have.been.called;
		}, 1);
	});

	it('should return a wrapped NodeSelection when passed a NodeSelection', function() {
		var nodes = puredom('body');
		expect( puredom(nodes) ).to.deep.equal( nodes );
	});
});


describe('puredom.el', function() {
	it('should be a function', function() {
		expect(puredom.el).to.be.a.function;
	});

	it('should return a NodeSelection', function() {
		expect( puredom.el('body') ).to.be.an.instanceof( puredom.NodeSelection );
	});

	it('should support "body"', function() {
		expect( puredom.el('body') ).to.deep.equal( new puredom.NodeSelection(document.body) );
	});

	it('should support "html"', function() {
		expect( puredom.el('html') ).to.deep.equal( new puredom.NodeSelection(document.documentElement) );
	});

	it('should return a wrapped NodeSelection when passed a NodeSelection', function() {
		var nodes = puredom.el('body');
		expect( puredom.el(nodes) ).to.deep.equal( nodes );
	});
});
