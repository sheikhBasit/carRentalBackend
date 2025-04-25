const cloudinary = require("cloudinary").v2;
const fs = require("fs");
const path = require("path"); // Don't forget this import

cloudinary.config({ 
    cloud_name: 'dq4orzghg', 
    api_key: '945372436862786', 
    api_secret: 'YYjM2eBCJso3umUx2idi2xbi0L0'
});

const uploadOnCloudinary = async (localFilePath) => {
    try {
      // 1. Add early timeout check
      const startTime = Date.now();
      const MAX_UPLOAD_TIME = 10000; // 10 seconds
  
      // 2. Stream upload instead of full file upload
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) {
            console.error('Upload error:', error);
            return { success: false, error: error.message };
          }
          return { success: true, url: result.secure_url };
        }
      );
  
      // 3. Pipe file stream to Cloudinary
      fs.createReadStream(localFilePath)
        .on('error', (err) => {
          console.error('File read error:', err);
          return { success: false, error: 'File read failed' };
        })
        .pipe(uploadStream);
  
      // 4. Add timeout check
      if (Date.now() - startTime > MAX_UPLOAD_TIME) {
        throw new Error('Upload timed out');
      }
  
    } catch (error) {
      console.error('Upload failed:', error);
      return { success: false, error: error.message };
    }
  };
module.exports = { uploadOnCloudinary };