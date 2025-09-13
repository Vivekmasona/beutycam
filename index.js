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
app.use(express.static(path.join(__dirname, "public")));

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

// Route: gallery at /aman
app.get("/aman", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "aman.html"));
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
