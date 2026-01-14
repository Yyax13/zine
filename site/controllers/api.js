import { Article, File, User, Tag, ArticleVote, FileVote } from "./db.js";
import { Op } from "sequelize";

export const lastest = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 5; // Pega o limite da query string, padrão 5
        const articles = await Article.findAll({
            order: [['createdAt', 'DESC']],
            limit: limit,
            attributes: ['id','title', 'slug', 'short_description', 'createdAt'],
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
                },
                {
                    model: ArticleVote,
                    attributes: ['value']
                }
            ]
        });

        // Compute up/down counts for each article
        const out = articles.map(a => {
            const votes = a.ArticleVotes || [];
            const upvotes = votes.filter(v => v.value === 1).length;
            const downvotes = votes.filter(v => v.value === -1).length;
            return { id: a.id, title: a.title, slug: a.slug, short_description: a.short_description, createdAt: a.createdAt, User: a.User, Tags: a.Tags, upvotes, downvotes };
        });
        res.json(out);
    } catch (error) {
        console.error('Erro ao buscar artigos para API:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar artigos.' });
    }
};

export const all = async (req, res) => {
    try {
        const articles = await Article.findAll({
            order: [['createdAt', 'DESC']],
            attributes: ['id','title', 'slug', 'short_description', 'createdAt'],
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
                },
                {
                    model: ArticleVote,
                    attributes: ['value']
                }
            ]
        });

        const out = articles.map(a => {
            const votes = a.ArticleVotes || [];
            const upvotes = votes.filter(v => v.value === 1).length;
            const downvotes = votes.filter(v => v.value === -1).length;
            return { id: a.id, title: a.title, slug: a.slug, short_description: a.short_description, createdAt: a.createdAt, User: a.User, Tags: a.Tags, upvotes, downvotes };
        });
        res.json(out);
    } catch (error) {
        console.error('Erro ao buscar todos os artigos para API:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar artigos.' });
    }
};

export const searchArticles = async (req, res) => {
    try {
        const q = req.query.q || '';
        const tag = req.query.tag || '';

        const where = q ? {
            [Op.or]: [
                { title: { [Op.iLike]: `%${q}%` } },
                { short_description: { [Op.iLike]: `%${q}%` } }
            ]
        } : {};

        const include = [
            { model: User, attributes: ['userName'], as: 'User' },
            { model: Tag, attributes: ['name'], through: { attributes: [] } },
            { model: ArticleVote, attributes: ['value'] }
        ];

        if (tag) {
            // filter by tag name
            include.push({ model: Tag, where: { name: tag }, attributes: [], through: { attributes: [] } });
        }

        const results = await Article.findAll({ where, include, order: [['createdAt', 'DESC']], attributes: ['id','title','slug','short_description','createdAt'] });
        const out = results.map(a => {
            const votes = a.ArticleVotes || [];
            const upvotes = votes.filter(v => v.value === 1).length;
            const downvotes = votes.filter(v => v.value === -1).length;
            return { id: a.id, title: a.title, slug: a.slug, short_description: a.short_description, createdAt: a.createdAt, User: a.User, Tags: a.Tags, upvotes, downvotes };
        });
        res.json(out);
    } catch (e) {
        console.error('searchArticles error', e);
        res.status(500).json({ error: 'Internal' });
    }
};

export const getArticle = async (req, res) => {
    try {
        const slug = req.params.slug;
        const article = await Article.findOne({
            where: { slug },
            include: [
                { model: User, attributes: ['userName', 'id'], as: 'User' },
                { model: Tag, attributes: ['name'], through: { attributes: [] } }
            ]
        });
        if (!article) return res.status(404).json({ error: 'Article not found' });
        
        const tags = article.Tags ? article.Tags.map(t => t.name).join(',') : '';
        res.json({
            id: article.id,
            title: article.title,
            slug: article.slug,
            content: article.content,
            short_description: article.short_description,
            author: article.User,
            tags: tags,
            createdAt: article.createdAt
        });
    } catch (e) {
        console.error('getArticle error', e);
        res.status(500).json({ error: 'Internal' });
    }
};

export const wallpapers = async (req, res) => {
    try {
        // Return files that look like wallpapers. Use File model and do not include the BLOB.
        const wallpapers = await File.findAll({
            where: {
                [Op.or]: [
                    { slug: { [Op.like]: 'wallpaper-%' } },
                ]
            },
            order: [['createdAt', 'DESC']],
            attributes: ['id','slug', 'title', 'mime', 'createdAt', 'link'],
            include: [
                { model: FileVote, attributes: ['value'] }
            ]
        });

        const out = wallpapers.map(f => {
            const votes = f.FileVotes || [];
            const upvotes = votes.filter(v => v.value === 1).length;
            const downvotes = votes.filter(v => v.value === -1).length;
            return { id: f.id, slug: f.slug, title: f.title, mime: f.mime, createdAt: f.createdAt, link: f.link, upvotes, downvotes };
        });

        res.json(out);
    } catch (error) {
        console.error("Wallpapers,", error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar wallpapers' });
    }
};

// Voting endpoints
export const voteArticle = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (req.user.worm) return res.status(401).json({ error: 'Worm accounts cannot vote' });
        const slug = req.params.slug;
        const val = Number(req.body.value);
        if (![1, -1].includes(val)) return res.status(400).json({ error: 'value must be 1 or -1' });

        const article = await Article.findOne({ where: { slug } });
        if (!article) return res.status(404).json({ error: 'Article not found' });

        const [row, created] = await ArticleVote.findOrCreate({ where: { UserId: req.user.id, ArticleId: article.id }, defaults: { value: val, UserId: req.user.id, ArticleId: article.id } });
        if (!created) {
            if (row.value === val) {
                // toggle off
                await row.destroy();
            } else {
                row.value = val;
                await row.save();
            }
        }

        const upvotes = await ArticleVote.count({ where: { ArticleId: article.id, value: 1 } });
        const downvotes = await ArticleVote.count({ where: { ArticleId: article.id, value: -1 } });
        res.json({ upvotes, downvotes });
    } catch (e) {
        console.error('voteArticle error', e);
        res.status(500).json({ error: 'internal' });
    }
};

export const voteFile = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (req.user.worm) return res.status(401).json({ error: 'Worm accounts cannot vote' });
        const slug = req.params.slug;
        const val = Number(req.body.value);
        if (![1, -1].includes(val)) return res.status(400).json({ error: 'value must be 1 or -1' });

        const file = await File.findOne({ where: { slug } });
        if (!file) return res.status(404).json({ error: 'File not found' });

        const [row, created] = await FileVote.findOrCreate({ where: { UserId: req.user.id, FileId: file.id }, defaults: { value: val, UserId: req.user.id, FileId: file.id } });
        if (!created) {
            if (row.value === val) {
                await row.destroy();
            } else {
                row.value = val;
                await row.save();
            }
        }

        const upvotes = await FileVote.count({ where: { FileId: file.id, value: 1 } });
        const downvotes = await FileVote.count({ where: { FileId: file.id, value: -1 } });
        res.json({ upvotes, downvotes });
    } catch (e) {
        console.error('voteFile error', e);
        res.status(500).json({ error: 'internal' });
    }
};