const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

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
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

// File filter
const fileFilter = (req, file, cb) => {
    const allowedTypes = {
        'logos': /jpeg|jpg|png|gif|svg/,
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
exports.deleteFile = (req, res) => {
    try {
        const { filepath } = req.body;
        if (!filepath) {
            return res.status(400).json({ error: 'Filepath required' });
        }

        // Determine if path is public static or API route
        // API route format: /api/files/payrolls/filename.pdf
        // Public static format: /uploads/public/logos/filename.png

        let fullPath;
        if (filepath.startsWith('/api/files/')) {
            const relativePath = filepath.replace('/api/files/', '');
            fullPath = path.join(privateDir, relativePath);
        } else if (filepath.startsWith('/uploads/public/')) {
            const relativePath = filepath.replace('/uploads/public/', '');
            fullPath = path.join(publicDir, relativePath);
        } else {
            // Legacy or invalid support
            fullPath = path.join(__dirname, '../../', filepath);
        }

        if (fs.existsSync(fullPath)) {
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
