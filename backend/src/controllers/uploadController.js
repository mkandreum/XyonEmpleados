const { PrismaClient } = require('@prisma/client');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(uploadsDir, file.fieldname);
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
        'news': /jpeg|jpg|png|gif/ // Added news
    };

    const fieldType = file.fieldname;
    const extname = allowedTypes[fieldType]?.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes[fieldType]?.test(file.mimetype);

    if (extname && mimetype) {
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
exports.uploadNewsImage = upload.single('news'); // Added handler

// Get file URL
exports.handleUpload = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const fileUrl = `/uploads/${req.file.fieldname}/${req.file.filename}`;
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

        const fullPath = path.join(__dirname, '../../', filepath);
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
