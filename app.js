const express = require('express');
const path = require('path')
const multer = require('multer');
const fs = require('fs');
const { PDFDocument } = require('pdf-lib');
const pdf2pic = require('pdf2pic');
const { ExtractImages } = require("pdf-image-extractor");
const app = express();

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads');
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  },
});

const upload = multer({ storage: storage });

// Serve HTML page for file upload
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Handle file upload and image extraction
app.post('/upload', upload.single('pdf'), async (req, res) => {
  try {
    const pdfFilePath = req.file.path;
    
    // Read the PDF file
    const pdfBytes = fs.readFileSync(pdfFilePath);
    let blob = new Blob([pdfBytes]);
    const fileType = "blob";
    
    const fileBaseName = path.basename(pdfFilePath).replace(/\.[^/.]+$/, "")
    // Note fileBaseName will contain the Date string already
    const directoryName = `./output/${fileBaseName}`

    const imageFiles = [];
    ExtractImages({ pdf: blob, fileType: fileType }).then(async (images) => {
      
      fs.mkdirSync(directoryName)
      for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const buffer = await image.blob.arrayBuffer();
        const imgFileName = `${directoryName}/${i}.jpg`;

        fs.createWriteStream(imgFileName).write(Buffer.from(buffer));
        imageFiles.push(imgFileName)
      }
    });

    // Send the paths of the extracted images as JSON response
    res.json({ directoryName });
  } catch (error) {
    console.error('Error extracting images:', error);
    res.status(500).json({ error: 'Failed to extract images' });
  }

});

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// Serve extracted images
app.use('/output', express.static('output'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
