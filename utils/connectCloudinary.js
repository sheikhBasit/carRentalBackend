// Updated uploadOnCloudinary function to ensure valid image URL format
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");

cloudinary.config({ 
    cloud_name: 'dq4orzghg', 
    api_key: '945372436862786', 
    api_secret: 'YYjM2eBCJso3umUx2idi2xbi0L0'
}); 

const uploadOnCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { 
        folder: "user_documents",
        resource_type: "image", // Explicitly set resource_type to "image"
        format: "jpg",          // Force format to jpg
        transformation: [       // Ensure it's processed as an image
          { quality: "auto" }
        ]
      },
      (error, result) => {
        if (error) {
          reject(error);
        } else {
          // Ensure URL has proper image extension
          // If result.url doesn't end with image extension, append .jpg
          const url = result.url;
          const secureUrl = result.secure_url;
          
          // Check if URL already has an image extension
          const hasImageExt = /\.(jpg|jpeg|png|webp|gif)$/i.test(url);
          
          // If not, create URL with extension
          const finalUrl = hasImageExt ? url : `${url}.jpg`;
          const finalSecureUrl = hasImageExt ? secureUrl : `${secureUrl}.jpg`;
          
          resolve({
            ...result,
            url: finalUrl,
            secure_url: finalSecureUrl
          });
        }
      }
    );
    
    streamifier.createReadStream(buffer).pipe(uploadStream);
  });
};

module.exports = { uploadOnCloudinary };