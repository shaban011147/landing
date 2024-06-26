import gulp from 'gulp';
import del from 'del';
import sourcemaps from 'gulp-sourcemaps';
import plumber from 'gulp-plumber';
import gulpSass from 'gulp-sass';
import nodeSass from 'node-sass';
import autoprefixer from 'gulp-autoprefixer';
import minifyCss from 'gulp-clean-css';
import purge from 'gulp-purgecss';
import uglifyPackage from 'gulp-uglify-es';
import concat from 'gulp-concat';
import imagemin from 'gulp-imagemin';
import browserSync from 'browser-sync';
import dependents from 'gulp-dependents';
import nunjucksRender from 'gulp-nunjucks-render';
import headerComment from 'gulp-header-comment';
import rename from 'gulp-rename';
import rtlcss from 'gulp-rtlcss';
import javascriptObfuscator from 'gulp-javascript-obfuscator';
import w3cjs from 'gulp-w3cjs';
import mergeJson from 'gulp-merge-json';
import data from 'gulp-data';
import gulpMode from 'gulp-mode';
import fs from 'fs';
import rollup from 'gulp-better-rollup'; // A Gulp plugin that allows us to use Rollup, a module bundler that allows us to use ES6 imports and exports in our code.
import babel from 'rollup-plugin-babel'; // A Rollup plugin that integrates Babel into the bundling process.
import resolve from 'rollup-plugin-node-resolve'; // A Rollup plugin that allows us to use third party modules in node_modules/.
import commonjs from 'rollup-plugin-commonjs'; // A Rollup plugin that converts CommonJS modules to ES6 so we can import them without issues.
import cached from 'gulp-cached';
import debug from 'gulp-debug';
import faker from 'gulp-faker';

const sass = gulpSass(nodeSass);

const {default: uglify} = uglifyPackage;
let mode = gulpMode({
    modes: ["production", "development"],
    default: "development",
    verbose: false
});


const src_folder = './src/';
const src_assets_folder = src_folder + 'assets/';
const dist_folder = './dist/';
const dist_assets_folder = dist_folder + 'assets/';
const node_modules_folder = './node_modules/';


// Removing The Dist Folder
gulp.task('clear', () => del([dist_folder]));

// Merge Json files
gulp.task('mergeJson', () => {
    return gulp.src('./src/template/data/**/*.json')
        .pipe(mergeJson({
            fileName: 'data.json',
            edit: (parsedJson, file) => {
                if (parsedJson.someValue) {
                    delete parsedJson.otherValue;
                }
                return parsedJson;
            },
        }))
        .pipe(gulp.dest('./src/template'));
});


// Compile the Nunjucks
gulp.task('html', () => {
    return gulp.src([src_folder + 'pages/' + '**/*.html'], {
        base: src_folder + 'pages/',
    })
        .pipe(data(function () {
            return JSON.parse(fs.readFileSync(src_folder + 'template/' + 'data.json'));
        }))
        .pipe(faker())
        .pipe(nunjucksRender({
            path: src_folder + 'template/',
            watch: true
        }))
        .pipe(gulp.dest(dist_folder))
        .pipe(browserSync.stream());
});

// Validate the HTML
gulp.task('validate', () => {
    return gulp.src([dist_folder + '**/*.html'])
        .pipe(w3cjs())
        .pipe(w3cjs.reporter());
});

// Copy Font Awesome Fonts From NPM
gulp.task('fontAwesome', () => {
    return gulp.src([node_modules_folder + '@fortawesome/fontawesome-free/webfonts/**/*.+(eot|svg|ttf|woff|woff2)'])
        .pipe(gulp.dest(dist_assets_folder + 'webfonts'))
});

// Copy Fonts From SRC Folder
gulp.task('fonts', () => {
    return gulp.src([src_assets_folder + 'fonts/**/*.+(eot|svg|ttf|woff|woff2)'])
        .pipe(gulp.dest(dist_assets_folder + 'fonts'))
});

// Compile SCSS and Minify CSS
gulp.task('sass', () => {
    return gulp.src([src_assets_folder + 'scss/**/*.scss'])
        .pipe(mode.development(sourcemaps.init()))
        .pipe(mode.development(plumber()))
        .pipe(cached('sasscache'))
        .pipe(debug({title: 'cache pass:'})) // Add this
        .pipe(dependents())
        .pipe(debug({title: 'dependents:'})) // Add this
        .pipe(sass({
            includePaths: ['node_modules']
        }).on('error', sass.logError))
        .pipe(autoprefixer())
        .pipe(minifyCss()) // Removing this line makes an error called  MIME type ('text/html')
        .pipe(mode.development(sourcemaps.write('.')))
        .pipe(mode.production(headerComment(`
            Generated on <%= moment().format('YYYY-MM-DD') %>
            Author: <%= _.capitalize(pkg.author) %>
            Credits: <%= _.capitalize(pkg.credit) %>
        `)))
        .pipe(gulp.dest(dist_assets_folder + 'css'))
        .pipe(browserSync.stream());
});

// Compile SCSS, Minify CSS and RTL Support
gulp.task('sass-rtl', () => {
    return gulp.src([src_assets_folder + 'scss/**/*.scss'])
        .pipe(mode.development(sourcemaps.init()))
        .pipe(mode.development(plumber()))
        .pipe(dependents())
        .pipe(sass({
            includePaths: ['node_modules']
        }).on('error', sass.logError))
        .pipe(rtlcss())
        .pipe(autoprefixer())
        .pipe(minifyCss()) // Removing this line makes an error called  MIME type ('text/html')
        .pipe(rename({suffix: '-rtl'})) // Append "-rtl" to the filename.
        .pipe(mode.development(sourcemaps.write('.')))
        .pipe(mode.production(headerComment(`
            Generated on <%= moment().format('YYYY-MM-DD') %>
            Author: <%= _.capitalize(pkg.author) %>
            Credits: <%= _.capitalize(pkg.credit) %>
        `)))
        .pipe(gulp.dest(dist_assets_folder + 'css'))
        .pipe(browserSync.stream());
});

// Remove Unnecessary CSS
gulp.task('purge', () => {
    return gulp.src([dist_assets_folder + 'css/**/*.css'])
        .pipe(mode.production(purge({
            content: [dist_folder + '/**/*.html']
        })))
        .pipe(mode.production(gulp.dest(dist_assets_folder + 'css')))
});

// Compile JS Code
gulp.task('js', () => {
    return gulp.src(src_assets_folder + 'js/app.js')
        .pipe(rollup({plugins: [babel(), resolve(), commonjs()]}, 'umd'))
        .pipe(plumber())
        // .pipe(webpack({
        //     mode: 'production'
        // }))
        .pipe(mode.production(sourcemaps.init()))
        .pipe(concat('app.js'))
        .pipe(mode.production(uglify()))
        .pipe(mode.production(javascriptObfuscator({
            compact: true,
            sourceMap: true
        })))
        .pipe(mode.production(headerComment(`
            Generated on <%= moment().format('YYYY-MM-DD') %>
            Author: <%= _.capitalize(pkg.author) %>
            Credits: <%= _.capitalize(pkg.credit) %>
        `)))
        .pipe(mode.production(sourcemaps.write('.')))
        .pipe(gulp.dest(dist_assets_folder + 'js'))
        .pipe(browserSync.stream());
});

// Minify Images
gulp.task('images', () => {
    return gulp.src([src_assets_folder + 'images/**/*.+(png|jpg|jpeg|gif|svg|ico|webmanifest)'])
        .pipe(mode.production(imagemin()))
        .pipe(gulp.dest(dist_assets_folder + 'images'))
        .pipe(browserSync.stream());
});

// Adding The Browser Config Into The Root Directory
gulp.task('browser-config', () => {
    return gulp.src([src_assets_folder + 'images/favicon/**/*.xml'])
        .pipe(gulp.dest(dist_folder))
});

// Copy CSS From SRC Folder
gulp.task('css', () => {
    return gulp.src([src_assets_folder + 'css/**/*.*'])
        .pipe(gulp.dest(dist_assets_folder + 'css'))
});

// Moving The Util Library Only Used With Tel-Input Package
// gulp.task('util', () => {
//     return gulp.src([
//         node_modules_folder + 'intl-tel-input/build/js/utils.js'
//     ], { since: gulp.lastRun('util') })
//         .pipe(gulp.dest(dist_assets_folder + 'js'))
// });

gulp.task('build', gulp.series('clear', 'mergeJson', 'html', 'css', 'sass', 'sass-rtl', 'js', 'images', 'fontAwesome', 'fonts', 'browser-config'/*, 'validate'*/));
gulp.task('dev', gulp.series('mergeJson', 'html', 'sass', 'sass-rtl', 'js'));

// Browser Sync
gulp.task('serve', () => {
    return browserSync.init({
        server: {
            baseDir: ['dist']
        },
        port: 3000
    });
});

// Watch Task To Watch All The Files Changes
gulp.task('watch', () => {
    const watchImages = [
        src_assets_folder + 'images/**/*.+(png|jpg|jpeg|gif|svg|ico)'
    ];

    gulp.watch(src_folder + '**/*.html', gulp.series('html'/*, 'validate'*/)).on('change', browserSync.reload);
    gulp.watch(src_folder + 'template/' + 'data.json', gulp.series('html'/*, 'validate'*/)).on('change', browserSync.reload);
    gulp.watch(src_folder + '**/*.js', gulp.series('js')).on('change', browserSync.reload);
    gulp.watch(src_folder + '**/*.scss', gulp.series('sass', 'sass-rtl')).on('change', browserSync.reload);
    gulp.watch(src_folder + '/assets/css/**/*.*', gulp.series('css')).on('change', browserSync.reload);
    gulp.watch(src_folder + 'template/data/**/*.json', gulp.series('mergeJson', 'html')).on('change', browserSync.reload);
    gulp.watch(watchImages, gulp.series('images')).on('change', browserSync.reload);
});

gulp.task('default', gulp.series('build', gulp.parallel('serve', 'watch')));
