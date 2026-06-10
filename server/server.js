

// For the server sending the images/videos, I want to send n amount of videos at a time
// The client should request n amount of images between 2 indexes, so idx to idx + n
// The server should already have all the images loaded but not sent, so only send the correct images based on the index

// Import modules
const express = require("express");
const session = require("express-session");
const path = require("path");
const fs = require("fs/promises");
const cors = require("cors");
const sharp = require("sharp");
// Make express app
const app = express();

// Use global variables from .env file
require("dotenv").config();
const port = process.env.HOST_PORT;

// Use the static files in the client folder
app.use(express.static(path.join(__dirname, "..", "client"), {index: false}));
app.use("/imgs", express.static(path.join(__dirname, "imgs")));
app.use(express.json());
app.use(cors());
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        maxAge: 1000 * 60 * 60 * 24 // expire in 24 Hrs
    }
}));

// Dictionary for all images
let images = {};
let albums = [];
// Specify valid files
const valid_img_files = [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"];
const valid_vid_files = [".mp4", ".mov"];

// Check login
app.post("/api/login", function(request, response) {
    const { username, password } = request.body;

    if (username === "admin" && password == "bart-site"){
        request.session.isLoggedIn = true;
        response.status(200).json({ message: "Logged in successfully" }); 
    }
    else{
        response.status(401).json({ message: "Invalid username or password!" });
    }
});

// Send the starting website page, the login page
app.get("/", function(request, response){
    response.sendFile(path.join(__dirname,".." ,"client", "login.html"));
});

// Send the user to the photo gallery
app.get("/gallery", function(request, response){

    if (!request.session.isLoggedIn){
        return response.redirect("/");
    }
    response.sendFile(path.join(__dirname,".." ,"client", "index.html"));
});

// Function to load all images
async function LoadImages() {
    let imgs = {};
    const dir_path = path.join(__dirname, "imgs/");
    
    try {
        const items = await fs.readdir(dir_path);
        albums = items;
        for (const item of items) {
            const new_path = path.join(dir_path, item);
            
            // 3. Get the stats to check what this item is
            const stats = await fs.stat(new_path);
            
            if (stats.isDirectory()) {
                let folder_imgs = [];
                
                const all_files = await fs.readdir(new_path); 
                
                for (let file of all_files) {
                    const lower_file = file.toLowerCase();
                    
                    if (valid_img_files.some(file_ext => lower_file.includes(file_ext))) {
                        folder_imgs.push(`imgs/${item}/${file}`);
                    }
                }
                
                if (folder_imgs.length > 0) {
                    imgs[item] = folder_imgs;
                }
            }
        }
        
        return imgs;
        
    } catch (error) {
        console.log("Failed to load images:", error);
        return {}; // Return an empty object (not an array) so the frontend doesn't crash
    }
}

// SYNTAX FOR PARAMETERS: ?variable=1&variable=2& ...

// get method for getting a single full sized image
app.get("/api/get-single-image", async function(request, response){
    try {
        const idx = parseInt(request.query.img_idx) || 0;
        const album = request.query.album_name;
        
        const image_url = images[album][idx];
        if (!image_url) {
            return response.status(404).send("Image index out of bounds");
        }

        const filename = image_url.split('/').pop();
        const image_path = path.join(__dirname, "imgs", album, filename);
        response.type("image/webp");
        if (valid_img_files.some(file_ext => image_path.includes(file_ext))){
            // Use Sharp to dynamically resize
            sharp(image_path)
                .resize({
                    width: 1920,
                    height: 1080,
                    fit: 'inside', // Shrinks to fit within 1920x1080 WITHOUT cropping
                    withoutEnlargement: true // If the image is smaller than 1080p, leave it alone
                })
                .webp({ quality: 80 }) // Compress
                .pipe(response);
        }
        response.status(200);
            
    } catch (error) {
        console.error("Single image error:", error);
        // Use 500 for server errors instead of 404
        response.status(500).send("Couldn't load image"); 
    }
});

// App get method for sending the required images
app.get("/api/get-thumbnails", function(request, response) {
    const start_idx = parseInt(request.query.start_idx) || 0;
    const end_idx = parseInt(request.query.end_idx) || 10;
    const album = request.query.album_name;

    // Check if the album exists
    if (!album || !images[album]) {
        return response.status(404).send("Album not found");
    }
    // Get the chunk to send to the client
    const chunk = images[album].slice(start_idx, end_idx);
    // Get the thumbnails
    const thumbnail_urls = chunk.map(img => {
        const filename = img.split('/').pop();
        return `/api/thumbnail/${album}/${filename}`;
    });
    response.status(200).json(thumbnail_urls);
});

// Api for resizing and getting thumbnails
app.get("/api/thumbnail/:album/:filename", async function(request, response) {
    const album = request.params.album;
    const filename = request.params.filename;
    
    // 4. THE PATH FIX: Stitch the album folder back into the C-drive path
    const image_path = path.join(__dirname, "imgs", album, filename);
    
    try {
        await fs.access(image_path);
        
        // 5. Check if it's a valid image before running Sharp
        const lower_file = filename.toLowerCase();
        if (valid_img_files.some(file_ext => lower_file.includes(file_ext))) {
            response.type("image/jpeg");
            sharp(image_path)
                .resize({
                    width: 500,
                    withoutEnlargement: false,
                })
                .jpeg({ quality: 70 })
                .pipe(response);
        } else {
             response.status(400).send("Not a valid image type");
        }        
    }
    catch (error) {
        console.error("Thumbnail error:", error);
        response.status(404).send("Image not found");
    }
});

// Get the server to load the images again
app.post("/api/reload-images", async function(request, response){
    try{
        images = await LoadImages();
        response.status(200).send("Loaded images");
    }
    catch (error){
        console.log("Error:", error);
        response.status(404).send("Couldn't load images");
    }
});

// Send the album names to the client
app.get("/api/get-album-names", async function(request, response) {

    try{
        response.status(200).json(albums);
    }
    catch (error){
        console.log(error);
        response.status(500).send("failed to get album names");
    }
});

// Send the total number of images for an album
app.get("/api/get-total-album-images", async function(request, response){
    const album = request.query.album_name;
    if (!albums.includes(album)){
        response.status(500).send("Not a valid album");
    }
    else{
        response.status(200).json(images[album].length);
    }
})

// Start the server on the given port
app.listen(port, async function() {
    console.log(`hosting server on port: ${port}`);
});