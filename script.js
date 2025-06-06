// Thème sombre / clair
const themeToggle = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

function updateTheme(isDark) {
  document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
  themeIcon.textContent = isDark ? '☀️' : '🌙';
}

const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
updateTheme(prefersDark);

themeToggle.addEventListener('click', () => {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  updateTheme(currentTheme !== 'dark');
});

// Météo App
const elements = {
  form: document.getElementById('weather-form'),
  postalCode: document.getElementById('postal-code'),
  communeSelect: document.getElementById('commune-select'),
  searchBtn: document.getElementById('search-btn'),
  loading: document.getElementById('loading'),
  results: document.getElementById('results'),
  locationName: document.getElementById('location-name'),
  coordinates: document.getElementById('coordinates'),
  weatherCards: document.getElementById('weather-cards'),
  showCoordinates: document.getElementById('show-coordinates'),
  showRain: document.getElementById('show-rain'),
  showWind: document.getElementById('show-wind'),
  showWindDirection: document.getElementById('show-wind-direction')
};

let selectedDays = 1;
let currentCommune = null;
let map = null;

// Sélection jours
const dayButtons = document.querySelectorAll('.day-btn');
dayButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    dayButtons.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    selectedDays = parseInt(btn.dataset.days);
  });
});

// Code postal → communes
elements.postalCode.addEventListener('input', async () => {
  const code = elements.postalCode.value.trim();
  if (/^\d{5}$/.test(code)) {
    try {
      const res = await fetch(`https://geo.api.gouv.fr/communes?codePostal=${code}&fields=nom,code,centre&format=json&geometry=centre`);
      const data = await res.json();
      elements.communeSelect.innerHTML = '<option value="">Sélectionnez une commune</option>';
      data.forEach(commune => {
        const option = document.createElement('option');
        option.value = JSON.stringify({
          code: commune.code,
          nom: commune.nom,
          latitude: commune.centre?.coordinates[1],
          longitude: commune.centre?.coordinates[0]
        });
        option.textContent = commune.nom;
        elements.communeSelect.appendChild(option);
      });
      elements.communeSelect.disabled = false;
    } catch (err) {
      console.error('Erreur commune :', err);
    }
  } else {
    elements.communeSelect.disabled = true;
    elements.searchBtn.disabled = true;
  }
});

// Sélection commune
elements.communeSelect.addEventListener('change', () => {
  if (elements.communeSelect.value) {
    currentCommune = JSON.parse(elements.communeSelect.value);
    elements.searchBtn.disabled = false;
  } else {
    elements.searchBtn.disabled = true;
  }
});

// Soumission formulaire
elements.form.addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!currentCommune) return;

  elements.results?.classList.remove('show');
  elements.loading?.classList.add('show');

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${currentCommune.latitude}&longitude=${currentCommune.longitude}&daily=temperature_2m_max,temperature_2m_min,weathercode,precipitation_sum,windspeed_10m_max,winddirection_10m_dominant&timezone=Europe/Paris&forecast_days=${selectedDays}`;
    const res = await fetch(url);
    const data = await res.json();
    renderWeather(data);
    addToHistory(currentCommune);
  } catch (err) {
    console.error("Erreur API :", err);
  } finally {
    elements.loading?.classList.remove('show');
  }
});

function renderWeather(data) {
  const { daily } = data;
  elements.locationName.textContent = currentCommune.nom;

  if (elements.showCoordinates.checked) {
    elements.coordinates.innerHTML = `
      <div class="coord-chip">Latitude: ${currentCommune.latitude.toFixed(4)}°</div>
      <div class="coord-chip">Longitude: ${currentCommune.longitude.toFixed(4)}°</div>
    `;
    elements.coordinates.classList.remove('hidden');
  } else {
    elements.coordinates.classList.add('hidden');
  }

  elements.weatherCards.innerHTML = '';
  for (let i = 0; i < selectedDays; i++) {
    const card = document.createElement('div');
    card.className = 'weather-card';

    const date = new Date(daily.time[i]);
    const dayName = i === 0 ? 'Aujourd\'hui' : date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'short' });
    const icon = getWeatherIcon(daily.weathercode[i]);
    const description = getWeatherDescription(daily.weathercode[i]);

    let extra = '';
    if (elements.showRain.checked)
      extra += `<div class="detail-chip">💧 ${daily.precipitation_sum[i]} mm</div>`;
    if (elements.showWind.checked)
      extra += `<div class="detail-chip">🌬️ ${Math.round(daily.windspeed_10m_max[i])} km/h</div>`;
    if (elements.showWindDirection.checked)
      extra += `<div class="detail-chip">🧭 ${daily.winddirection_10m_dominant[i]}°</div>`;

    card.innerHTML = `
      <div class="card-header">
        <div class="card-date">${dayName}</div>
        <div class="card-icon">${icon}</div>
      </div>
      <div class="card-temps">
        <div class="temp-max">${Math.round(daily.temperature_2m_max[i])}°</div>
        <div class="temp-min">${Math.round(daily.temperature_2m_min[i])}°</div>
      </div>
      <div class="card-description">${description}</div>
      <div class="card-details">${extra}</div>
    `;
    elements.weatherCards.appendChild(card);
  }

  if (map) map.remove();
  map = L.map('map').setView([currentCommune.latitude, currentCommune.longitude], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
  L.marker([currentCommune.latitude, currentCommune.longitude])
    .addTo(map)
    .bindPopup(`<b>${currentCommune.nom}</b>`)
    .openPopup();

  elements.results?.classList.add('show');
  setTimeout(() => map.invalidateSize(), 100);
}

function getWeatherIcon(code) {
  const icons = {
    0: '☀️', 1: '🌤️', 2: '⛅', 3: '☁️', 45: '🌫️', 48: '🌫️',
    51: '🌦️', 53: '🌦️', 55: '🌦️', 56: '🌧️', 57: '🌧️',
    61: '🌧️', 63: '🌧️', 65: '🌧️', 66: '🌧️', 67: '🌧️',
    71: '🌨️', 73: '🌨️', 75: '🌨️', 77: '🌨️',
    80: '🌦️', 81: '🌦️', 82: '🌦️',
    85: '🌨️', 86: '🌨️', 95: '⛈️', 96: '⛈️', 99: '⛈️'
  };
  return icons[code] || '❓';
}

function getWeatherDescription(code) {
  const labels = {
    0: 'Ciel dégagé', 1: 'Principalement dégagé', 2: 'Partiellement nuageux', 3: 'Couvert',
    45: 'Brouillard', 48: 'Brouillard givrant',
    51: 'Bruine légère', 53: 'Bruine modérée', 55: 'Bruine dense',
    56: 'Pluie verglaçante légère', 57: 'Pluie verglaçante dense',
    61: 'Pluie légère', 63: 'Pluie modérée', 65: 'Pluie forte',
    66: 'Verglas léger', 67: 'Verglas fort',
    71: 'Neige légère', 73: 'Neige modérée', 75: 'Neige forte', 77: 'Grains de neige',
    80: 'Averses légères', 81: 'Averses modérées', 82: 'Averses fortes',
    85: 'Averses de neige légères', 86: 'Averses de neige fortes',
    95: 'Orage modéré', 96: 'Orage avec grêle légère', 99: 'Orage avec grêle forte'
  };
  return labels[code] || 'Temps inconnu';
}

// Historique
const historyList = document.getElementById('history-list');
let searchHistory = JSON.parse(localStorage.getItem('weatherHistory')) || [];

function updateHistoryDisplay() {
  historyList.innerHTML = '';
  searchHistory.forEach((commune, index) => {
    const li = document.createElement('li');
    li.innerHTML = `<span>${commune.nom}</span><span class="remove-btn" data-index="${index}">✖</span>`;
    li.addEventListener('click', (e) => {
      if (!e.target.classList.contains('remove-btn')) {
        currentCommune = commune;
        elements.communeSelect.value = JSON.stringify(commune);
        elements.searchBtn.disabled = false;
        elements.form.dispatchEvent(new Event('submit'));
      }
    });
    li.querySelector('.remove-btn').addEventListener('click', () => {
      searchHistory.splice(index, 1);
      localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
      updateHistoryDisplay();
    });
    historyList.appendChild(li);
  });
}

function addToHistory(commune) {
  searchHistory = searchHistory.filter(c => c.code !== commune.code);
  searchHistory.unshift(commune);
  if (searchHistory.length > 5) searchHistory.pop();
  localStorage.setItem('weatherHistory', JSON.stringify(searchHistory));
  updateHistoryDisplay();
}

updateHistoryDisplay();
