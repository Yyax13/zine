import { Article, File, User, Tag, ArticleVote, FileVote, Trick, TrickVote, Reflection } from "./db.js";
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
        res.status(500).json({ error: 'Internal' });
    }
};

// Trick endpoints
export const getTricks = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const tricks = await Trick.findAll({
            order: [['createdAt', 'DESC']],
            limit: limit,
            attributes: ['id', 'title', 'slug', 'short_description', 'createdAt'],
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
                    model: TrickVote,
                    attributes: ['value']
                }
            ]
        });

        const out = tricks.map(t => {
            const votes = t.TrickVotes || [];
            const upvotes = votes.filter(v => v.value === 1).length;
            const downvotes = votes.filter(v => v.value === -1).length;
            return { id: t.id, title: t.title, slug: t.slug, short_description: t.short_description, createdAt: t.createdAt, User: t.User, Tags: t.Tags, upvotes, downvotes };
        });
        res.json(out);
    } catch (error) {
        console.error('Erro ao buscar tricks:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao buscar tricks.' });
    }
};

export const searchTricks = async (req, res) => {
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
            { model: TrickVote, attributes: ['value'] }
        ];

        if (tag) {
            include.push({ model: Tag, where: { name: tag }, attributes: [], through: { attributes: [] } });
        }

        const results = await Trick.findAll({ where, include, order: [['createdAt', 'DESC']], attributes: ['id','title','slug','short_description','createdAt'] });
        const out = results.map(t => {
            const votes = t.TrickVotes || [];
            const upvotes = votes.filter(v => v.value === 1).length;
            const downvotes = votes.filter(v => v.value === -1).length;
            return { id: t.id, title: t.title, slug: t.slug, short_description: t.short_description, createdAt: t.createdAt, User: t.User, Tags: t.Tags, upvotes, downvotes };
        });
        res.json(out);
    } catch (e) {
        console.error('searchTricks error', e);
        res.status(500).json({ error: 'Internal' });
    }
};

export const getTrick = async (req, res) => {
    try {
        const slug = req.params.slug;
        const trick = await Trick.findOne({
            where: { slug },
            include: [
                { model: User, attributes: ['userName', 'id'], as: 'User' },
                { model: Tag, attributes: ['name'], through: { attributes: [] } }
            ]
        });
        if (!trick) return res.status(404).json({ error: 'Trick not found' });
        
        const tags = trick.Tags ? trick.Tags.map(t => t.name).join(',') : '';
        res.json({
            id: trick.id,
            title: trick.title,
            slug: trick.slug,
            content: trick.content,
            short_description: trick.short_description,
            author: trick.User,
            tags: tags,
            createdAt: trick.createdAt
        });
    } catch (e) {
        console.error('getTrick error', e);
        res.status(500).json({ error: 'Internal' });
    }
};

export const voteTrick = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (req.user.worm) return res.status(401).json({ error: 'Worm accounts cannot vote' });
        const slug = req.params.slug;
        const val = Number(req.body.value);
        if (![1, -1].includes(val)) return res.status(400).json({ error: 'value must be 1 or -1' });

        const trick = await Trick.findOne({ where: { slug } });
        if (!trick) return res.status(404).json({ error: 'Trick not found' });

        const [row, created] = await TrickVote.findOrCreate({ where: { UserId: req.user.id, TrickId: trick.id }, defaults: { value: val, UserId: req.user.id, TrickId: trick.id } });
        if (!created) {
            if (row.value === val) {
                await row.destroy();
            } else {
                row.value = val;
                await row.save();
            }
        }

        const upvotes = await TrickVote.count({ where: { TrickId: trick.id, value: 1 } });
        const downvotes = await TrickVote.count({ where: { TrickId: trick.id, value: -1 } });
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

// Reflection endpoints (plain text, multilingual support, no votes)
export const getReflections = async (req, res) => {
    try {
        const limit = parseInt(req.query.limit) || 50;
        const reflections = await Reflection.findAll({
            order: [['createdAt', 'DESC']],
            limit,
            attributes: ['id','title','slug','createdAt','language'],
            include: [{ model: User, attributes: ['userName'], as: 'User' }]
        });
        const out = reflections.map(r => ({ id: r.id, title: r.title, slug: r.slug, createdAt: r.createdAt, language: r.language, User: r.User }));
        res.json(out);
    } catch (e) {
        console.error('getReflections error', e);
        res.status(500).json({ error: 'Internal' });
    }
};

export const getReflection = async (req, res) => {
    try {
        const slug = req.params.slug;
        const r = await Reflection.findOne({ where: { slug }, include: [{ model: User, attributes: ['userName','id'], as: 'User' }] });
        if (!r) return res.status(404).json({ error: 'Reflection not found' });
        res.json({ id: r.id, title: r.title, slug: r.slug, content: r.content, language: r.language, author: r.User, createdAt: r.createdAt });
    } catch (e) {
        console.error('getReflection error', e);
        res.status(500).json({ error: 'Internal' });
    }
};

export const createReflection = async (req, res) => {
    try {
        if (!req.user) return res.status(401).json({ error: 'Not authenticated' });
        if (!req.user.worm) return res.status(401).json({ error: 'Only worms can create reflections' });

        const { title, content, language } = req.body || {};
        if (!title || !content) return res.status(400).json({ error: 'title and content required' });

        const slugBase = (title || '').toString().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9\-]/g, '');
        let slug = slugBase || `reflection-${Date.now()}`;
        const exists = await Reflection.findOne({ where: { slug } });
        if (!exists) {
            return res.status(404).send(errPage(404, `Reflection ${title} was not found.`));
        
        }
        if (exists) slug = `${slug}-${Date.now()}`;

        const created = await Reflection.create({ title, content, language: language || null, slug, author: req.user.id });
        res.status(201).json({ message: 'Reflection created', reflection: { id: created.id, slug: created.slug, title: created.title } });
    } catch (e) {
        console.error('createReflection error', e);
        res.status(500).json({ error: 'Internal' });
    }
};