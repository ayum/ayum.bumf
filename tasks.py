import os
from invoke import task
from pathlib import Path
from weasyprint import HTML, CSS
from weasyprint.fonts import FontConfiguration

path = 'sobraniya/article.txt'
paper_html = Path('build/sobraniya/sobraniya.html').resolve()
paper_pdf = Path(paper_html).with_suffix('.pdf')
paper_txt = Path(paper_html).with_suffix('.txt')
paper_png = Path(paper_html).with_suffix('.png')


@task
def gulp(ctx, path=path):
    cmd = f'./node_modules/.bin/gulp default --path={path}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)


@task
def preview(ctx, paper_pdf=paper_pdf, paper_png=paper_png):
    cmd = f'convert -background white -alpha remove -density 100 {paper_pdf}[0] {paper_png}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)


@task(post=[preview])
def bumf(ctx, paper_html=paper_html, paper_pdf=paper_pdf, paper_txt=paper_txt):
    cmd = f'weasyprint -e=utf8 -a={paper_txt} -v {paper_html} {paper_pdf}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)
