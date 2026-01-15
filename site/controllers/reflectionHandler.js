import { Reflection, User } from './db.js';
import path from 'path';
import fs from 'fs';
import { __dirname } from '../server.js';
import errPage from '../modules/error.js';

const escapeHtml = (str) => {
    return String(str)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
};

const renderReflectionHtmlPage = (title, content, author, date, slug, language) => {
    return fs.readFileSync(
        path.join(__dirname, 'pages', 'reflection.html'),
        'utf8'
    )
        .replaceAll('__insert_the_title_here', escapeHtml(title))
        .replaceAll('__insert_author_here', escapeHtml(author))
        .replaceAll('__insert_date_here', date)
        .replaceAll('__insert_language_here', escapeHtml(language || ''))
        .replaceAll('__insert_content_here', `<pre class="reflection-text">${escapeHtml(content)}</pre>`)
        .replaceAll('__insert_slug_here', slug);
};

async function reflectionViewer(req, res) {
    const { slug } = req.params;

    try {
        const reflection = await Reflection.findOne({
            where: { slug },
            attributes: ['title', 'slug', 'content', 'language', 'createdAt'],
            include: [{
                model: User,
                attributes: ['userName'],
                as: 'User'
            }]
        });

        if (!reflection) {
            return res
                .status(404)
                .send(errPage(404, `Reflection ${slug} was not found.`));
        }

        const dateStr = reflection.createdAt
            ? new Date(reflection.createdAt).toISOString()
            : '';

        const html = renderReflectionHtmlPage(
            reflection.title,
            reflection.content,
            reflection.User.userName,
            dateStr,
            reflection.slug,
            reflection.language
        );

        res.status(200).send(html);
    } catch (err) {
        console.error('Erro ao renderizar reflection:', err);
        res.status(500).send(errPage(500, 'Some error occurred.'));
    }
}

export { reflectionViewer };
