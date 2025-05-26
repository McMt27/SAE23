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
    const checkboxLatitude = document.getElementById("afficher-latitude");
    const checkboxLongitude = document.getElementById("afficher-longitude");
    
    // Variable pour stocker les données de la commune actuelle
    let communeActuelle = null;
    
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
            communeActuelle = null;
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
        // URL de l'API Geo Gouv pour récupérer les communes par code postal avec coordonnées
        const url = `https://geo.api.gouv.fr/communes?codePostal=${codePostal}&fields=nom,code,centre&format=json&geometry=centre`;
        
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
                    option.value = JSON.stringify({
                        code: commune.code,
                        nom: commune.nom,
                        latitude: commune.centre ? commune.centre.coordinates[1] : null,
                        longitude: commune.centre ? commune.centre.coordinates[0] : null
                    });
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
            communeSelect.innerHTML = '<option value="">Erreur de connexion</option>';
            communeSelect.disabled = true;
        }
    }
    
    // Écouteur d'événement sur le changement de sélection de commune
    communeSelect.addEventListener("change", function () {
        if (communeSelect.value) {
            try {
                communeActuelle = JSON.parse(communeSelect.value);
                boutonRecherche.disabled = false;
            } catch (error) {
                console.error("Erreur lors du parsing des données de commune:", error);
                boutonRecherche.disabled = true;
                communeActuelle = null;
            }
        } else {
            boutonRecherche.disabled = true;
            communeActuelle = null;
        }
    });
    
    // Écouteur d'événement sur le clic du bouton de recherche
    boutonRecherche.addEventListener("click", function (event) {
        event.preventDefault(); // Empêche le comportement par défaut du formulaire
        if (communeActuelle) {
            const nombreJours = parseInt(nombreJoursSlider.value);
            rechercheMeteo(communeActuelle.code, nombreJours);
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
        
        // Affichage des coordonnées si demandées
        if (checkboxLatitude.checked || checkboxLongitude.checked) {
            const coordonneesContainer = document.createElement('div');
            coordonneesContainer.className = 'coordonnees-container';
            
            let coordonneesHTML = '<div class="coordonnees-grille">';
            
            if (checkboxLatitude.checked && communeActuelle && communeActuelle.latitude) {
                coordonneesHTML += `
                    <div class="coordonnee-carte">
                        <div class="coordonnee-icone">🌍</div>
                        <div class="coordonnee-info">
                            <h4>Latitude</h4>
                            <p class="coordonnee-valeur">${communeActuelle.latitude.toFixed(6)}°</p>
                        </div>
                    </div>
                `;
            }
            
            if (checkboxLongitude.checked && communeActuelle && communeActuelle.longitude) {
                coordonneesHTML += `
                    <div class="coordonnee-carte">
                        <div class="coordonnee-icone">🗺️</div>
                        <div class="coordonnee-info">
                            <h4>Longitude</h4>
                            <p class="coordonnee-valeur">${communeActuelle.longitude.toFixed(6)}°</p>
                        </div>
                    </div>
                `;
            }
            
            coordonneesHTML += '</div>';
            coordonneesContainer.innerHTML = coordonneesHTML;
            previsionsContainer.appendChild(coordonneesContainer);
        }
        
        // Création du conteneur carousel pour les jours
        const carouselContainer = document.createElement('div');
        carouselContainer.className = 'carousel-container';
        
        // Création de la grille des jours
        const grilleJours = document.createElement('div');
        grilleJours.className = 'grille-jours';
        
        // Parcourt chaque prévision et crée une carte
        forecasts.forEach((forecast, index) => {
            const carteJour = creerCarteJour(forecast, index);
            grilleJours.appendChild(carteJour);
        });
        
        carouselContainer.appendChild(grilleJours);
        previsionsContainer.appendChild(carouselContainer);
        
        // Si plus de 3 jours, ajouter des boutons de navigation
        if (forecasts.length > 3) {
            const prevBtn = document.createElement('button');
            prevBtn.className = 'carousel-btn prev';
            prevBtn.innerHTML = '&#10094;';
            prevBtn.ariaLabel = 'Prévisions précédentes';
            
            const nextBtn = document.createElement('button');
            nextBtn.className = 'carousel-btn next';
            nextBtn.innerHTML = '&#10095;';
            nextBtn.ariaLabel = 'Prévisions suivantes';
            
            carouselContainer.appendChild(prevBtn);
            carouselContainer.appendChild(nextBtn);
            
            // Ajouter les écouteurs d'événements pour la navigation
            let scrollAmount = 0;
            const cardWidth = 240; // largeur approx d'une carte + margin
            
            prevBtn.addEventListener('click', () => {
                if (scrollAmount > 0) {
                    scrollAmount -= cardWidth;
                    grilleJours.style.transform = `translateX(-${scrollAmount}px)`;
                }
            });
            
            nextBtn.addEventListener('click', () => {
                const maxScroll = (forecasts.length * cardWidth) - carouselContainer.clientWidth;
                if (scrollAmount < maxScroll) {
                    scrollAmount += cardWidth;
                    grilleJours.style.transform = `translateX(-${scrollAmount}px)`;
                }
            });
        }
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
            titreJour = capitalizeFirstLetter(dateFormatee.split(' ')[0]); // Jour de la semaine
        }
        
        // Obtention de l'icône météo et du texte descriptif
        const meteoInfo = obtenirMeteoInfo(forecast.weather);
        
        // Création de l'élément carte
        const carte = document.createElement('div');
        carte.className = 'carte-jour';
        carte.innerHTML = `
            <div class="jour-header">
                <h4 class="jour-titre">${titreJour}</h4>
                <p class="jour-date">${dateFormatee}</p>
            </div>
            <div class="jour-content">
                <div class="jour-icone-container">
                    <div class="icone-meteo">${meteoInfo.icone}</div>
                    <p class="meteo-description">${meteoInfo.description}</p>
                </div>
                <div class="jour-temperatures">
                    <div class="temp-container">
                        <span class="temp-max">${forecast.tmax}°C</span>
                        <span class="temp-label">Max</span>
                    </div>
                    <div class="temp-divider"></div>
                    <div class="temp-container">
                        <span class="temp-min">${forecast.tmin}°C</span>
                        <span class="temp-label">Min</span>
                    </div>
                </div>
                <div class="jour-details">
                    <div class="detail-item">
                        <span class="detail-icone">🌧️</span>
                        <span class="detail-valeur">${forecast.probarain ?? 0}%</span>
                        <span class="detail-label">Pluie</span>
                    </div>
                    <div class="detail-item">
                        <span class="detail-icone">☀️</span>
                        <span class="detail-valeur">${forecast.sun_hours ?? 0}h</span>
                        <span class="detail-label">Soleil</span>
                    </div>
                </div>
            </div>
        `;
        
        return carte;
    }
    
    // Fonction pour obtenir les informations météo (icône et description)
    function obtenirMeteoInfo(weather) {
        const meteoData = {
            0: { icone: "☀️", description: "Ensoleillé" },
            1: { icone: "🌤️", description: "Peu nuageux" },
            2: { icone: "⛅", description: "Ciel voilé" },
            3: { icone: "🌥️", description: "Nuageux" },
            4: { icone: "☁️", description: "Très nuageux" },
            5: { icone: "🌦️", description: "Couvert" },
            6: { icone: "🌫️", description: "Brouillard" },
            7: { icone: "🌫️❄️", description: "Brouillard givrant" },
            10: { icone: "🌦️", description: "Pluie faible" },
            11: { icone: "🌧️", description: "Pluie modérée" },
            12: { icone: "⛈️", description: "Pluie forte" },
            13: { icone: "🌦️❄️", description: "Pluie verglaçante" },
            14: { icone: "🌧️❄️", description: "Pluie verglaçante modérée" },
            15: { icone: "⛈️❄️", description: "Pluie verglaçante forte" },
            16: { icone: "🌨️", description: "Bruine" },
            20: { icone: "❄️", description: "Neige faible" },
            21: { icone: "🌨️", description: "Neige modérée" },
            22: { icone: "🌨️❄️", description: "Neige forte" },
            30: { icone: "⛈️", description: "Pluie et neige mêlées" },
            31: { icone: "⛈️", description: "Pluie et neige modérées" },
            32: { icone: "⛈️", description: "Pluie et neige fortes" },
            40: { icone: "🌦️", description: "Averses de pluie" },
            41: { icone: "🌧️", description: "Averses modérées" },
            42: { icone: "⛈️", description: "Averses fortes" },
            43: { icone: "🌨️", description: "Averses de neige" },
            44: { icone: "🌨️", description: "Averses de neige modérées" },
            45: { icone: "🌨️❄️", description: "Averses de neige fortes" },
            60: { icone: "❄️", description: "Neige légère" },
            61: { icone: "🌨️", description: "Neige modérée" },
            62: { icone: "🌨️❄️", description: "Neige forte" },
            70: { icone: "⛈️", description: "Orages faibles" },
            71: { icone: "⛈️", description: "Orages modérés" },
            72: { icone: "⛈️", description: "Orages forts" },
            73: { icone: "⛈️", description: "Orages généralisés" },
            74: { icone: "⛈️", description: "Orages importants" },
            75: { icone: "⛈️", description: "Orages violents" },
        };
        
        return meteoData[weather] || { icone: "🌫️", description: "Indéfini" };
    }
    
    // Fonction pour capitaliser la première lettre d'une chaîne
    function capitalizeFirstLetter(string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
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