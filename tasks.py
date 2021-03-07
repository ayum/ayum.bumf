import os
from invoke import task
from pathlib import Path as path
from weasyprint import HTML, CSS
from weasyprint.fonts import FontConfiguration

# font_config = FontConfiguration()
# html = HTML(string='<h1>The title</h1>')
# css = CSS(string='''
#     @font-face {
#         font-family: Gentium;
#         src: url(http://example.com/fonts/Gentium.otf);
#     }
#     h1 { font-family: Gentium }''', font_config=font_config)
# html.write_pdf(
#     '/tmp/example.pdf', stylesheets=[css],
#     font_config=font_config)

paper_path = 'sobraniya/article.txt'
paper_html = 'build/sobraniya/article.html'


@task
def gulp(ctx, paper_path=paper_path):
    cmd = f'./node_modules/.bin/gulp default --path={paper_path}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)


@task
def bumf(ctx, paper_html=paper_html):
    paper_html = path(paper_html).resolve()
    build_dir = path(paper_html).parent.resolve()
    fonts_dir = build_dir / 'fonts'
    # os.chdir(fonts_dir)
    font_config = FontConfiguration()
    fonts_css = CSS(filename=fonts_dir/'fonts.css', font_config=font_config)
    style_css = CSS(filename=build_dir/'stylesheet.css')
    html = HTML(filename=paper_html)
    html.write_pdf(path(paper_html).with_suffix('.pdf'), stylesheets=[
                   style_css, fonts_css], font_config=font_config)
    # doc = html.render(
    #     stylesheets=[style_css, fonts_css], font_config=font_config)
    # print(html.style)
