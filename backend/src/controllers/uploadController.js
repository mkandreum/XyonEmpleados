const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = require('../lib/prisma');

// Ensure uploads directories exist
const uploadsBase = path.join(__dirname, '../../uploads');
const publicDir = path.join(uploadsBase, 'public');
const privateDir = path.join(uploadsBase, 'private');

[publicDir, privateDir].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// Utils to determine storage type
const isPublicType = (fieldname) => ['logos', 'avatars', 'news'].includes(fieldname);

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const typeDir = isPublicType(file.fieldname) ? publicDir : privateDir;
        const uploadPath = path.join(typeDir, file.fieldname);

        if (!fs.existsSync(uploadPath)) {
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        // Prefijo con el id del usuario: permite verificar la propiedad al vincular/borrar el fichero
        const owner = String((req.user && req.user.userId) || 'anon').replace(/[^A-Za-z0-9_-]/g, '');
        cb(null, owner + '-' + uniqueSuffix + path.extname(file.originalname).toLowerCase());
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        'logos': /jpeg|jpg|png|gif/,
        'payrolls': /pdf/,
        'justifications': /jpeg|jpg|png|pdf/,
        'avatars': /jpeg|jpg|png/,
        'news': /jpeg|jpg|png|gif/
    };

    const fieldType = file.fieldname;
    const isExtValid = allowedTypes[fieldType]?.test(path.extname(file.originalname).toLowerCase());
    const isMimeValid = allowedTypes[fieldType]?.test(file.mimetype);

    if (isExtValid && isMimeValid) {
        return cb(null, true);
    } else {
        cb(new Error(`Invalid file type for ${fieldType}`));
    }
};

// Firmas (magic bytes) para no fiarse del mimetype/extension enviados por el cliente
const MAGIC = {
    '.png': [[0x89, 0x50, 0x4e, 0x47]],
    '.jpg': [[0xff, 0xd8, 0xff]],
    '.jpeg': [[0xff, 0xd8, 0xff]],
    '.gif': [[0x47, 0x49, 0x46, 0x38]],
    '.pdf': [[0x25, 0x50, 0x44, 0x46]]
};
const hasValidSignature = (filePath, ext) => {
    const sigs = MAGIC[ext];
    if (!sigs) return false;
    let fd;
    try {
        fd = fs.openSync(filePath, 'r');
        const buf = Buffer.alloc(8);
        fs.readSync(fd, buf, 0, 8, 0);
        return sigs.some(sig => sig.every((b, i) => buf[i] === b));
    } catch (e) {
        return false;
    } finally {
        if (fd !== undefined) fs.closeSync(fd);
    }
};

const upload = multer({
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    fileFilter: fileFilter
});

// Upload handlers
exports.uploadLogo = upload.single('logos');
exports.uploadPayroll = upload.single('payrolls');
exports.uploadJustification = upload.single('justifications');
exports.uploadAvatar = upload.single('avatars');
exports.uploadNewsImage = upload.single('news');

// Get file URL
exports.handleUpload = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const ext = path.extname(req.file.filename).toLowerCase();
        if (!hasValidSignature(req.file.path, ext)) {
            try { fs.unlinkSync(req.file.path); } catch (e) { /* ignore */ }
            return res.status(400).json({ error: 'El contenido del archivo no coincide con su tipo' });
        }

        let fileUrl;
        if (isPublicType(req.file.fieldname)) {
            // Static public URL
            fileUrl = `/uploads/public/${req.file.fieldname}/${req.file.filename}`;
        } else {
            // Secure API URL
            fileUrl = `/api/files/${req.file.fieldname}/${req.file.filename}`;
        }

        res.json({
            success: true,
            url: fileUrl,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Failed to upload file' });
    }
};

// Delete file
// Solo se pueden borrar ficheros dentro de uploads/public o uploads/private.
// Un usuario normal solo puede borrar ficheros que el mismo subio (prefijo userId-); ADMIN cualquiera.
exports.deleteFile = (req, res) => {
    try {
        const filepath = req.body.filepath || req.body.fileUrl;
        if (!filepath || typeof filepath !== 'string') {
            return res.status(400).json({ error: 'Filepath or fileUrl required' });
        }

        let baseDir;
        let relativePath;
        if (filepath.startsWith('/api/files/')) {
            baseDir = privateDir;
            relativePath = filepath.slice('/api/files/'.length);
        } else if (filepath.startsWith('/uploads/public/')) {
            baseDir = publicDir;
            relativePath = filepath.slice('/uploads/public/'.length);
        } else {
            return res.status(400).json({ error: 'Invalid file path' });
        }

        const fullPath = path.resolve(baseDir, relativePath);
        if (!fullPath.startsWith(path.resolve(baseDir) + path.sep)) {
            return res.status(403).json({ error: 'Access denied' });
        }

        const isAdmin = req.user && req.user.role === 'ADMIN';
        const fileName = path.basename(fullPath);
        if (!isAdmin && !fileName.startsWith(String(req.user.userId) + '-')) {
            return res.status(403).json({ error: 'Not allowed to delete this file' });
        }

        if (fs.existsSync(fullPath) && fs.statSync(fullPath).isFile()) {
            fs.unlinkSync(fullPath);
            res.json({ success: true, message: 'File deleted' });
        } else {
            res.status(404).json({ error: 'File not found' });
        }
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({ error: 'Failed to delete file' });
    }
};
