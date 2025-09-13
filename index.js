import express from "express";
import fs from "fs";
import path from "path";
import puppeteer from "puppeteer";

const app = express();
const PORT = process.env.PORT || 3000;

const photosDir = path.join(process.cwd(), "photos");
if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir);

app.get("/capture", async (req, res) => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"]
    });
    const page = await browser.newPage();

    // load empty page with camera access
    await page.setContent(`
      <html>
        <body>
          <video autoplay playsinline id="video"></video>
          <canvas id="canvas"></canvas>
          <script>
            navigator.mediaDevices.getUserMedia({ video: true })
              .then(stream => {
                document.getElementById("video").srcObject = stream;
              });
          </script>
        </body>
      </html>
    `);

    await new Promise(r => setTimeout(r, 2000)); // wait for video

    const savedFiles = [];
    for (let i = 0; i < 5; i++) {
      const filename = `photo_${Date.now()}_${i}.png`;
      const filepath = path.join(photosDir, filename);
      const screenshot = await page.screenshot({ path: filepath });
      savedFiles.push(`/photos/${filename}`);
      await new Promise(r => setTimeout(r, 1000)); // 1 sec gap
    }

    await browser.close();

    res.json({ success: true, files: savedFiles });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to capture photos" });
  }
});

// static serve photos
app.use("/photos", express.static(photosDir));

app.listen(PORT, () => console.log(`✅ Server running http://localhost:${PORT}`));
