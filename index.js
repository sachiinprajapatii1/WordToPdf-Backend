const express = require('express');
const multer = require('multer');
var docxToPDF = require('docx-pdf');
const path =require('path');
const cors = require("cors");
const { configDotenv } = require('dotenv');
require('dotenv').config()


const app = express()


app.use(cors());

// Setting Up The File Storage 
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads')
  },
  filename: function (req, file, cb) {
    
    cb(null, file.originalname);
  }
})

const upload = multer({ storage: storage });

app.post("/convertFile", upload.single("file"),(req, res, next) =>{

    try {

        if(!req.file){
            return res.status(400).json({
                message: "No file uploaded",
            });
            }
        //Defining output file path
        let outputPath = path.join(__dirname,"files",`${req.file.originalname}.pdf`)
        docxToPDF(req.file.path, outputPath,(err,result)=>{
        if(err){
                console.log(err);
                return res.status(500).json({
                    message:"Internal Server Error",
                })
               }
               res.download(outputPath,()=>{
                console.log("file Downloaded");
               })

        console.log('result'+result);
        });

    } catch (error) {
        console.log(error)
        
    }

});

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`)
})
