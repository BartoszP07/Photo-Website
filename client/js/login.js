let login_btn = document.getElementById("login-btn");

login_btn.addEventListener("click", async function(event){
    event.preventDefault();

    const username_input = document.getElementById("username").value;
    const password_input = document.getElementById("password").value;

    try{
        const response = await fetch("/api/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                username: username_input,
                password: password_input
            })
        });

        if (response.ok){
            window.location.href = "/gallery";
        }
        else{
            
        }
    }
    catch (error){
        console.error("Login request failed:", error);
    }
    
});