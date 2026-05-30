const express = require('express');
const multer = require('multer');
const CloudConvert = require('cloudconvert');
const axios = require('axios');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

// Folders create karo agar nahi hain
if (!fs.existsSync('uploads')) fs.mkdirSync('uploads');

// Multer setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads'),
  filename: (req, file, cb) => cb(null, file.originalname),
});
const upload = multer({ storage });

// CloudConvert setup
const cloudConvert = new CloudConvert(process.env.CLOUDCONVERT_API_KEY);

app.post('/convertFile', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded' });
  }

  try {
    const baseName = path.parse(req.file.originalname).name;

    // Step 1 — Job banao
    const job = await cloudConvert.jobs.create({
      tasks: {
        'upload-file': {
          operation: 'import/upload'
        },
        'convert-file': {
          operation: 'convert',
          input: 'upload-file',
          input_format: 'docx',
          output_format: 'pdf',
        },
        'export-file': {
          operation: 'export/url',
          input: 'convert-file'
        }
      }
    });

    // Step 2 — File upload karo CloudConvert pe
    const uploadTask = job.tasks.find(t => t.name === 'upload-file');
    await cloudConvert.tasks.upload(
      uploadTask,
      fs.createReadStream(req.file.path),
      req.file.originalname
    );

    // Step 3 — Wait karo job complete hone tak
    const completedJob = await cloudConvert.jobs.wait(job.id);

    // Step 4 — PDF ka URL lo
    const exportTask = completedJob.tasks.find(t => t.name === 'export-file');
    const fileUrl = exportTask.result.files[0].url;

    // Step 5 — PDF user ko bhejo
    const pdfResponse = await axios.get(fileUrl, { responseType: 'stream' });

    res.setHeader('Content-Disposition', `attachment; filename="${baseName}.pdf"`);
    res.setHeader('Content-Type', 'application/pdf');
    pdfResponse.data.pipe(res);

    // Cleanup — uploaded file delete karo
    fs.unlink(req.file.path, () => {});

  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ 
      message: 'Conversion failed', 
      error: error.message 
    });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));