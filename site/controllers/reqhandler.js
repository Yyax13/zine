import path from 'path';
import fs from 'fs';
import { __dirname } from '../server.js';
import renderMarkdown from './parsemd.js';
import { Article, User, Tag, Trick } from './db.js';
import { Op } from 'sequelize';
import errPage from '../modules/error.js';

const renderFullHtmlPage = (title, renderedMarkdownHtml, author, date, tagsHtml, slug) => {
    return (fs.readFileSync(path.join(__dirname, "pages", "paper.html")).toString("utf8"))
        .replaceAll("__insert_the_title_here", title)
        .replaceAll("__insert_author_here", author)
        .replaceAll("__insert_date_here", date)
        .replaceAll("__insert_content_here", renderedMarkdownHtml)
        .replaceAll("__insert_tags_here", tagsHtml || '')
        .replaceAll("__insert_slug_here", slug);
};

async function articleViewer(req, res) {
    const { slug: articleName } = req.params;
    const articleSlug = articleName.toLowerCase().replaceAll(" ", "-");

    try {
        const article = await Article.findOne({
            where: { slug: articleSlug },
            attributes: ['title', 'slug', 'content', 'createdAt'],
            include: [
                {
                    model: User,
                    attributes: ['userName'],
                    as: 'User'
                },
                {
                    model: Tag,
                    attributes: ['name'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!article) {
            return res.status(404).send(errPage(404, `Paper ${articleName} was not found.`));
        }

    const renderedMarkdownHtml = await renderMarkdown(article.content);
        // Use createdAt timestamp from Sequelize model for the date
        const dateStr = article.createdAt ? (new Date(article.createdAt)).toISOString() : '';
    const tags = article.Tags || [];
    const tagsHtml = tags.length ? `<div class="tags">${tags.map(t => `<a href="/p?tag=${encodeURIComponent(t.name)}" class="tag">${t.name}</a>`).join(' ')}</div>` : '';

    const content = renderFullHtmlPage(article.title, renderedMarkdownHtml, article.User.userName, dateStr, tagsHtml, article.slug);
        res.status(200).send(content);

    } catch (err) {
        console.error("Erro ao buscar artigo ou renderizar:", err);
        return res.status(500).send(errPage(500, `Some error occurred.`));

    }
}

const renderTrickHtmlPage = (title, renderedMarkdownHtml, author, date, tagsHtml, slug) => {
    return (fs.readFileSync(path.join(__dirname, "pages", "trick.html")).toString("utf8"))
        .replaceAll("__insert_the_title_here", title)
        .replaceAll("__insert_author_here", author)
        .replaceAll("__insert_date_here", date)
        .replaceAll("__insert_content_here", renderedMarkdownHtml)
        .replaceAll("__insert_tags_here", tagsHtml || '')
        .replaceAll("__insert_slug_here", slug);
};

async function trickViewer(req, res) {
    const { slug: trickName } = req.params;
    const trickSlug = trickName.toLowerCase().replaceAll(" ", "-");

    try {
        const trick = await Trick.findOne({
            where: { slug: trickSlug },
            attributes: ['title', 'slug', 'content', 'createdAt'],
            include: [
                {
                    model: User,
                    attributes: ['userName'],
                    as: 'User'
                },
                {
                    model: Tag,
                    attributes: ['name'],
                    through: { attributes: [] }
                }
            ]
        });

        if (!trick) {
            return res.status(404).send(errPage(404, `Trick ${trickName} was not found.`));
        }

        const renderedMarkdownHtml = await renderMarkdown(trick.content);
        const dateStr = trick.createdAt ? (new Date(trick.createdAt)).toISOString() : '';
        const tags = trick.Tags || [];
        const tagsHtml = tags.length ? `<div class="tags">${tags.map(t => `<a href="/t?tag=${encodeURIComponent(t.name)}" class="tag">${t.name}</a>`).join(' ')}</div>` : '';

        const content = renderTrickHtmlPage(trick.title, renderedMarkdownHtml, trick.User.userName, dateStr, tagsHtml, trick.slug);
        res.status(200).send(content);

    } catch (err) {
        console.error("Erro ao buscar trick ou renderizar:", err);
        return res.status(500).send(errPage(500, `Some error occurred.`));
    }
}

export { articleViewer, trickViewer };
