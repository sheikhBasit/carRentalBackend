const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({ 
    cloud_name: 'dq4orzghg', 
    api_key: '945372436862786', 
    api_secret: 'YYjM2eBCJso3umUx2idi2xbi0L0' // Click 'View Credentials' below to copy your API secret
}); 

const uploadOnCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: "user_documents",
        resource_type: "auto" 
      },
      (error, result) => {
        error ? reject(error) : resolve(result);
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { uploadOnCloudinary };