let map;
let parkMarkers = [];
let campsiteMarkers = [];

/* -------------------------------------------
   INIT MAP
------------------------------------------- */
function initMap() {
  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.5, lng: -98.35 }, // center of the US
    zoom: 4,
    styles: null
  });

  // Load custom map style
  fetch("assets/mapStyle.json")
    .then((res) => res.json())
    .then((style) => map.setOptions({ styles: style }));

  // Load BOTH datasets
  Promise.all([loadParks(), loadCampsites()]).then(() => {
    console.log("Parks and Campsites loaded");
  });

  setupFilters();
  setupSearch();
}

// Close info panel when clicking outside of it
document.addEventListener("click", function (event) {
  const panel = document.getElementById("info-panel");

  // If panel is not visible, do nothing
  if (panel.style.display === "none") return;

  // If the click was INSIDE the panel, do nothing
  if (panel.contains(event.target)) return;

  // If the click was on a marker (Google draws markers in <img> tags)
  if (event.target.tagName === "IMG" && event.target.src.includes("maps.gstatic.com")) {
    return;
  }

  // Otherwise close the panel
  closeInfoPanel();
});


/* -------------------------------------------
   LOAD PARKS
------------------------------------------- */
function loadParks() {
  return fetch("data/parks.json")
    .then((res) => res.json())
    .then((parks) => {
      parkMarkers = parks.map((park) => createMarker(park, "park"));
    });
}

/* -------------------------------------------
   LOAD CAMPSITES
------------------------------------------- */
function loadCampsites() {
  return fetch("data/campsites.json")
    .then((res) => res.json())
    .then((campsites) => {
      campsiteMarkers = campsites.map((camp) =>
        createMarker(camp, "campsite")
      );
    });
}

/* -------------------------------------------
   CREATE MARKER (FIXED)
------------------------------------------- */
function createMarker(item, type) {
  const iconUrl =
    type === "park"
      ? "assets/icons8-tree-32.png"
      : "assets/campsite.png";

  const marker = new google.maps.Marker({
    position: { lat: item.lat, lng: item.lng },
    map: map,
    title: item.name,
    icon: {
      url: iconUrl,
      scaledSize: new google.maps.Size(28, 28)
    }
  });

  marker.itemData = item;
  marker.dataType = type;

  marker.addListener("click", () => {
    showInfoPanel(item, type);
    fetchWeather(item.lat, item.lng);
  });

  return marker;
}

/* -------------------------------------------
   SHOW INFO PANEL
------------------------------------------- */
function showInfoPanel(item, type) {
  document.getElementById("park-name").textContent = item.name;
  document.getElementById("park-region").textContent = `Region: ${item.region}`;

  const label = type === "park" ? "National Park" : "Campsite";

  document.getElementById("park-description").textContent =
    `${label}: ${item.description}`;

  document.getElementById("info-panel").style.display = "block";
}

/* -------------------------------------------
   WEATHER FETCH
------------------------------------------- */
function fetchWeather(lat, lng) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m&temperature_unit=fahrenheit`;

  fetch(url)
    .then((res) => res.json())
    .then((weather) => {
      const degrees = weather.current?.temperature_2m;
      document.getElementById(
        "park-weather"
      ).textContent = `Temperature: ${degrees}°F`;
    })
    .catch(() => {
      document.getElementById("park-weather").textContent =
        "Weather unavailable.";
    });
}

/* -------------------------------------------
   REGION FILTERS (FIXED)
------------------------------------------- */
function setupFilters() {
  document.querySelectorAll("#filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const region = btn.dataset.region;
      filterByRegion(region);
    });
  });
}

function filterByRegion(region) {
  // Hide all markers first
  parkMarkers.forEach((m) => m.setMap(null));
  campsiteMarkers.forEach((m) => m.setMap(null));

  let visibleParks = parkMarkers;
  let visibleCampsites = campsiteMarkers;

  if (region !== "All") {
    visibleParks = visibleParks.filter(
      (m) => m.itemData.region === region
    );

    visibleCampsites = visibleCampsites.filter(
      (m) => m.itemData.region === region
    );
  }

  // Show filtered markers
  visibleParks.forEach((m) => m.setMap(map));
  visibleCampsites.forEach((m) => m.setMap(map));

  autoFitMarkers([...visibleParks, ...visibleCampsites]);
}

/* -------------------------------------------
   AUTO ZOOM TO VISIBLE MARKERS
------------------------------------------- */
function autoFitMarkers(markers) {
  if (!markers || markers.length === 0) return;

  const bounds = new google.maps.LatLngBounds();
  markers.forEach((m) => bounds.extend(m.getPosition()));

  map.fitBounds(bounds);
}

/* -------------------------------------------
   SEARCH BAR (FIXED)
------------------------------------------- */
function setupSearch() {
  const input = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");

  input.addEventListener("input", () => {
    const text = input.value.toLowerCase();
    searchMarkers(text);
  });

  clearBtn.addEventListener("click", () => {
    input.value = "";
    searchMarkers("");
  });
}

function searchMarkers(text) {
  const allMarkers = [...parkMarkers, ...campsiteMarkers];

  allMarkers.forEach((m) => {
    const name = m.itemData.name.toLowerCase();
    m.setMap(name.includes(text) ? map : null);
  });
}

function closeInfoPanel() {
  document.getElementById("info-panel").style.display = "none";
}

document.getElementById("close-panel").addEventListener("click", closeInfoPanel);
