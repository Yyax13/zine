import { File } from './db.js';
import multer from 'multer';
import sharp from 'sharp';
import { fileTypeFromBuffer } from 'file-type';
import slugify from 'slugify';
import errorPage from '../modules/error.js';
import fs from 'fs/promises';
import path from 'path';
import { __dirname } from '../server.js';

const storage = multer.memoryStorage();
const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        const allowedMimes = [
            'text/markdown', 'text/x-markdown', 'text/plain',
            'image/svg+xml', 'image/webp', 'image/png', 'image/jpeg',
            'application/zip', 'application/gzip', 'application/x-tar', 'application/x-7z-compressed', 'application/octet-stream'
        ];
        const filename = (file.originalname || '').toLowerCase();
        const hasAllowedExt = /\.(md|svg|webp|png|jpeg|jpg|txt|zip|gz|tgz|tar|7z|bin|exe)$/i.test(filename);
        if (allowedMimes.includes(file.mimetype) || hasAllowedExt) return cb(null, true);
        cb(new Error('Tipo de arquivo não suportado. Use apenas arquivos de texto (md/txt), imagens ou arquivos binários/arquivos compactados.'));
    },
    limits: { fileSize: 1024 * 1024 * 128 }
}).single('newFile');

async function getFromStorage(req, res) {
    const { f: fileKey } = req.params;
    const file = await File.findOne({ where: { slug: fileKey } });
    if (!file) return res.status(404).send(errorPage(404, 'File not found'));

    res.contentType(file.mime || 'application/octet-stream');

    // Serve disk files with attachment header to force download (safer than exposing raw public URL)
    if (file.disk_path) {
        try {
            const absolute = path.resolve(file.disk_path);
            const publicRoot = path.resolve(path.join(__dirname, 'public'));
            if (!absolute.startsWith(publicRoot)) {
                console.error('Attempt to access file outside public root:', absolute);
                return res.status(403).send(errorPage(403, 'Access denied'));
            }
            const filename = file.title ? file.title.replace(/[^A-Za-z0-9._-]/g, '_') : path.basename(absolute);
            res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
            return res.sendFile(absolute);
        } catch (e) {
            console.error('Error serving disk file', e);
            return res.status(500).send(errorPage(500, 'Error reading file'));
        }
    }

    // If a public link is present (wallpapers) keep redirect behavior
    if (file.link) return res.redirect(file.link);

    if (file.buff === null || file.buff === undefined) return res.status(404).send(errorPage(404, 'File not found'));

    res.setHeader('Content-Disposition', `attachment; filename="${file.title || file.slug}"`);
    res.status(200).send(Buffer.from(file.buff));
}

const resizeFile = async (buffer, quality = 1024) => {
    return await sharp(buffer).resize({ width: quality }).toBuffer();
};

function insertIntoStorage(req, res) {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) return res.status(400).json({ error: `Upload error: ${err.message}` });
        if (err) return res.status(400).json({ error: err.message });

        if (!req.file || !req.body.title) return res.status(400).json({ error: 'Both file and title are required.' });

        const { title } = req.body;
        let baseSlug = slugify(title, { lower: true, strict: true, locale: 'pt' });
        let slug = baseSlug;

        try {
            const existing = await File.findOne({ where: { slug } });
            if (existing) slug = `${baseSlug}-${Date.now()}`;
            let mimeFromFile = (await fileTypeFromBuffer(req.file.buffer))?.mime ?? 'unknown';

            const isWallpaper = String(title || '').toLowerCase().startsWith('wallpaper') && mimeFromFile.startsWith('image/');

            if (isWallpaper) {
                const outBuffer = await resizeFile(req.file.buffer, 2048);
                let ext = 'bin';
                if (mimeFromFile === 'image/png') ext = 'png';
                else if (mimeFromFile === 'image/webp') ext = 'webp';
                else if (mimeFromFile === 'image/svg+xml') ext = 'svg';
                else if (mimeFromFile === 'image/jpeg') ext = 'jpg';

                const targetDir = path.join(__dirname, 'public', 'img', 'wallpapers');
                await fs.mkdir(targetDir, { recursive: true });

                const filename = `${slug}.${ext}`;
                const targetPath = path.join(targetDir, filename);
                await fs.writeFile(targetPath, outBuffer);

                const publicLink = `/img/wallpapers/${filename}`;
                const created = await File.create({ slug, title, buff: null, link: publicLink, mime: req.file.mimetype || 'application/octet-stream' });
                return res.status(201).json({ message: 'Wallpaper uploaded successfully', file: { slug: created.slug, title: created.title, mime: created.mime, link: created.link, createdAt: created.createdAt } });
            }

            const created = await File.create({
                slug,
                title,
                buff: mimeFromFile.startsWith('image/') ? await resizeFile(req.file.buffer, title.startsWith('wallpaper') ? 2048 : 1024) : req.file.buffer,
                mime: req.file.mimetype || 'application/octet-stream'
            });

            return res.status(201).json({ message: 'File uploaded successfully', file: { slug: created.slug, title: created.title, mime: created.mime, createdAt: created.createdAt } });
        } catch (e) {
            console.error('Error saving file to DB:', e);
            return res.status(500).json({ error: 'Internal server error while saving file.' });
        }
    });
}

// Attach a binary/file to a given trick (writes file to public/tricks_bins/<trickSlug>)
function attachTrickBinary(req, res) {
    upload(req, res, async (err) => {
        if (err instanceof multer.MulterError) return res.status(400).json({ error: `Upload error: ${err.message}` });
        if (err) return res.status(400).json({ error: err.message });

        if (!req.file) return res.status(400).json({ error: 'File is required' });

        const trickSlug = req.params.slug;
        if (!trickSlug) return res.status(400).json({ error: 'Trick slug required in URL' });

        try {
            const { Trick } = await import('./db.js');
            const trick = await Trick.findOne({ where: { slug: trickSlug } });
            if (!trick) return res.status(404).json({ error: 'Trick not found' });

            const ft = await fileTypeFromBuffer(req.file.buffer).catch(() => null);
            const ext = (ft && ft.ext) ? ft.ext : (path.extname(req.file.originalname) || '').replace('.', '') || 'bin';
            const forbiddenExt = ['html', 'htm', 'js', 'php', 'py', 'pl', 'sh', 'bash', 'cgi'];
            if (forbiddenExt.includes(ext.toLowerCase())) return res.status(400).json({ error: 'File type not allowed for trick attachments' });

            const targetDir = path.join(__dirname, 'public', 'tricks_bins', trickSlug);
            await fs.mkdir(targetDir, { recursive: true });

            const base = slugify((req.body.title || req.file.originalname || 'attachment').slice(0, 60), { lower: true, strict: true, locale: 'pt' }) || 'file';
            const filename = `${base}-${Date.now()}.${ext}`;
            const targetPath = path.join(targetDir, filename);
            await fs.writeFile(targetPath, req.file.buffer, { mode: 0o600 });

            let baseSlug = slugify(req.body.title || req.file.originalname || `${trickSlug}-attach`, { lower: true, strict: true, locale: 'pt' });
            let slug = baseSlug;
            const existing = await File.findOne({ where: { slug } });
            if (existing) slug = `${baseSlug}-${Date.now()}`;

            const created = await File.create({
                slug,
                title: req.body.title || req.file.originalname || filename,
                buff: null,
                disk_path: targetPath,
                trick: trick.id,
                mime: req.file.mimetype || (ft && ft.mime) || 'application/octet-stream'
            });

            return res.status(201).json({ message: 'Attachment stored', file: { slug: created.slug, title: created.title, mime: created.mime, createdAt: created.createdAt } });
        } catch (e) {
            console.error('Error attaching trick binary:', e);
            return res.status(500).json({ error: 'Internal error' });
        }
    });
}

export { getFromStorage, insertIntoStorage, attachTrickBinary };