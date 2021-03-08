import os
from invoke import task
from pathlib import Path as path
from weasyprint import HTML, CSS
from weasyprint.fonts import FontConfiguration

paper_path = 'sobraniya/article.txt'
paper_html = 'build/sobraniya/article.html'


@task
def gulp(ctx, paper_path=paper_path):
    cmd = f'./node_modules/.bin/gulp default --path={paper_path}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)


@task
def bumf(ctx, paper_html=paper_html, paper_path=paper_path):
    paper_path = path(paper_path).resolve()
    paper_html = path(paper_html).resolve()
    paper_pdf = path(paper_html).with_suffix('.pdf')
    ctx.run(f'weasyprint -e=utf8 -a={paper_path} -v {paper_html} {paper_pdf}')
