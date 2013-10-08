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
					'src/puredom-utils.js',
					'src/puredom-eventemitter.js',
					'src/puredom-controllermanager.js',
					'src/puredom-localstorage.js',
					'src/**/*.js'
				],
				dest: 'dist/<%= pkg.version %>/<%= pkg.name %>.js'
			},
			light : {
				src: [
					'src/puredom.js',
					'src/puredom-utils.js',
					'src/puredom-eventemitter.js',
					'src/puredom-date.js',
					'src/puredom-eventemitter.js',
					'src/puredom-net.js',
					'src/puredom-localstorage.js',
					'src/localstorage-adapters/cookie-adapter.js',
					'src/localstorage-adapters/localstorage-adapter.js',
					'src/localstorage-adapters/userdata-adapter.js'
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
				'src/puredom-utils.js',
				'src/puredom-eventemitter.js',
				'src/puredom-controllermanager.js',
				'src/puredom-localstorage.js',
				'src/**/*.js'
			],
			afterconcat: [
				'<%= concat.full.dest %>'
			]
		}
	});

	grunt.loadNpmTasks('grunt-contrib-uglify');
	grunt.loadNpmTasks('grunt-contrib-concat');
	grunt.loadNpmTasks('grunt-contrib-jshint');

	grunt.registerTask('default', [
		'jshint:beforeconcat',
		'concat:light',
		'uglify:light',
		'concat:full',
		'uglify:full'
		//,'jshint:afterconcat'
	]);
	
};