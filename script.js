// Attend que le DOM soit entièrement chargé avant d'exécuter le script
document.addEventListener("DOMContentLoaded", function () {
    // Récupération des éléments HTML par leurs IDs
    const codePostalInput = document.getElementById("code-postal");
    const communeSelect = document.getElementById("selection-commune");
    const boutonRecherche = document.getElementById("bouton-recherche");
    const nombreJoursSlider = document.getElementById("nombre-jours");
    const nombreJoursActuel = document.querySelector(".nombre-jours-actuel");
    const previsionsContainer = document.getElementById("previsions-container");
    const joursLabels = document.querySelectorAll(".jour-label");
    
    // Initialisation du slider de nombre de jours
    initSliderJours();
    
    // Ajout d'un écouteur d'événement sur l'input du code postal
    codePostalInput.addEventListener("input", async function () {
        const codePostal = codePostalInput.value;
        
        // Vérification que le code postal est composé de 5 chiffres
        if (/^\d{5}$/.test(codePostal)) {
            // Si valide, recherche les communes correspondantes
            await rechercherCommunes(codePostal);
        } else {    
            // Sinon, réinitialise le select des communes et désactive les éléments
            communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
            communeSelect.disabled = true;
            boutonRecherche.disabled = true;
        }
    });
    
    // Fonction pour initialiser le slider de nombre de jours
    function initSliderJours() {
        // Écouteur pour le changement de valeur du slider
        nombreJoursSlider.addEventListener("input", function() {
            const valeur = this.value;
            nombreJoursActuel.textContent = valeur;
            
            // Mise à jour des labels actifs
            joursLabels.forEach(label => {
                label.classList.remove("active");
                if (label.dataset.jour === valeur) {
                    label.classList.add("active");
                }
            });
            
            // Mise à jour visuelle du slider
            updateSliderVisuel();
        });
        
        // Écouteurs pour les labels cliquables
        joursLabels.forEach(label => {
            label.addEventListener("click", function() {
                const jour = this.dataset.jour;
                nombreJoursSlider.value = jour;
                nombreJoursActuel.textContent = jour;
                
                // Mise à jour des classes actives
                joursLabels.forEach(l => l.classList.remove("active"));
                this.classList.add("active");
                
                // Mise à jour visuelle du slider
                updateSliderVisuel();
            });
        });
        
        // Initialisation visuelle
        updateSliderVisuel();
    }
    
    // Fonction pour mettre à jour l'apparence visuelle du slider
    function updateSliderVisuel() {
        const valeur = nombreJoursSlider.value;
        const max = nombreJoursSlider.max;
        const pourcentage = ((valeur - 1) / (max - 1)) * 100;
        
        // Mise à jour de la fill du slider
        const sliderFill = document.querySelector(".slider-fill");
        if (sliderFill) {
            sliderFill.style.width = pourcentage + "%";
        }
        
        // Mise à jour du thumb
        const sliderThumb = document.querySelector(".slider-thumb");
        if (sliderThumb) {
            sliderThumb.style.left = pourcentage + "%";
        }
    }
    
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
                communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
                
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
                communeSelect.innerHTML = '<option value="">Aucune commune trouvée</option>';
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
            const nombreJours = parseInt(nombreJoursSlider.value);
            rechercheMeteo(communeSelect.value, nombreJours);
        }
    });
    
    // Fonction asynchrone pour récupérer les données météo d'une commune
    async function rechercheMeteo(codeInsee, nombreJours = 1) {
        // Token d'authentification pour l'API Météo Concept
        const token = "8dbccf25d154d5362923efe8d3222f64f86689170efa3686df676d2941cc7d08";
        // URL de l'API avec le code INSEE et le token
        const url = `https://api.meteo-concept.com/api/forecast/daily?insee=${codeInsee}&token=${token}`;
        
        try {
            // Affichage d'un indicateur de chargement
            afficherChargement();
            
            // Appel à l'API météo
            const response = await fetch(url);
            const data = await response.json();
            
            if (data && data.forecast && data.forecast.length > 0) {
                // Affichage des prévisions pour le nombre de jours demandé
                afficherPrevisions(data.forecast.slice(0, nombreJours), data.city);
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
    
    // Fonction pour afficher un indicateur de chargement
    function afficherChargement() {
        previsionsContainer.innerHTML = `
            <div class="chargement">
                <div class="spinner"></div>
                <p>Chargement des prévisions...</p>
            </div>
        `;
    }
    
    // Fonction pour afficher les prévisions météo sur plusieurs jours
    function afficherPrevisions(forecasts, cityInfo) {
        // Vide le conteneur précédent
        previsionsContainer.innerHTML = '';
        
        // Création de l'en-tête avec informations de la ville
        const enTete = document.createElement('div');
        enTete.className = 'previsions-entete';
        enTete.innerHTML = `
            <h3>📍 ${cityInfo.name}</h3>
            <p class="info-ville">Prévisions pour ${forecasts.length} jour(s)</p>
        `;
        previsionsContainer.appendChild(enTete);
        
        // Création du conteneur grille pour les jours
        const grilleJours = document.createElement('div');
        grilleJours.className = 'grille-jours';
        
        // Parcourt chaque prévision et crée une carte
        forecasts.forEach((forecast, index) => {
            const carteJour = creerCarteJour(forecast, index);
            grilleJours.appendChild(carteJour);
        });
        
        previsionsContainer.appendChild(grilleJours);
    }
    
    // Fonction pour créer une carte de prévision pour un jour
    function creerCarteJour(forecast, index) {
        // Conversion de la date
        const date = new Date(forecast.datetime);
        const options = { 
            weekday: 'long', 
            day: 'numeric', 
            month: 'long' 
        };
        const dateFormatee = date.toLocaleDateString('fr-FR', options);
        
        // Détermination du titre du jour
        let titreJour;
        if (index === 0) {
            titreJour = "Aujourd'hui";
        } else if (index === 1) {
            titreJour = "Demain";
        } else {
            titreJour = dateFormatee.split(' ')[0]; // Jour de la semaine
        }
        
        // Obtention de l'icône météo
        const iconeMeteo = obtenirIconeMeteo(forecast.weather);
        
        // Création de l'élément carte
        const carte = document.createElement('div');
        carte.className = 'carte-jour';
        carte.innerHTML = `
            <div class="jour-header">
                <h4 class="jour-titre">${titreJour}</h4>
                <p class="jour-date">${dateFormatee}</p>
            </div>
            <div class="jour-icone">
                ${iconeMeteo}
            </div>
            <div class="jour-temperatures">
                <span class="temp-max">${forecast.tmax}°</span>
                <span class="temp-min">${forecast.tmin}°</span>
            </div>
            <div class="jour-details">
                <div class="detail-item">
                    <span class="detail-icone">🌧️</span>
                    <span class="detail-valeur">${forecast.probarain ?? 0}%</span>
                </div>
                <div class="detail-item">
                    <span class="detail-icone">☀️</span>
                    <span class="detail-valeur">${forecast.sun_hours ?? 0}h</span>
                </div>
            </div>
        `;
        
        return carte;
    }
    
    // Fonction pour obtenir l'icône météo appropriée
    function obtenirIconeMeteo(weather) {
        const icones = {
            0: "☀️", // Soleil
            1: "🌤️", // Peu nuageux
            2: "⛅", // Ciel voilé
            3: "🌥️", // Nuageux
            4: "☁️", // Très nuageux
            5: "🌦️", // Couvert
            6: "🌧️", // Brouillard
            7: "🌧️", // Brouillard givrant
            10: "🌦️", // Pluie faible
            11: "🌧️", // Pluie modérée
            12: "⛈️", // Pluie forte
            13: "🌦️", // Pluie faible verglaçante
            14: "🌧️", // Pluie modérée verglaçante
            15: "⛈️", // Pluie forte verglaçante
            16: "🌨️", // Bruine
            20: "❄️", // Neige faible
            21: "🌨️", // Neige modérée
            22: "🌨️❄️", // Neige forte
            30: "⛈️", // Pluie et neige mêlées faibles
            31: "⛈️", // Pluie et neige mêlées modérées
            32: "⛈️", // Pluie et neige mêlées fortes
            40: "⛈️", // Averses de pluie faible
            41: "⛈️", // Averses de pluie modérée
            42: "⛈️", // Averses de pluie forte
            43: "⛈️", // Averses de pluie faible et neige mêlées
            44: "⛈️", // Averses de pluie modérée et neige mêlées
            45: "⛈️", // Averses de pluie forte et neige mêlées
            60: "❄️", // Averses de neige faible
            61: "🌨️", // Averses de neige modérée
            62: "🌨️❄️", // Averses de neige forte
            70: "⛈️", // Orages faibles et locaux
            71: "⛈️", // Orages modérés et locaux
            72: "⛈️", // Orages fort et locaux
            73: "⛈️", // Orages faibles généralisés
            74: "⛈️", // Orages modérés généralisés
            75: "⛈️", // Orages forts généralisés
        };
        
        return icones[weather] || "🌫️";
    }
    
    // Fonction pour afficher un message d'erreur
    function afficherMessageErreur(message) {
        previsionsContainer.innerHTML = `
            <div class="message-erreur">
                <div class="erreur-icone">⚠️</div>
                <h3>Oops ! Une erreur s'est produite</h3>
                <p>${message}</p>
                <button class="bouton-retry" onclick="window.location.reload()">
                    Réessayer
                </button>
            </div>
        `;
    }
});