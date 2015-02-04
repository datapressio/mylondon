module.exports = function(grunt){
  // Official DataPress Gruntfile Structure v1.0
  debug = true;
  prefix = "mylondon-";

  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-imagemin');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-coffee');
  grunt.loadNpmTasks('grunt-contrib-less');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-watch');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    clean: [
      "_dist/",
    ],
    imagemin: {
      all: {
        options: {                       
          // optimizationLevel: 3,
          // use: [mozjpeg()]
        },
        files: [{
            expand: true,                
            cwd: 'src/',                 
            src: ['img/**/*.{png,jpg,gif}'], 
            dest: '_dist/'               
        }]
      }
    },
    uglify: {
      options: {
        preserveComments : 'some',
        sourceMap: true,
      },
      vendor: {
        cwd: 'src/script/vendor/', 
        expand: true, 
        dest: '_dist/script/vendor/',  
        src: '**/*.js'
      },
    },
    coffee: {
      options: {
        compress: true,
        sourceMap: debug,
      },
      app: {
       src: [
          'src/script/app/**/*.coffee',
       ],
       dest: '_dist/script/app.min.js'
      }
    },
    less: {
      options: {
        sourceMap: debug,
      },
      root: {
        files: {
          '_dist/css/mylondon-style.min.css' : 'src/less/root.less'
        }
      }
    },
    copy: {
      html: { 
        cwd: 'src', 
        expand: true, 
        dest: '_dist/',  
        src: 'index.html' 
      },
    },
    watch: {
      html:    { tasks: 'copy:html',     files: 'src/**/*.html',               },
      vendor:  { tasks: 'uglify:vendor', files: 'src/script/vendor/**/*.js',   },
      app:     { tasks: 'coffee',        files: 'src/script/app/**/*.coffee',  },
      less:    { tasks: 'less',          files: 'src/less/**/*.less',          },
      options: {
        livereload: true 
      }
    }
  });

  grunt.registerTask('default', ['clean','coffee','uglify','imagemin','less','copy']);
};
