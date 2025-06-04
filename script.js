document.addEventListener('DOMContentLoaded', function() {
    // Éléments DOM
    const postalCodeInput = document.getElementById('postal-code');
    const communeSelect = document.getElementById('commune-select');
    const searchBtn = document.getElementById('search-btn');
    const dayOptions = document.querySelectorAll('.day-option');
    const showCoordinatesCheckbox = document.getElementById('show-coordinates');
    const showRainCheckbox = document.getElementById('show-rain');
    const resultsSection = document.getElementById('results-section');
    const locationName = document.getElementById('location-name');
    const coordinatesInfo = document.getElementById('coordinates-info');
    const weatherCards = document.getElementById('weather-cards');
    const loading = document.getElementById('loading');
    const error = document.getElementById('error');
    const errorMessage = document.getElementById('error-message');

    // Variables globales
    let selectedDays = 1;
    let currentCommune = null;
    let map = null;

    // Initialisation
    initDaySelector();
    initPostalCodeListener();
    initCommuneListener();
    initFormSubmit();

    // Initialisation du sélecteur de jours
    function initDaySelector() {
        dayOptions.forEach(option => {
            option.addEventListener('click', function() {
                dayOptions.forEach(opt => opt.classList.remove('active'));
                this.classList.add('active');
                selectedDays = parseInt(this.dataset.days);
            });
        });
    }

    // Écouteur pour le code postal
    function initPostalCodeListener() {
        postalCodeInput.addEventListener('input', async function() {
            const postalCode = this.value.trim();
            
            if (postalCode.length === 5 && /^\d{5}$/.test(postalCode)) {
                await searchCommunes(postalCode);
            } else {
                resetCommuneSelect();
                disableSearchButton();
            }
        });
    }

    // Écouteur pour la sélection de commune
    function initCommuneListener() {
        communeSelect.addEventListener('change', function() {
            if (this.value) {
                try {
                    currentCommune = JSON.parse(this.value);
                    enableSearchButton();
                } catch (e) {
                    console.error('Erreur parsing commune:', e);
                    disableSearchButton();
                }
            } else {
                disableSearchButton();
            }
        });
    }

    // Écouteur pour le formulaire
    function initFormSubmit() {
        document.getElementById('weather-form').addEventListener('submit', async function(e) {
            e.preventDefault();
            if (currentCommune) {
                await getWeatherData();
            }
        });
    }

    // Recherche des communes par code postal
    async function searchCommunes(postalCode) {
        try {
            const response = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${postalCode}&fields=nom,code,centre&format=json&geometry=centre`);
            const communes = await response.json();

            if (communes.length > 0) {
                populateCommuneSelect(communes);
            } else {
                showNoCommunesFound();
            }
        } catch (err) {
            console.error('Erreur recherche communes:', err);
            showCommuneError();
        }
    }

    // Peuplement du sélecteur de communes
    function populateCommuneSelect(communes) {
        communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
        
        communes.forEach(commune => {
            const option = document.createElement('option');
            option.value = JSON.stringify({
                code: commune.code,
                nom: commune.nom,
                latitude: commune.centre ? commune.centre.coordinates[1] : null,
                longitude: commune.centre ? commune.centre.coordinates[0] : null
            });
            option.textContent = commune.nom;
            communeSelect.appendChild(option);
        });

        communeSelect.disabled = false;
    }

    // Récupération des données météo
    async function getWeatherData() {
        showLoading();
        hideError();
        hideResults();

        try {
            // Utilisation de l'API OpenWeatherMap (gratuite)
            const API_KEY = 'votre_clé_api_openweather'; // Remplacez par votre clé
            
            // Alternative : utilisation d'une API météo gratuite
            const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${currentCommune.latitude}&longitude=${currentCommune.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,precipitation_probability_max,sunshine_duration&timezone=Europe/Paris&forecast_days=${selectedDays}`);
            
            if (!response.ok) {
                throw new Error('Erreur API météo');
            }

            const data = await response.json();
            displayWeatherData(data);
            displayLocation();
            initMap();
            
        } catch (err) {
            console.error('Erreur météo:', err);
            showError('Erreur lors de la récupération des données météo. Veuillez réessayer.');
        } finally {
            hideLoading();
        }
    }

    // Affichage des données météo
    function displayWeatherData(data) {
        weatherCards.innerHTML = '';

        const { daily } = data;
        
        for (let i = 0; i < selectedDays; i++) {
            const card = createWeatherCard({
                date: daily.time[i],
                tempMax: Math.round(daily.temperature_2m_max[i]),
                tempMin: Math.round(daily.temperature_2m_min[i]),
                weatherCode: daily.weathercode[i],
                precipitation: daily.precipitation_sum[i] || 0,
                precipitationProb: daily.precipitation_probability_max[i] || 0,
                sunshine: Math.round((daily.sunshine_duration[i] || 0) / 3600) // Conversion en heures
            }, i);
            
            weatherCards.appendChild(card);
        }

        showResults();
    }

    // Création d'une carte météo
    function createWeatherCard(weather, index) {
        const card = document.createElement('div');
        card.className = 'weather-card';

        const date = new Date(weather.date);
        const dayNames = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi'];
        const monthNames = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

        let dayTitle = '';
        if (index === 0) dayTitle = 'Aujourd\'hui';
        else if (index === 1) dayTitle = 'Demain';
        else dayTitle = dayNames[date.getDay()];

        const dateStr = `${date.getDate()} ${monthNames[date.getMonth()]}`;
        const weatherInfo = getWeatherInfo(weather.weatherCode);

        card.innerHTML = `
            <div class="weather-icon">${weatherInfo.icon}</div>
            <div class="weather-info">
                <h4>${dayTitle}</h4>
                <div class="date">${dateStr}</div>
                <div class="description">${weatherInfo.description}</div>
            </div>
            <div class="weather-temps">
                <div class="temp-max">${weather.tempMax}°</div>
                <div class="temp-min">${weather.tempMin}°</div>
            </div>
            <div class="weather-details">
                <div class="detail">
                    <span class="detail-icon">🌧️</span>
                    <span>${weather.precipitationProb}%</span>
                </div>
                <div class="detail">
                    <span class="detail-icon">☀️</span>
                    <span>${weather.sunshine}h</span>
                </div>
                ${showRainCheckbox.checked ? `
                <div class="detail">
                    <span class="detail-icon">💧</span>
                    <span>${weather.precipitation}mm</span>
                </div>
                ` : ''}
            </div>
        `;

        return card;
    }

    // Informations météo basées sur le code météo WMO
    function getWeatherInfo(code) {
        const weatherCodes = {
            0: { icon: '☀️', description: 'Ciel dégagé' },
            1: { icon: '🌤️', description: 'Principalement dégagé' },
            2: { icon: '⛅', description: 'Partiellement nuageux' },
            3: { icon: '☁️', description: 'Couvert' },
            45: { icon: '🌫️', description: 'Brouillard' },
            48: { icon: '🌫️', description: 'Brouillard givrant' },
            51: { icon: '🌦️', description: 'Bruine légère' },
            53: { icon: '🌦️', description: 'Bruine modérée' },
            55: { icon: '🌧️', description: 'Bruine dense' },
            61: { icon: '🌦️', description: 'Pluie faible' },
            63: { icon: '🌧️', description: 'Pluie modérée' },
            65: { icon: '🌧️', description: 'Pluie forte' },
            71: { icon: '🌨️', description: 'Neige faible' },
            73: { icon: '🌨️', description: 'Neige modérée' },
            75: { icon: '🌨️', description: 'Neige forte' },
            80: { icon: '🌦️', description: 'Averses faibles' },
            81: { icon: '🌧️', description: 'Averses modérées' },
            82: { icon: '⛈️', description: 'Averses violentes' },
            95: { icon: '⛈️', description: 'Orage' },
            96: { icon: '⛈️', description: 'Orage avec grêle' },
            99: { icon: '⛈️', description: 'Orage violent avec grêle' }
        };

        return weatherCodes[code] || { icon: '🌫️', description: 'Temps indéterminé' };
    }

    // Affichage des informations de localisation
    function displayLocation() {
        locationName.textContent = currentCommune.nom;

        if (showCoordinatesCheckbox.checked && currentCommune.latitude && currentCommune.longitude) {
            coordinatesInfo.innerHTML = `
                <span>Lat: ${currentCommune.latitude.toFixed(4)}°</span>
                <span>Lng: ${currentCommune.longitude.toFixed(4)}°</span>
            `;
            coordinatesInfo.classList.remove('hidden');
        } else {
            coordinatesInfo.classList.add('hidden');
        }
    }

    // Initialisation de la carte
    function initMap() {
        if (map) {
            map.remove();
        }

        if (currentCommune.latitude && currentCommune.longitude) {
            map = L.map('map').setView([currentCommune.latitude, currentCommune.longitude], 15);

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            L.marker([currentCommune.latitude, currentCommune.longitude])
                .addTo(map)
                .bindPopup(`<strong>${currentCommune.nom}</strong>`)
                .openPopup();
        }
    }

    // Fonctions utilitaires
    function resetCommuneSelect() {
        communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
        communeSelect.disabled = true;
        currentCommune = null;
    }

    function enableSearchButton() {
        searchBtn.disabled = false;
    }

    function disableSearchButton() {
        searchBtn.disabled = true;
    }

    function showNoCommunesFound() {
        communeSelect.innerHTML = '<option value="">Aucune commune trouvée</option>';
        communeSelect.disabled = true;
    }

    function showCommuneError() {
        communeSelect.innerHTML = '<option value="">Erreur de connexion</option>';
        communeSelect.disabled = true;
    }

    function showLoading() {
        loading.classList.remove('hidden');
    }

    function hideLoading() {
        loading.classList.add('hidden');
        }

    function hideError() {
        error.classList.add('hidden');
    }

    function showResults() {
        resultsSection.classList.remove('hidden');
    }

    function hideResults() {
        resultsSection.classList.add('hidden');
    }
});
