const webpack = require('webpack-stream');
const del = require('del');
const gulp = require('gulp');
const sass = require('gulp-sass');
const sassGlob = require('gulp-sass-glob');
const sourcemaps = require('gulp-sourcemaps');
const gulpif = require('gulp-if');
const csso = require('gulp-csso');
const gutil = require('gulp-util');
const postcss = require('gulp-postcss');
const sasslint = require('gulp-sass-lint');
const modernizr = require('modernizr');
const autoprefixer = require('autoprefixer');
const fs = require('fs');
const a11y = require('gulp-a11y');
const htmlhint = require('gulp-htmlhint');
const fractal = require('./fractal.js');
const imagemin = require('gulp-imagemin');
const svgSprite = require('gulp-svg-sprite');

const logger = fractal.cli.console;

/*-----------------------------------------------------------------------------
 Config
 ------------------------------------------------------------------------------*/
var config = {
  mode: 'dev',
  paths: {
    images: {
      src: './src/assets/img/**/*.{jpg,png,gif,svg}',
      dest: './src/assets/img/',
      prod: {
        src: ['./src/assets/img/**/*.{jpg,png,gif,svg}'],
        dest: './dist/assets/img'
      }
    },
    js: {
      src: './src/global/js/main.js',
      dest: './src/assets/js/',
      build: {
        src: './src/assets/js/scripts.min.js',
        dest: './build/js/'
      },
      prod: {
        src: './src/assets/js/*.js',
        dest: './dist/assets/js'
      },
    },
    styles: {
      src: './src/global/sass/styles.scss',
      dest: './src/assets/css',
      prod: {
        src: './src/assets/css/*.css',
        dest: './dist/assets/css'
      },
      watch: [
        './src/components/**/*.scss',
        './src/global/sass/**/*.scss',
      ],
    },
    html: {
      audit: [
        './dist/components/preview/t-*.html',
        './dist/components/preview/p-*.html'
      ],
    },
    favicons: {
      src: './src/assets/favicons/**/*',
      dest: './dist/assets/favicons'
    },
    prodAssets: './dist/assets/'
  },
  server: {
    port: 8000,
  },
  svgSprite: {
    src: './src/assets/img/icon-styles/sprite-src/',
    dest: './src/assets/img/icon-styles/',
    mode: {
      symbol: { // view mode to build the SVG
        render: {
          css: false, // CSS output option for icon sizing
          scss: false // SCSS output option for icon sizing
        },
        dest: '.', // destination folder
        prefix: '.svg--%s', // BEM-style prefix if styles rendered
        sprite: 'symbol-sprite.svg', //generated sprite name
        example: false // Build a sample page?
      }
    },
    svg: {
      xmlDeclaration: false, // strip out the XML attribute
      doctypeDeclaration: false // don't include the !DOCTYPE declaration
    },
  }
};

/*-----------------------------------------------------------------------------
 Fractal
 ------------------------------------------------------------------------------*/
gulp.task('fractal:start', () => {
  const server = fractal.web.server({
    sync: true,
    watch: true,
    port: config.server.port,
    syncOptions: {
      notify: true,
      reloadOnRestart: true,
    },
  });
  server.on('error', err => gutil.colors.red(err.message));
  return server.start().then(() => {
    gutil.log(gutil.colors.green(`Server is now running locally at ${server.urls.sync.local}`));
    gutil.log(gutil.colors.green(`Server is now running externally at ${server.urls.sync.external}`));
  });
});

gulp.task('fractal:build', () => {
  const builder = fractal.web.builder();
  builder.on('progress', (completed, total) => logger.update(`Exported ${completed} of ${total} items`, 'info'));
  builder.on('error', err => logger.error(err.message));
  return builder.build().then(() => {
    logger.success('Fractal build completed!');
  });
});

/*-----------------------------------------------------------------------------
 Audit:

 Tests page-level components for accessibility (using a11y) and validates HTML.
 ------------------------------------------------------------------------------*/
gulp.task('audit:run', () => {
  return gulp.src(config.paths.html.audit)
    .pipe(a11y({}))
    .pipe(a11y.reporter())
    .pipe(htmlhint())
    .pipe(htmlhint.reporter());
});

gulp.task('audit', gulp.series('fractal:build', 'audit:run'));

/*-----------------------------------------------------------------------------
 CSS
 ------------------------------------------------------------------------------*/
gulp.task('css:lint', () => {
  return gulp.src(config.paths.styles.watch)
    .pipe(sasslint({configFile: '.sass-lint.yml'}))
    .pipe(sasslint.format());
});

gulp.task('css:process', () => {
  return gulp.src(config.paths.styles.src)
    .pipe(sourcemaps.init())
    .pipe(sassGlob())
    .pipe(sass({includePaths: '/src'}).on('error', sass.logError))
    .pipe(postcss([require('postcss-flexbugs-fixes')]))
    .pipe(postcss([autoprefixer({browsers: ['last 4 versions']})]))
    .pipe(gulpif(config.mode === 'production', csso()))
    .pipe(gulpif(config.mode === 'development', sourcemaps.write('.')))
    .pipe(gulpif(config.mode === 'development', sourcemaps.write('.')))
    .pipe(gulp.dest(config.paths.styles.dest));
});

gulp.task('css:watch', () => {
  gulp.watch([
    config.paths.styles.watch,
  ], gulp.series('css'));
});

gulp.task('css', gulp.series('css:lint', 'css:process'));


/*-----------------------------------------------------------------------------
 JS
 ------------------------------------------------------------------------------*/
gulp.task('webpack', () => {
  return gulp.src(config.paths.js.src)
    .pipe(webpack(require('./webpack.config.js')(config)))
    .pipe(gulp.dest(config.paths.js.dest));
});


/*-----------------------------------------------------------------------------
 Images
 ------------------------------------------------------------------------------*/
gulp.task('imagemin', () => {
  return gulp.src(config.paths.images.src)
    .pipe(imagemin({}))
    .pipe(gulp.dest(config.paths.images.dest));
});

/*-----------------------------------------------------------------------------
 Icons

 Note: imagemin will break the sprite.svg, so imagemin should always be run
 BEFORE this task.
 ------------------------------------------------------------------------------*/
gulp.task('icon-styles', () => {
  return gulp.src('**/*.svg', {cwd: config.svgSprite.src})
    .pipe(svgSprite(config.svgSprite))
    .pipe(gulp.dest(config.svgSprite.dest));
});


/*-----------------------------------------------------------------------------
 Modernizr
 ------------------------------------------------------------------------------*/
gulp.task('modernizr', (done) => {
  modernizr.build(require('./modernizr.config.json'), (code) => {
    fs.writeFile('./src/assets/js/modernizr.min.js', code, done);
  });
});


/*-----------------------------------------------------------------------------
 Build tasks
 ------------------------------------------------------------------------------*/
gulp.task('build:set-env', (done) => {
  config.mode = 'build';
  done();
});


/*-----------------------------------------------------------------------------
 Prod tasks
 ------------------------------------------------------------------------------*/
gulp.task('prod:set-env', (done) => {
  config.mode = 'production';
  done();
});

gulp.task('prod:build', gulp.series('webpack', 'css:process'));

gulp.task('prod:clean', () => {
  return del([
    config.paths.prodAssets
  ], {force: true});
});

gulp.task('prod:copy', (done) => {
  gulp.src(config.paths.styles.prod.src)
    .pipe(gulp.dest(config.paths.styles.prod.dest));
  gulp.src(config.paths.js.prod.src)
    .pipe(gulp.dest(config.paths.js.prod.dest));
  gulp.src(config.paths.images.prod.src)
    .pipe(gulp.dest(config.paths.images.prod.dest));
  gulp.src(config.paths.favicons.src)
    .pipe(gulp.dest(config.paths.favicons.dest));
  done();
});

/*-----------------------------------------------------------------------------
 Entries
 ------------------------------------------------------------------------------*/
gulp.task('build', gulp.series('icon-styles', 'css', 'build:set-env', 'webpack', 'fractal:build'));
gulp.task('dev', gulp.series('icon-styles', 'css', 'fractal:start', gulp.parallel('webpack', 'css:watch')));
gulp.task('prod', gulp.series('modernizr', 'imagemin', 'icon-styles', 'prod:set-env', 'prod:clean', 'prod:build', 'prod:copy'));
gulp.task('default', gulp.series('dev'));