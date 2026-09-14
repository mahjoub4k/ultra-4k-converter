
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadDir = '/tmp';
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

app.post('/convert', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).send('No image uploaded.');
        }

        const outputFormat = req.body.format || 'png';
        const upscale4k = req.body.upscale_4k === 'yes';

        let ext = outputFormat;
        if (outputFormat === 'jpeg') ext = 'jpg';

        const outputFilename = `converted_${Date.now()}${upscale4k ? '_4k' : ''}.${ext}`;
        const outputPath = path.join(uploadDir, outputFilename);

        let imagePipeline = sharp(req.file.buffer);

        if (upscale4k) {
            imagePipeline = imagePipeline.resize({
                width: 3840,
                height: 2160,
                fit: 'inside',
                kernel: sharp.kernel.lanczos3
            });
        }

        if (outputFormat === 'jpeg') {
            await imagePipeline.jpeg({ quality: 100 }).toFile(outputPath);
        } else if (outputFormat === 'webp') {
            await imagePipeline.webp({ quality: 100 }).toFile(outputPath);
        } else {
            await imagePipeline.png({ quality: 100 }).toFile(outputPath);
        }

        res.download(outputPath, `converted_image.${ext}`, (err) => {
            if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath);
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('An error occurred while processing the image.');
    }
});

module.exports = app;

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server is running on http://localhost:${PORT}`);
    });
}
