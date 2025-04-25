const cloudinary = require("cloudinary").v2;
const fs = require("fs");



cloudinary.config({ 
    cloud_name: 'dq4orzghg', 
    api_key: '945372436862786', 
    api_secret: 'YYjM2eBCJso3umUx2idi2xbi0L0' // Click 'View Credentials' below to copy your API secret
}); 
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) return null;
        
        // Verify file exists before uploading
        if (!fs.existsSync(localFilePath)) {
            console.error('File not found:', localFilePath);
            return null;
        }

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto"
        });

        console.log("File uploaded to Cloudinary:", response.url);
        
        // Try to delete the local file, but don't fail if it doesn't exist
        try {
            fs.unlinkSync(localFilePath);
        } catch (unlinkError) {
            console.warn('Could not delete temp file:', unlinkError.message);
        }
        
        return response;

    } catch (error) {
        console.error('Cloudinary upload error:', error);
        
        // Attempt to delete the local file if it exists
        if (localFilePath && fs.existsSync(localFilePath)) {
            try {
                fs.unlinkSync(localFilePath);
            } catch (unlinkError) {
                console.warn('Could not delete temp file after failed upload:', unlinkError.message);
            }
        }
        
        return null;
    }
};
module.exports =  {uploadOnCloudinary};




