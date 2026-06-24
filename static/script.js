const map = L.map('map').setView([20.5937, 78.9629], 5);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© OpenStreetMap contributors'
}).addTo(map);

let selectedLat = null;
let selectedLng = null;
let heatLayer = null;

map.on('click', async function(e) {
  selectedLat = e.latlng.lat;
  selectedLng = e.latlng.lng;
  document.getElementById('location-hint').textContent =
    `✅ Location selected: ${selectedLat.toFixed(4)}, ${selectedLng.toFixed(4)}`;

  const res = await fetch('/safety-score', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ lat: selectedLat, lng: selectedLng })
  });
  const data = await res.json();

  document.getElementById('score-result').style.display = 'block';
  document.getElementById('score-number').textContent = `${data.score}/10`;
  document.getElementById('score-number').style.color = data.color;
  document.getElementById('score-level').textContent = data.level;
  document.getElementById('score-incidents').textContent =
    `${data.nearby_incidents} incidents reported nearby`;
});

async function submitReport() {
  if (!selectedLat || !selectedLng) {
    alert("⚠️ Please click on the map to select a location first!");
    return;
  }
  const type = document.getElementById('incident-type').value;
  const description = document.getElementById('description').value;
  const response = await fetch('/report', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, description, lat: selectedLat, lng: selectedLng })
  });
  if (response.ok) {
    alert("✅ Incident reported successfully!");
    document.getElementById('description').value = '';
    selectedLat = null;
    selectedLng = null;
    document.getElementById('location-hint').textContent = '📍 Click on the map to pick location';
    loadHeatmap();
  } else {
    alert("❌ Failed to submit. Try again.");
  }
}

async function loadHeatmap() {
  const response = await fetch('/incidents');
  const incidents = await response.json();
  document.getElementById('total-count').textContent = `Total Incidents: ${incidents.length}`;
  const typeCounts = {};
  incidents.forEach(i => {
    typeCounts[i.type] = (typeCounts[i.type] || 0) + 1;
  });
  const mostReported = Object.keys(typeCounts).sort((a,b) => typeCounts[b] - typeCounts[a])[0];
  document.getElementById('most-reported').textContent = `Most Reported: ${mostReported || '-'}`;
  const heatData = incidents.map(i => [i.lat, i.lng, 1.0]);
  if (heatLayer) map.removeLayer(heatLayer);
  if (heatData.length > 0) {
    heatLayer = L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 15,
      gradient: { 0.4: 'yellow', 0.65: 'orange', 1.0: 'red' }
    }).addTo(map);
  }
}

function sendSOS() {
  const email = document.getElementById('sos-email').value;
  if (!email) {
    alert("⚠️ Please enter an emergency contact email!");
    return;
  }
  navigator.geolocation.getCurrentPosition(function(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const mapsLink = `https://maps.google.com/?q=${lat},${lng}`;
    emailjs.init("JCZohy2f9tHFgkYiG");
    emailjs.send("safetrace_service", "template_atmob5c", {
      to_email: email,
      message: `🆘 SOS ALERT! I need help! My location: ${mapsLink}`
    }).then(() => {
      alert("✅ SOS email sent successfully!");
    }).catch(err => {
      alert("❌ SOS failed: " + err.text);
    });
  }, () => {
    alert("❌ Location access denied. Please allow location.");
  });
}

async function applyFilter() {
  const filterType = document.getElementById('filter-type').value;
  const filterTime = document.getElementById('filter-time').value;
  const response = await fetch('/incidents');
  let incidents = await response.json();
  if (filterType !== 'all') {
    incidents = incidents.filter(i => i.type === filterType);
  }
  const now = new Date();
  if (filterTime === 'today') {
    incidents = incidents.filter(i => {
      const date = new Date(i.timestamp);
      return date.toDateString() === now.toDateString();
    });
  } else if (filterTime === 'week') {
    const weekAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
    incidents = incidents.filter(i => new Date(i.timestamp) >= weekAgo);
  } else if (filterTime === 'month') {
    const monthAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
    incidents = incidents.filter(i => new Date(i.timestamp) >= monthAgo);
  }
  document.getElementById('total-count').textContent = `Total Incidents: ${incidents.length}`;
  const heatData = incidents.map(i => [i.lat, i.lng, 1.0]);
  if (heatLayer) map.removeLayer(heatLayer);
  if (heatData.length > 0) {
    heatLayer = L.heatLayer(heatData, {
      radius: 35,
      blur: 25,
      maxZoom: 15,
      gradient: { 0.4: 'yellow', 0.65: 'orange', 1.0: 'red' }
    }).addTo(map);
  }
}

function addSafeSpots() {
  const policeIcon = L.divIcon({ html: '🚔', className: '', iconSize: [30, 30] });
  const hospitalIcon = L.divIcon({ html: '🏥', className: '', iconSize: [30, 30] });

  const safeSpots = [
    { name: "Delhi Police HQ", lat: 28.6448, lng: 77.2167, type: "police" },
    { name: "Mumbai Police HQ", lat: 18.9388, lng: 72.8354, type: "police" },
    { name: "Bangalore Police HQ", lat: 12.9716, lng: 77.5946, type: "police" },
    { name: "Chennai Police HQ", lat: 13.0827, lng: 80.2707, type: "police" },
    { name: "Hyderabad Police HQ", lat: 17.3850, lng: 78.4867, type: "police" },
    { name: "Kolkata Police HQ", lat: 22.5726, lng: 88.3639, type: "police" },
    { name: "Pune Police HQ", lat: 18.5204, lng: 73.8567, type: "police" },
    { name: "Ahmedabad Police HQ", lat: 23.0225, lng: 72.5714, type: "police" },
    { name: "Jaipur Police HQ", lat: 26.9124, lng: 75.7873, type: "police" },
    { name: "Lucknow Police HQ", lat: 26.8467, lng: 80.9462, type: "police" },
    { name: "Mangalore Police HQ", lat: 12.8698, lng: 74.8429, type: "police" },
    { name: "Udupi Police HQ", lat: 13.3409, lng: 74.7421, type: "police" },
    { name: "AIIMS Delhi", lat: 28.5672, lng: 77.2100, type: "hospital" },
    { name: "KEM Hospital Mumbai", lat: 18.9978, lng: 72.8401, type: "hospital" },
    { name: "Manipal Hospital Bangalore", lat: 12.9580, lng: 77.6476, type: "hospital" },
    { name: "Apollo Hospital Chennai", lat: 13.0569, lng: 80.2425, type: "hospital" },
    { name: "Yashoda Hospital Hyderabad", lat: 17.4484, lng: 78.3908, type: "hospital" },
    { name: "SSKM Hospital Kolkata", lat: 22.5374, lng: 88.3399, type: "hospital" },
    { name: "Ruby Hall Pune", lat: 18.5362, lng: 73.8929, type: "hospital" },
    { name: "Civil Hospital Ahmedabad", lat: 23.0395, lng: 72.5870, type: "hospital" },
    { name: "SMS Hospital Jaipur", lat: 26.9077, lng: 75.7877, type: "hospital" },
    { name: "KGMU Lucknow", lat: 26.8590, lng: 80.9381, type: "hospital" },
    { name: "KMC Hospital Mangalore", lat: 12.8714, lng: 74.8432, type: "hospital" },
    { name: "Nitte University Hospital", lat: 13.1821, lng: 74.9253, type: "hospital" }
  ];

  safeSpots.forEach(spot => {
    const icon = spot.type === "police" ? policeIcon : hospitalIcon;
    L.marker([spot.lat, spot.lng], { icon: icon })
      .addTo(map)
      .bindPopup(`<b>${spot.name}</b><br>Click for directions`)
      .on('click', function() {
        window.open(`https://maps.google.com/?q=${spot.lat},${spot.lng}`, '_blank');
      });
  });
}

function checkDangerZone() {
  navigator.geolocation.getCurrentPosition(async function(pos) {
    const lat = pos.coords.latitude;
    const lng = pos.coords.longitude;
    const res = await fetch('/danger-check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lat, lng })
    });
    const data = await res.json();
    if (data.is_danger) {
      document.getElementById('danger-alert').style.display = 'block';
    } else {
      document.getElementById('danger-alert').style.display = 'none';
    }
  });
}

loadHeatmap();
addSafeSpots();
checkDangerZone();
setInterval(checkDangerZone, 30000);