
// Check if the user is logged in
if (sessionStorage.getItem("isLoggedIn" !== "true")){
    window.location.href = "/";
}

// Get the div the buttons are in
let btn_div = document.getElementById("img-btn-div");
let html_buttons;
let image_buttons = [];
let album_buttons = [];

// Get all of the elements to be used
let img_overlay_div = document.getElementById("img-overlay-div");
let big_img = document.getElementById("big-image");
let big_vid = document.getElementById("big-video");
let previous_img_btn = document.getElementById("prev-btn");
let next_img_btn = document.getElementById("next-btn");
let back_btn = document.getElementById("back-btn");
let page_number_p = document.getElementById("page-number");
let next_page_btn = document.getElementById("next-page-btn");
let prev_page_btn = document.getElementById("prev-page-btn");
let page_navigation_div = document.getElementById("page-navigation-div");
let album_navigation_div = document.getElementById("album-navigation-div");

// Give the image buttons functions
previous_img_btn.addEventListener("click", PreviousImage);
next_img_btn.addEventListener("click", NextImage);
back_btn.addEventListener("click", ReturnBigImg);
next_page_btn.addEventListener("click", NextPage);
prev_page_btn.addEventListener("click", PrevPage);

// Save the index of the current image from the pressed button index
let current_image = 0;
let total_page_images = 30;
let page = 0;
let total_pages = 0;
let current_images = [];
let total_images = 0;
let album_names = [];
let total_albums = [];
let current_album = "none";

const valid_img_files = [".jpg", ".jpeg", ".png", ".JPG", ".JPEG", ".PNG"]
const valid_vid_files = [".mp4", ".mov"]

// Scroll to the top of the website
function ScrollTopPage(){
    document.body.scrollTop = 0;
    document.documentElement.scrollTop = 0;
}

// Go back a page
async function PrevPage(){
    page -= 1;
    if (page < 0) { page = total_pages }
    // Update the page number info
    page_number_p.textContent = `Page: ${page} / ${total_pages}`
    ScrollTopPage();
    await GetImages();
}

// Go up a page
async function NextPage() {
    page += 1;
    if (page > total_pages) { page = 0 }
    // Update the page number info
    page_number_p.textContent = `Page: ${page} / ${total_pages}`
    ScrollTopPage();
    await GetImages();
}

// Click function for an image button
async function ImageButtonClick(event){
    // Get the button which was pressed
    const pressed_button = event.target.closest(".img-btn");
    // Get the index of the button in the array
    current_image = image_buttons.indexOf(pressed_button);
    btn_div.style.display = "none";
    img_overlay_div.style.display = "flex";
    page_navigation_div.style.display = "none";
    album_navigation_div.style.display = "none";
    LoadBigImage();
}

// Function to initialise and load the big image
async function LoadBigImage(){
    big_img.src = `/api/get-single-image?img_idx=${current_image + (page * total_page_images)}&album_name=${current_album}`;
    // Check if the image is portrait or landscape when its loaded
    big_img.onload = function(){
        const width = big_img.naturalWidth;
        const height = big_img.naturalHeight;
        if (width > height){
            big_img.classList.add("wide");
        }
        else{
            big_img.classList.remove("wide");
        }
    }
}

// Go to the next image on the big image view
async function NextImage(){
    current_image += 1;
    if (current_image > total_page_images-1) { current_image = 0; page += 1; }
    if (current_image >= (total_images - page * total_page_images)-1) { current_image = (total_images - page * total_page_images)-1 }
    if (page > total_pages) { page -= 1; current_image = total_page_images-1;}
    await LoadBigImage();
}

// Go to the previous image on the big image view
async function PreviousImage(){
    current_image -= 1;
    if (current_image < 0) {
        page -= 1;
        if (page < 0) {
            page = 0;
            current_image += 1;
        }
        else{
        current_image = (total_images - (page+1) * total_page_images)-1;
        }
    }
    await LoadBigImage();
}

// Button function to return to the gallery
async function ReturnBigImg(){
    btn_div.style.display = "grid";
    img_overlay_div.style.display = "none";
    page_navigation_div.style.display = "flex";
    album_navigation_div.style.display = "flex";
    await GetImages();
    CalculateTotalPages();
}

// Function to get the images from the server and create buttons
async function GetImages(){
    const start_idx = (total_page_images * page);
    const end_idx = start_idx + total_page_images;

    try{
        const request = await fetch(`/api/get-thumbnails?start_idx=${start_idx}&end_idx=${end_idx}&album_name=${current_album}`);
        const response = await request.json();
        current_images = response;
    
        CreateButtons();

        // Get image buttons
        html_buttons = document.getElementsByClassName("img-btn");
        image_buttons = Array.from(html_buttons);
        // Add an event listener to each button
        image_buttons.forEach(button => {
            button.addEventListener("click", ImageButtonClick);
        });
    
    }
    catch (error){
        console.log("something happend", error);
    }
} 

// Create new buttons for the div
function CreateButtons(){
    btn_div.textContent = "";
    for (let i = 0; i < current_images.length; i++){
        const btn = ImageCreateButton(current_images[i]);
        btn_div.appendChild(btn);
    }
}

// Function to create a single button
function ImageCreateButton(src){
    const btn = document.createElement("button");
    btn.classList.add("img-btn");
    if (valid_img_files.some(file_ext => src.includes(file_ext))){
        const img = document.createElement("img");
        img.src = src;
        img.loading = "lazy";
        btn.appendChild(img);
    }
    else if (valid_vid_files.some(file_ext => src.includes(file_ext))){
        const video = document.createElement("video");
        video.src = src;
        video.loading = "lazy";
        btn.appendChild(video);
    }
    
    btn.addEventListener("click", ImageButtonClick);
    return btn;
}

// Function to create album buttons
function CreateAlbumButtons(){
    album_navigation_div.innerHTML = "";
    for (let i = 0; i < total_albums; i++){
        const btn = document.createElement("button");
        btn.textContent = album_names[i];
        btn.classList.add("album-nav-btn");
        btn.addEventListener("click", SelectAlbumButton);
        album_navigation_div.appendChild(btn);
    }
    // Get list of all buttons
    album_buttons = Array.from(document.getElementsByClassName("album-nav-btn"));
    // Select the first album button
    album_buttons[0].classList.add("selected");
}

// Function for album buttons
async function SelectAlbumButton(event){
    const button = event.target;

    page = 0;
    
    // Reset all buttons
    for (let i = 0; i < total_albums; i++){
        album_buttons[i].classList.remove("selected");
    }
    button.classList.add("selected");
    current_album = button.textContent;
    await GetImages();
    await GetTotalAlbumImages();
}

function CalculateTotalPages(){
    // Calculate the total pages
    total_pages = Math.ceil(total_images / total_page_images) - 1;
    // Update the page number info
    page_number_p.textContent = `Page: ${page} / ${total_pages}`
}

async function GetTotalAlbumImages(){
    try{
        const request = await fetch(`/api/get-total-album-images?album_name=${current_album}`, {
            method: "GET"
        });
        total_images = await request.json();
        CalculateTotalPages();
    }
    catch (error){
        console.log("error:", error)
    }
}

// Code runs when the window loads -- initialises everyting
window.addEventListener("load", async function(event){
    try{
        await fetch(`/api/reload-images`, {
            method: "POST"
        });
    }
    catch (error){
        console.log(error);
    }

    try{
        // Request to get the album names
        request = await fetch("/api/get-album-names", {
            method: "GET"
        });
        album_names = await request.json();
        total_albums = album_names.length;
        current_album = album_names[0];
    }
    catch (error){
        console.log(error);
    }

    // Get to the total images the server has to send
    await GetTotalAlbumImages();
    CreateAlbumButtons();
    await GetImages();
});