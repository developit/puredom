module.exports = function(grunt) {

	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		concat: {
			options: {
				separator: '\n'
			},
			full : {
				src: [
					'src/json2.js',
					'src/puredom.js',
					'src/puredom/utils.js',
					'src/puredom/EventEmitter.js',
					'src/puredom/ControllerManager.js',
					'src/puredom/LocalStorage.js',
					'src/puredom/*.js',
					'src/puredom/LocalStorage/*.js',
					'src/puredom/net/jsonp.js'
				],
				dest: 'dist/<%= pkg.version %>/<%= pkg.name %>.js'
			},
			light : {
				src: [
					'src/puredom.js',
					'src/puredom/utils.js',
					'src/puredom/EventEmitter.js',
					'src/puredom/date.js',
					'src/puredom/net.js',
					'src/puredom/net/jsonp.js',
					'src/puredom/LocalStorage.js',
					'src/puredom/LocalStorage/CookieAdapter.js',
					'src/puredom/LocalStorage/LocalStorageAdapter.js',
					'src/puredom/LocalStorage/UserDataAdapter.js'
				],
				dest: 'dist/<%= pkg.version %>/<%= pkg.name %>.light.js'
			}
		},


		uglify: {
			full : {
				options: {
					banner: '/*! <%= pkg.name %> <%= grunt.template.today("dd-mm-yyyy") %> */\n'
				},
				files: {
					'dist/<%= pkg.version %>/<%= pkg.name %>.min.js': ['<%= concat.full.dest %>']
				}
			},
			light : {
				options: {
					banner: '/*! <%= pkg.name %> light <%= grunt.template.today("dd-mm-yyyy") %> */\n'
				},
				files: {
					'dist/<%= pkg.version %>/<%= pkg.name %>.light.min.js': ['<%= concat.light.dest %>']
				}
			}
		},


		jshint : {
			options : {
				browser : true,
				ignores: [
					'src/json2.js'
				]
			},
			beforeconcat : [
				'src/puredom.js',
				'src/utils.js',
				'src/EventEmitter.js',
				'src/Controllermanager.js',
				'src/LocalStorage.js',
				'src/**/*.js'
			],
			afterconcat: [
				'<%= concat.full.dest %>'
			]
		},


		shell : {
			compress : {
				options : {
					stdout : true
				},
				command : [
					'gzip -9 -f -c "<%= concat.full.dest %>" > "<%= concat.full.dest %>.gz"',
					'gzip -9 -f -c "<%= concat.light.dest %>" > "<%= concat.light.dest %>.gz"',
					'zip -9 "dist/<%= pkg.version %>/<%= pkg.name %>.zip" "<%= concat.full.dest %>"',
					'zip -9 "dist/<%= pkg.version %>/<%= pkg.name %>.light.zip" "<%= concat.light.dest %>"'
				].join(';')
			}
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');
	grunt.loadNpmTasks('grunt-shell');

	grunt.registerTask('default', [
		'jshint:beforeconcat',
		'concat:light',
		'uglify:light',
		'concat:full',
		'uglify:full',
		'shell:compress'
	]);
	
};