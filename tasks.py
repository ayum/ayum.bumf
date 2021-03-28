import os
from invoke import task
from pathlib import Path


def paper_files(paper):
    paper_html = Path(f'build/{paper}/{paper}.html').resolve()
    paper_pdf = Path(paper_html).with_suffix('.pdf')
    paper_txt = Path(paper_html).with_suffix('.txt')
    paper_png = Path(paper_html).with_suffix('.png')
    return {'html': paper_html, 'pdf': paper_pdf, 'txt': paper_txt, 'png': paper_png}


def default_path():
    with open('.default_paper_path', 'r') as file:
        path = file.read().replace('\n', '')
    return path


@task
def gulp(ctx, path=default_path()):
    cmd = f'./node_modules/.bin/gulp default --path={path}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)


@task
def preview(ctx, paper=Path(default_path()).parent.name):
    pdic = paper_files(paper)
    cmd = f'convert -background white -alpha remove -density 100 {pdic["pdf"]}[0] {pdic["png"]}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)


@task
def bumf(ctx, paper=Path(default_path()).parent.name):
    pdic = paper_files(paper)
    cmd = f'weasyprint -e=utf8 -a={pdic["txt"]} -v {pdic["html"]} {pdic["pdf"]}'
    print(f'invoke: {cmd}')
    ctx.run(cmd)
    preview(ctx, paper)


@task
def paper(ctx, path=default_path()):
    paper = Path(path).parent.name
    gulp(ctx, path)
    bumf(ctx, paper)
