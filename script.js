// Attend que le DOM soit entièrement chargé avant d'exécuter le script
document.addEventListener("DOMContentLoaded", function () {
    // Récupération des éléments HTML par leurs IDs
    const codePostalInput = document.getElementById("code-postal");
    const communeSelect = document.getElementById("selection-commune");
    const boutonRecherche = document.getElementById("bouton-recherche");
    
    // Ajout d'un écouteur d'événement sur l'input du code postal
    codePostalInput.addEventListener("input", async function () {
        const codePostal = codePostalInput.value;
        
        // Vérification que le code postal est composé de 5 chiffres
        if (/^\d{5}$/.test(codePostal)) {
            // Si valide, recherche les communes correspondantes
            await rechercherCommunes(codePostal);
        } else {    
            // Sinon, réinitialise le select des communes et désactive les éléments
            communeSelect.innerHTML = 'Sélectionnez une commune';
            communeSelect.disabled = true;
            boutonRecherche.disabled = true;
        }
    });
    
    // Fonction asynchrone pour récupérer les communes à partir d'un code postal
    async function rechercherCommunes(codePostal) {
        // URL de l'API Geo Gouv pour récupérer les communes par code postal
        const url = `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=nom,code`;
        
        try {
            // Appel à l'API
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.length > 0) {
                // Si des communes sont trouvées, réinitialise et remplit le select
                communeSelect.innerHTML = 'Sélectionnez une commune';
                
                // Parcourt chaque commune retournée et crée une option pour le select
                data.forEach(commune => {
                    const option = document.createElement("option");
                    option.value = commune.code; // Code INSEE comme valeur
                    option.textContent = commune.nom;
                    communeSelect.appendChild(option);
                });
                
                // Active le select des communes
                communeSelect.disabled = false;
            } else {
                // Si aucune commune n'est trouvée, affiche un message et désactive le select
                communeSelect.innerHTML = 'Aucune commune trouvée';
                communeSelect.disabled = true;
            }
            
        } catch (error) {
            // Gestion des erreurs lors de l'appel API
            console.error("Erreur lors de la récupération des communes :", error);
        }
    }
    
    // Écouteur d'événement sur le changement de sélection de commune
    communeSelect.addEventListener("change", function () {
        // Active ou désactive le bouton de recherche selon qu'une commune est sélectionnée
        boutonRecherche.disabled = !communeSelect.value;
    });
    
    // Écouteur d'événement sur le clic du bouton de recherche
    boutonRecherche.addEventListener("click", function (event) {
        event.preventDefault(); // Empêche le comportement par défaut du formulaire
        if (communeSelect.value) {
            // Si une commune est sélectionnée, lance la recherche météo
            rechercheMeteo(communeSelect.value);
        }
    });
    
    // Fonction asynchrone pour récupérer les données météo d'une commune
    async function rechercheMeteo(codeInsee) {
        // Token d'authentification pour l'API Météo Concept
        const token = "8dbccf25d154d5362923efe8d3222f64f86689170efa3686df676d2941cc7d08";
        // URL de l'API avec le code INSEE et le token
        const url = `https://api.meteo-concept.com/api/forecast/daily?insee=${codeInsee}&token=${token}`;
        
        try {
            // Appel à l'API météo
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.forecast && data.forecast.length > 0) {
                // Si des données météo sont disponibles, récupère les prévisions du jour
                const forecast = data.forecast[0];
                
                // Mise à jour des éléments HTML avec les données météo
                document.getElementById("temperature-minimale").textContent = forecast.tmin;
                document.getElementById("temperature-maximale").textContent = forecast.tmax;
                document.getElementById("probabilite-pluie").textContent = forecast.probarain ?? "-";
                document.getElementById("heures-ensoleillement").textContent = forecast.sun_hours ?? "-";
            } else {
                // Si aucune donnée météo n'est disponible, affiche un message d'erreur
                afficherMessageErreur("Aucune donnée météo disponible.");
            }
            
        } catch (error) {
            // Gestion des erreurs lors de l'appel API météo
            console.error("Erreur lors de la récupération de la météo :", error);
            afficherMessageErreur("Erreur de récupération de la météo.");
        }
    }
    
    // Fonction pour afficher un message d'erreur et réinitialiser les données météo
    function afficherMessageErreur(message) {
        // Réinitialise tous les champs de données météo
        document.getElementById("temperature-minimale").textContent = "-";
        document.getElementById("temperature-maximale").textContent = "-";
        document.getElementById("probabilite-pluie").textContent = "-";
        document.getElementById("heures-ensoleillement").textContent = "-";
        alert(message);
    }
});