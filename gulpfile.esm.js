import gulp from 'gulp'
import gulp_hb from 'gulp-hb'
import gulp_beautify from 'gulp-jsbeautifier'
import gulp_sass from 'gulp-sass'
import gulp_header from 'gulp-header'
import gulp_serve from 'gulp-serve'
import gulp_rename from 'gulp-rename'
import fs from 'fs'
import path from 'path'
import expand from 'fs-expand'
import fse from 'fs-extra'
import Hypher from 'hypher'
import russian from 'hyphenation.ru'
import through2 from 'through2'
import jsdom from 'jsdom'
import { PDFDocument } from 'pdf-lib'
import fontkit from '@pdf-lib/fontkit'
import GetGoogleFonts from 'get-google-fonts'
import date from 'date-and-time'
import ru from 'date-and-time/locale/ru'
import child_process from 'child_process'
import { argv } from 'yargs'
import marked from 'marked'

date.locale(ru);
const ggf = new GetGoogleFonts({ userAgent: 'Wget/1.18' });
const hypher = new Hypher(russian);
var build_dir;
var fonts_dir;
var assets_dir;
var paper;
var style;
var paper_path;

const argv_task = async () => {
  if (argv.path === undefined) {
    throw "should be path in task args";
  }
  paper_path = argv.path;
  const _ = path.parse(argv.path);
  style = _.name;
  paper = path.basename(_.dir);
  build_dir = 'build/' + paper + '/';
  fonts_dir = build_dir + '/fonts/';
  assets_dir = build_dir + '/assets/';
}

const dirs_task = async () => {
  try {
    await fs.promises.access(fonts_dir, fs.constants.F_OK);
  } catch (_) {
    await fs.promises.mkdir(fonts_dir, { recursive: true });
  }

  try {
    await fs.promises.access(assets_dir, fs.constants.F_OK);
  } catch (_) {
    await fs.promises.mkdir(assets_dir, { recursive: true });
  }

  var dir = 'style/' + style + '/fonts/';
  try {
    await fs.promises.access(dir, fs.constants.F_OK);
    try {
      await fse.copy(dir, fonts_dir);
    } catch (err) {
      console.log(err);
      process.abort();
    }
  } catch (_) { }

  dir = 'style/' + style + '/assets/';
  try {
    await fs.promises.access(dir, fs.constants.F_OK);
    try {
      await fse.copy(dir, assets_dir);
    } catch (err) {
      console.log(err);
      process.abort();
    }
  } catch (_) { }
}

const fonts_task = async () => {
  const fonts_css = fonts_dir + '/fonts.css';
  try {
    await fs.promises.access(fonts_css, fs.constants.F_OK);
  } catch (_) {
    await ggf.download([
      {
        'PT Serif': ['400', '400i', '700', '700i'],
        'PT Mono': ['400']
      },
      ['cyrillic', 'cyrillic-ext', 'latin-ext']
    ], { outputDir: fonts_dir });
    console.log('Fonts had been successfully downloaded');
  }
}

var pick;
const ppcat_task = async () => {
  const ppcat_path = './compiled/' + process.platform + '/' + process.arch + '/ppcat.node';
  const ppcat = await import(ppcat_path);
  pick = ppcat.pick;
}

const data_task = async () => {
  const text = await fs.promises.readFile(paper_path);
  await fs.promises.writeFile(build_dir + '/' + style + '.json', JSON.stringify(pick(text.toString()), null, ' '));
}

function transform_text(node, f) {
  for (node = node.firstChild; node; node = node.nextSibling) {
    if (node.nodeType == 3) {
      node.textContent = f(node.textContent);
    } else {
      transform_text(node, f);
    }
  }
}
function date_normalize(str) {
  if (date.isValid(str, 'DD.MM.YYYY')) {
    str = date.transform(str, 'DD.MM.YYYY', 'YYYY-MM-DD');
  } else if (date.isValid(str, 'D.MM.YYYY')) {
    str = date.transform(str, 'D.MM.YYYY', 'YYYY-MM-DD');
  } else if (date.isValid(str, 'DD.M.YYYY')) {
    str = date.transform(str, 'DD.M.YYYY', 'YYYY-MM-DD');
  } else if (date.isValid(str, 'D.M.YYYY')) {
    str = date.transform(str, 'D.M.YYYY', 'YYYY-MM-DD');
  }
  return date.format(new Date(str), 'YYYY-MM-DD').toLocaleLowerCase();;
}
marked.Renderer.prototype.paragraph = function (text) {
  return text;
};
marked.setOptions({ xhtml: true, smartypants: true });
const html_task = async () => {
  await gulp.src('style/' + style + '/template.html.hbs')
    .pipe(gulp_hb()
      .data(JSON.parse(fs.readFileSync(build_dir + '/' + style + '.json')))
      .helpers({
        dateFormat: function (str) {
          return date.format(new Date(date_normalize(str)), 'D MMMM YYYY').toLocaleLowerCase();
        },
        dateYear: function (str) {
          return date.format(new Date(date_normalize(str)), 'YYYY').toLocaleLowerCase();
        },
        dateNormalize: function (str) {
          return date_normalize(str);
        },
        marked: function (str) {
          return marked(str);
        },
        eq: function (lhs, rhs) {
          return lhs == rhs;
        }
      })
    )
    .pipe(through2.obj(function (file, _, cb) {
      if (file.isBuffer()) {
        const dom = new jsdom.JSDOM(file.contents.toString());
        transform_text(dom.window.document.body, (text) => { return hypher.hyphenateText(text); });
        const code = dom.serialize();
        file.contents = Buffer.from(code);
      }
      cb(null, file);
    }))
    .pipe(gulp_beautify())
    .pipe(gulp_rename(style + '.html'))
    .pipe(gulp.dest(build_dir));
};

const css_task = async () => {
  await gulp.src('style/' + style + '/stylesheet.scss')
    .pipe(gulp_header(function () {
      if (child_process.execSync('git status --short').toString()) {
        return '';
      } else {
        return '$document-version: \'' + child_process.execSync('git rev-parse HEAD').toString().trim().substring(0, 5) + '\';\n'
      }
    }()
    ))
    .pipe(gulp_sass())
    .pipe(gulp.dest(build_dir));
}

const pdf_task = async () => {
  let file = await fs.promises.readFile(build_dir + '/' + out_basename + '.html');
  const pdf = await PDFDocument.load(file);
  pdf.registerFontkit(fontkit)
  let fonts = expand.sync([fonts_dir + '/*.ttf'], { filter: 'isFile' });
  fonts.forEach(async (font) => {
    const bytes = await fs.promises.readFile(font);
    const face = await pdf.embedFont(bytes)
  });
  const bytes = await pdf.save()
  await Promise.all([fs.promises.writeFile(build_dir + '/' + out_basename + '.pdf', bytes), printer.close()]);
}

const prepare = gulp.series(argv_task, dirs_task);

exports.fonts = gulp.series(prepare, fonts_task);
exports.pdf = gulp.series(prepare, pdf_task);
exports.css = gulp.series(prepare, css_task);
exports.assets = gulp.series(prepare, gulp.parallel(css_task, gulp.series(ppcat_task, data_task, html_task)));
exports.default = exports.assets;

exports.serve = gulp_serve(build_dir);
