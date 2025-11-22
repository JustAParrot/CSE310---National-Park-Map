let map;
let markers = [];
let parksData = [];

async function initMap() {
  try {
    const parksRes = await fetch("data/parks.json");
    parksData = await parksRes.json();
  } catch (err) {
    console.error("Error loading parks.json:", err);
    parksData = [];
  }

  let mapStyle = null;
  try {
    const styleRes = await fetch("assets/mapStyle.json");
    mapStyle = await styleRes.json();
  } catch (err) {
    console.warn("Could not load mapStyle.json, using default style.");
  }

  map = new google.maps.Map(document.getElementById("map"), {
    center: { lat: 39.5, lng: -98.35 },
    zoom: 4,
    styles: mapStyle || null,
    streetViewControl: false
  });

  loadMarkers(parksData);

  setupFilters();
  setupSearch();

  // Close side panel when clicking on empty map space
  map.addListener("click", () => {
    document.getElementById("info-panel").classList.remove("active");
  });
}

function loadMarkers(list) {
  markers.forEach((m) => m.setMap(null));
  markers = [];

  const bounds = new google.maps.LatLngBounds();

  list.forEach((park) => {
    const position = { lat: park.lat, lng: park.lng };

    const marker = new google.maps.Marker({
      position,
      map,
      title: park.name
    });

    marker.addListener("click", () => {
      showParkInfo(park);
    });

    markers.push(marker);
    bounds.extend(position);
  });

  if (!bounds.isEmpty()) {
    map.fitBounds(bounds);
  }
}

async function showParkInfo(park) {
  const panel = document.getElementById("info-panel");
  const nameEl = document.getElementById("park-name");
  const regionEl = document.getElementById("park-region");
  const descEl = document.getElementById("park-description");
  const weatherEl = document.getElementById("park-weather");

  nameEl.textContent = park.name;
  regionEl.textContent = "Region: " + park.region;
  descEl.textContent = park.description;
  weatherEl.textContent = "Loading weather...";

  panel.classList.add("active");

  // Simple weather lookup from Open-Meteo (no API key required)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${park.lat}&longitude=${park.lng}&current=temperature_2m`;
    const res = await fetch(url);
    const data = await res.json();

    if (data && data.current && typeof data.current.temperature_2m === "number") {
      const t = data.current.temperature_2m;
      weatherEl.textContent = `Current temperature: ${t.toFixed(1)} °C`;
    } else {
      weatherEl.textContent = "Weather data not available.";
    }
  } catch (err) {
    console.error("Error fetching weather:", err);
    weatherEl.textContent = "Could not load weather.";
  }
}

// Region filter buttons
function setupFilters() {
  const panel = document.getElementById("info-panel");

  document.querySelectorAll("#filters button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const region = btn.dataset.region;
      let filtered = parksData;

      if (region !== "All") {
        filtered = parksData.filter((p) => p.region === region);
      }

      loadMarkers(filtered);
      panel.classList.remove("active");
    });
  });
}

// Search bar filtering by park name
function setupSearch() {
  const input = document.getElementById("search-input");
  const clearBtn = document.getElementById("search-clear");
  const panel = document.getElementById("info-panel");

  if (!input) return;

  const applySearch = () => {
    const term = input.value.trim().toLowerCase();

    if (!term) {
      loadMarkers(parksData);
      panel.classList.remove("active");
      return;
    }

    const filtered = parksData.filter((p) =>
      p.name.toLowerCase().includes(term)
    );
    loadMarkers(filtered);
    panel.classList.remove("active");
  };

  input.addEventListener("input", applySearch);

  clearBtn.addEventListener("click", () => {
    input.value = "";
    loadMarkers(parksData);
    panel.classList.remove("active");
  });
}
