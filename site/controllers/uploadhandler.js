import multer from 'multer';
import slugify from 'slugify'; // Pra gerar slugs maneiros
import { Article, User, Tag } from './db.js'; // Seu modelo de artigo
import fs from 'fs/promises'; // Pra ler o arquivo upado

const storage = multer.memoryStorage(); // Armazena o arquivo em memória para processamento
const upload = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
        // Aceita text/markdown e arquivos com extensão .md (alguns clientes usam text/plain)
        const allowedMimes = ['text/markdown', 'text/x-markdown', 'text/plain'];
        const filename = (file.originalname || '').toLowerCase();
        const hasMdExt = filename.endsWith('.md');
        if (allowedMimes.includes(file.mimetype) || hasMdExt) {
            cb(null, true);
        } else {
            cb(new Error('Apenas arquivos Markdown (.md) são permitidos!'), false);
        }
    },
    limits: {
        fileSize: 1024 * 1024 * 10 // Limita o tamanho do arquivo a 10MB
    }
}).single('file'); // 'articleFile' é o nome do input type="file" no HTML

async function uploadArticle(req, res) {
    upload(req, res, async (err) => {
        console.log(err)
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        // Verifique se o arquivo, o título e o autor são obrigatórios.
        if (!req.file || !req.body.title) {
            return res.status(400).json({ error: 'Título e o arquivo do artigo são obrigatórios!' });
        }

    // short_description e tags podem ser opcionais.
    const { title, short_description, tags } = req.body;
        // Use authenticated user id from middleware
        const authorId = req.user?.id
        if (!authorId) {
            return res.status(401).json({ error: 'Unauthenticated: missing user' })
        }

        const userRow = await User.findOne({ where: { id: authorId } })
        if (!userRow) return res.status(400).json({ error: 'Author not found' })
        const author = userRow.userName

        const markdownContent = req.file.buffer.toString('utf8');
        
        const generatedSlug = slugify(title, {
            lower: true,
            strict: true,
            locale: 'pt',
        });

        try {
            const existingArticle = await Article.findOne({ where: { slug: generatedSlug } });
            if (existingArticle) {
                return res.status(409).json({ error: `Já existe um artigo com o slug "${generatedSlug}". Por favor, escolha um título diferente.` });
            }

            // Salvar no banco de dados. O modelo agora suporta tags.
            const newArticle = await Article.create({
                title: title,
                slug: generatedSlug,
                content: markdownContent,
                short_description: short_description || null,
                author: authorId,
            });

            // Process tags (accept comma-separated string or array)
            if (tags) {
                let tagList = [];
                if (Array.isArray(tags)) tagList = tags;
                else tagList = String(tags).split(',').map(t => t.trim()).filter(Boolean);

                for (const tname of tagList) {
                    try {
                        // Normalize tag name (slugified, lowercase)
                        const normalized = slugify(String(tname), { lower: true, strict: true, locale: 'pt' });
                        if (!normalized) continue;
                        const [t] = await Tag.findOrCreate({ where: { name: normalized } });
                        await newArticle.addTag(t);
                    } catch (e) {
                        console.error('Error creating tag', tname, e);
                    }
                }
            }

            console.log('Artigo salvo com sucesso:', newArticle.toJSON());
            // reload with tags
            const articleWithTags = await Article.findByPk(newArticle.id, { include: [Tag] });
            res.status(201).json({ message: 'Artigo enviado e salvo com sucesso!', article: articleWithTags.toJSON() });

        } catch (error) {
            console.error('Erro ao salvar artigo no DB:', error);
            res.status(500).json({ error: 'Erro interno do servidor ao salvar o artigo.' });
        }
    });
}

async function updateArticle(req, res) {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) {
            return res.status(400).json({ error: `Erro no upload: ${err.message}` });
        } else if (err) {
            return res.status(400).json({ error: err.message });
        }

        const { slug } = req.params;
        const { title, short_description, tags } = req.body;
        const authorId = req.user?.id;
        
        if (!authorId) {
            return res.status(401).json({ error: 'Unauthenticated: missing user' });
        }

        try {
            const article = await Article.findOne({ where: { slug } });
            if (!article) {
                return res.status(404).json({ error: 'Article not found' });
            }

            // Check if user is the author
            if (article.author !== authorId) {
                return res.status(403).json({ error: 'You can only edit your own articles' });
            }

            // Update fields if provided
            if (title && title !== article.title) {
                // Generate new slug if title changes
                const newSlug = slugify(title, {
                    lower: true,
                    strict: true,
                    locale: 'pt',
                });

                // Check if new slug conflicts with another article
                if (newSlug !== slug) {
                    const existingArticle = await Article.findOne({ where: { slug: newSlug } });
                    if (existingArticle) {
                        return res.status(409).json({ error: `Já existe um artigo com o slug "${newSlug}". Por favor, escolha um título diferente.` });
                    }
                    article.slug = newSlug;
                }
                article.title = title;
            }

            if (short_description !== undefined) {
                article.short_description = short_description || null;
            }

            // Update content if new file is provided
            if (req.file) {
                const markdownContent = req.file.buffer.toString('utf8');
                article.content = markdownContent;
            }

            await article.save();

            // Update tags if provided
            if (tags !== undefined) {
                // Remove all existing tags
                await article.setTags([]);

                let tagList = [];
                if (Array.isArray(tags)) tagList = tags;
                else if (tags) tagList = String(tags).split(',').map(t => t.trim()).filter(Boolean);

                for (const tname of tagList) {
                    try {
                        const normalized = slugify(String(tname), { lower: true, strict: true, locale: 'pt' });
                        if (!normalized) continue;
                        const [t] = await Tag.findOrCreate({ where: { name: normalized } });
                        await article.addTag(t);
                    } catch (e) {
                        console.error('Error creating tag', tname, e);
                    }
                }
            }

            console.log('Artigo atualizado com sucesso:', article.toJSON());
            const articleWithTags = await Article.findByPk(article.id, { include: [Tag] });
            res.status(200).json({ message: 'Artigo atualizado com sucesso!', article: articleWithTags.toJSON() });

        } catch (error) {
            console.error('Erro ao atualizar artigo no DB:', error);
            res.status(500).json({ error: 'Erro interno do servidor ao atualizar o artigo.' });
        }
    });
}

export { uploadArticle, updateArticle };
