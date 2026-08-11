// On attend que le HTML soit complètement chargé
document.addEventListener("DOMContentLoaded", () => {

    // On récupère les éléments du DOM une fois qu'ils existent vraiment
    const loginForm = document.getElementById("loginForm");
    const lp = document.getElementById("passwordLabel");
    const lu = document.getElementById("usernameLabel");
    const me = document.getElementById("messagerror");

    // On vérifie que le formulaire existe bien pour éviter les bugs
    if (loginForm) {
        loginForm.addEventListener("submit", password);
    }

    function password(event) {
        event.preventDefault();

        const username = document.getElementById("username").value;
        const mdp = document.getElementById("password").value;

        if (username === "lesdevs" && mdp === "123456789") {
            // Optionnel : On change la couleur juste avant de partir, 
            // mais sache que la redirection est presque instantanée !
            lu.style.color = "green";
            lp.style.color = "green";
            
            window.location.href = "index.html"; 
        } else if (username === "administrateur" && mdp === "Robin2012!") {
            window.location.href = "adminlogin.html";
        } else if (username === "..." && mdp === "...") {
            alert("Vous êtes un ...");
        } else if (username === "jesuismoi" && mdp === "bruh") {
            alert("sale con");
        } else if (username === "fah" && mdp === "...") {
            alert('Aller ferme ta gueule !');
        } else {
            // En cas d'erreur, ça reste sur la page et ça applique le rouge
            lu.style.color = "red";
            lp.style.color = "red";
            if (me) me.textContent = "Nom d'utilisateur ou mot de passe incorrect.";
        }
    }
});
