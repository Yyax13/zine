import slugify from 'slugify';
import { Trick, User, Tag } from './db.js';

export const createTrick = async (req, res) => {
    try {
        const { title, content, short_description, tags } = req.body;
        
        // Validate required fields
        if (!title || !content) {
            return res.status(400).json({ error: 'Título e conteúdo são obrigatórios!' });
        }

        // Use authenticated user id from middleware
        const authorId = req.user?.id;
        if (!authorId) {
            return res.status(401).json({ error: 'Unauthenticated: missing user' });
        }

        const userRow = await User.findOne({ where: { id: authorId } });
        if (!userRow) return res.status(400).json({ error: 'Author not found' });

        // Generate slug from title
        const generatedSlug = slugify(title, {
            lower: true,
            strict: true,
            locale: 'pt',
        });

        // Check if slug already exists
        const existingTrick = await Trick.findOne({ where: { slug: generatedSlug } });
        if (existingTrick) {
            return res.status(409).json({ 
                error: `Já existe um trick com o slug "${generatedSlug}". Por favor, escolha um título diferente.` 
            });
        }

        // Create trick
        const newTrick = await Trick.create({
            title: title,
            slug: generatedSlug,
            content: content,
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
                    const normalized = slugify(String(tname), { lower: true, strict: true, locale: 'pt' });
                    if (!normalized) continue;
                    const [t] = await Tag.findOrCreate({ where: { name: normalized } });
                    await newTrick.addTag(t);
                } catch (e) {
                    console.error('Error creating tag', tname, e);
                }
            }
        }

        console.log('Trick salvo com sucesso:', newTrick.toJSON());
        const trickWithTags = await Trick.findByPk(newTrick.id, { include: [Tag] });
        res.status(201).json({ 
            message: 'Trick criado com sucesso!', 
            trick: trickWithTags.toJSON() 
        });

    } catch (error) {
        console.error('Erro ao salvar trick no DB:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao salvar o trick.' });
    }
};

export const updateTrick = async (req, res) => {
    try {
        const { slug } = req.params;
        const { title, content, short_description, tags } = req.body;
        const authorId = req.user?.id;
        
        if (!authorId) {
            return res.status(401).json({ error: 'Unauthenticated: missing user' });
        }

        const trick = await Trick.findOne({ where: { slug } });
        if (!trick) {
            return res.status(404).json({ error: 'Trick not found' });
        }

        // Check if user is the author
        if (trick.author !== authorId) {
            return res.status(403).json({ error: 'You can only edit your own tricks' });
        }

        // Update fields if provided
        if (title && title !== trick.title) {
            const newSlug = slugify(title, {
                lower: true,
                strict: true,
                locale: 'pt',
            });

            // Check if new slug conflicts with another trick
            if (newSlug !== slug) {
                const existingTrick = await Trick.findOne({ where: { slug: newSlug } });
                if (existingTrick) {
                    return res.status(409).json({ 
                        error: `Já existe um trick com o slug "${newSlug}". Por favor, escolha um título diferente.` 
                    });
                }
                trick.slug = newSlug;
            }
            trick.title = title;
        }

        if (content !== undefined) {
            trick.content = content;
        }

        if (short_description !== undefined) {
            trick.short_description = short_description || null;
        }

        await trick.save();

        // Update tags if provided
        if (tags !== undefined) {
            await trick.setTags([]);

            let tagList = [];
            if (Array.isArray(tags)) tagList = tags;
            else if (tags) tagList = String(tags).split(',').map(t => t.trim()).filter(Boolean);

            for (const tname of tagList) {
                try {
                    const normalized = slugify(String(tname), { lower: true, strict: true, locale: 'pt' });
                    if (!normalized) continue;
                    const [t] = await Tag.findOrCreate({ where: { name: normalized } });
                    await trick.addTag(t);
                } catch (e) {
                    console.error('Error creating tag', tname, e);
                }
            }
        }

        console.log('Trick atualizado com sucesso:', trick.toJSON());
        const trickWithTags = await Trick.findByPk(trick.id, { include: [Tag] });
        res.status(200).json({ 
            message: 'Trick atualizado com sucesso!', 
            trick: trickWithTags.toJSON() 
        });

    } catch (error) {
        console.error('Erro ao atualizar trick no DB:', error);
        res.status(500).json({ error: 'Erro interno do servidor ao atualizar o trick.' });
    }
};
