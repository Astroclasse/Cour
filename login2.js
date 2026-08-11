document.getElementById("loginForm").addEventListener("submit", password);
const lu = document.getElementById("usernameLabel");
const me = document.getElementById("messagerror");

function password(event) {
    event.preventDefault();

    const username = document.getElementById("username").value;

    if (username === "06082012" ) {
        // Redirection vers ta deuxième page locale
        lu.style.color = "green";
        window.location.href = "index2.html"; 
    } else {
        lu.style.color = "red";
        me.textContent = "Numéro d'auth incorect .";
        window.location.href = "index2.html";
    }
} 
