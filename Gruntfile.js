module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		concat: {
			options: {
				separator: '\n'
			},
			full : {
				src: [
					'src/puredom.js',
					'src/puredom/selector-engine.js',
					'src/puredom/utils.js',
					'src/puredom/EventEmitter.js',
					'src/puredom/ControllerManager.js',
					'src/puredom/LocalStorage.js',
					'src/puredom/*.js',
					'!src/puredom/TestSuite.js',
					'!src/puredom/NativeAPI.js',
					'src/puredom/LocalStorage/*.js',
					'src/puredom/net/jsonp.js'
				],
				dest: 'dist/<%= pkg.name %>.js'
			},
			light : {
				src: [
					'src/puredom.js',
					'src/puredom/selector-engine.js',
					'src/puredom/utils.js',
					'src/puredom/EventEmitter.js',
					'src/puredom/date.js',
					'src/puredom/net.js',
					'src/puredom/net/jsonp.js',
					'src/puredom/LocalStorage.js',
					'src/puredom/LocalStorage/*.js',
					'!src/puredom/LocalStorage/WebSQLAdapter.js'
				],
				dest: 'dist/<%= pkg.name %>.light.js'
			}
		},


		uglify: {
			full : {
				options: {
					banner: '/*! <%= pkg.name %> <%= pkg.version %> */\n'
				},
				files: {
					'dist/<%= pkg.name %>.min.js': ['<%= concat.full.dest %>']
				}
			},
			light : {
				options: {
					banner: '/*! <%= pkg.name %> light <%= pkg.version %> */\n'
				},
				files: {
					'dist/<%= pkg.name %>.light.min.js': ['<%= concat.light.dest %>']
				}
			}
		},


		jshint : {
			options : {
				browser : true,
				ignores: [
				]
			},
			beforeconcat : [
				'src/puredom.js',
				'src/puredom/utils.js',
				'src/puredom/EventEmitter.js',
				'src/puredom/ControllerManager.js',
				'src/puredom/LocalStorage.js',
				'src/puredom/*.js',
				'src/puredom/LocalStorage/*.js',
				'src/puredom/net/jsonp.js'
			],
			afterconcat: [
				'<%= concat.full.dest %>'
			],
			test: {
				options : {
					'-W030' : true
				},
				src : [
					'test/**/*.js',
					'!test/js/**/*.js'
				]
			}
		},


		connect : {
			test : {
				options : {
					port : 9091,
					base : '.'
				}
			}
		},

		/*
		qunit : {
			all : {
				options : {
					urls : [
						'http://localhost:9091/'
					]
				}
			}
		},
		*/


		mocha : {
			test : {
				options : {
					run : true,
					reporter : 'Spec',
					mocha : {
						// grep : 'foo.*'
					},
					urls : [
						'http://localhost:9091/test/index.html'
					]
				}
			}
		},


		shell : {
			jsdoc : {
				options : {
					stdout : true
				},
				command : 'node node_modules/jsdoc2/app/run.js -c=jsdoc/jsdoc.conf'
			},

			compress : {
				options : {
					stdout : true
				},
				command : [
					'gzip -9 -f -c "<%= concat.full.dest %>" > "<%= concat.full.dest %>.gz"',
					'gzip -9 -f -c "<%= concat.light.dest %>" > "<%= concat.light.dest %>.gz"',
					'zip -9 "dist/<%= pkg.name %>.zip" "<%= concat.full.dest %>"',
					'zip -9 "dist/<%= pkg.name %>.light.zip" "<%= concat.light.dest %>"'
				].join(';')
			}
		},


		watch : {
			src : {
				files : [
					'src/**/*.js'
				],
				tasks : ['default'],
				options : {
					interrupt : true
				}
			},
			test : {
				files : 'test/**/*',
				tasks : ['test'],
				options : {
					interrupt : true
				}
			}
		}

	});


	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-shell');
	grunt.loadNpmTasks('grunt-contrib-connect');
	grunt.loadNpmTasks('grunt-mocha');
	grunt.loadNpmTasks('grunt-contrib-watch');


	grunt.registerTask('default', [
		'jshint:beforeconcat',
		'concat:light',
		'uglify:light',
		'concat:full',
		'uglify:full',
		'docs'
	]);


	grunt.registerTask('docs', [
		'shell:jsdoc'
	]);


	grunt.registerTask('test', [
		'jshint:test',
		'connect:test',
		'mocha:test'
	]);


	grunt.registerTask('benchmark', 'Run benchmarks in phantomjs.', function() {
		var phantom = require('grunt-lib-phantomjs').init(grunt),
			done = this.async();

		phantom.on('error.onError', function(msg, trace) {
			grunt.log.error('Error: ' + msg + '\n' + trace);
		});

		phantom.on('fail.load', function(url) {
			grunt.log.error('Failed to load URL: ' + url);
		});

		phantom.on('console', function(msg) {
			grunt.log.writeLn(String(msg));
		});

		phantom.spawn('http://localhost:9091/test/bench/selectors.html', {
			options : {},
			done : function() {
				done(err)
			}
		});
	});

};
