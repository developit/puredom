function Bench(name, tests, callback) {
	Benchmark.Suite.call(this);
	this.on('cycle', this._handleCycle);
	this.on('complete', this._handleComplete);

	this.name = name;

	if (tests) {
		this.setup = tests.setup;
		this.teardown = tests.teardown;
		_.forEach(tests, function(v, n) {
			if (n==='setup' || n==='teardown') return;
			this.add(n, v);
		}, this);
	}

	if (callback!==false) {
		var self = this;
		setTimeout(function() {
			self.run(callback);
			self = null;
		}, 1);
	}
}


Bench.prototype = _.create(Benchmark.Suite.prototype, {
	constructor : Bench,

	run : function(callback) {
		Benchmark.Suite.prototype.run.call(this, {
			name : this.name,
			async : true,
			setup : this.setup,
			teardown : this.teardown,
			onComplete : callback
		})
	},

	_handleCycle : function(e) {
		if (e.target.error) {
			throw(new Error(this.name + ' :: ' + String(e.target) + ' ' + e.target.error));
			return;
		}
		console.log(this.name + ' :: ' + String(e.target));
	},

	_handleComplete : function() {
		console.log(this.name + ' :: Fastest is ' + this.filter('fastest').pluck('name'));
	}
});


_.assign(Bench, {
	queue : [],

	create : function(name, tests, callback) {
		return new Bench(name, tests, callback);
	},

	enqueue : function(name, tests) {
		var bench = Bench.create(name, tests, false);
		Bench.queue.push(bench);
		return bench;
	},

	processQueue : function(callback) {
		var queue = Bench.queue.slice(),
			results = [],
			index = -1;
		callback = callback || _.noop;
		
		function next() {
			var cur = queue[++index];
			if (!cur) return callback(results);
			cur.run(done);
		}
		
		function done() {
			var result = {
				fastest : this.filter('fastest').pluck('name'),
				result : String(this)
			};
			results[index] = results[this.name || this.id] = result;
			setTimeout(next, 10);
		}

		next();
	}
});


setTimeout(Bench.processQueue, 50);