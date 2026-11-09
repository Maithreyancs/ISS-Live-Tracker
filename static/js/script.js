/**
 * Real-Time International Space Station (ISS) Tracking and Visualization System
 * -----------------------------------------------------------------------------
 * Frontend Logic: Leaflet.js Mapping, Real-time AJAX Polling, UI Dashboard Updates
 */

document.addEventListener("DOMContentLoaded", () => {
    // -------------------------------------------------------------------------
    // Configuration & State
    // -------------------------------------------------------------------------
    const POLLING_INTERVAL_SEC = 5;      // Refresh every 5 seconds
    const MAX_TRAIL_POINTS = 50;         // Keep up to 50 recent points on map

    let countdownRemaining = POLLING_INTERVAL_SEC;
    let countdownTimer = null;
    let autoFollow = true;
    let showTrail = true;
    let isFetching = false;
    let previousPosition = null;

    // Track path history for map polyline
    const trailCoordinates = [];

    // -------------------------------------------------------------------------
    // DOM Element References
    // -------------------------------------------------------------------------
    const liveBadge = document.getElementById("liveBadge");
    const statusLabel = document.getElementById("statusLabel");
    const countdownText = document.getElementById("countdownText");
    const btnManualRefresh = document.getElementById("btnManualRefresh");
    const errorBanner = document.getElementById("errorBanner");
    const errorMessage = document.getElementById("errorMessage");
    const btnDismissAlert = document.getElementById("btnDismissAlert");

    // Metric Values
    const valLatitude = document.getElementById("valLatitude");
    const subLatitude = document.getElementById("subLatitude");
    const valLongitude = document.getElementById("valLongitude");
    const subLongitude = document.getElementById("subLongitude");
    const valAltitude = document.getElementById("valAltitude");
    const subAltitude = document.getElementById("subAltitude");
    const valVelocity = document.getElementById("valVelocity");
    const subVelocity = document.getElementById("subVelocity");
    const valVisibility = document.getElementById("valVisibility");
    const subVisibility = document.getElementById("subVisibility");
    const visEmoji = document.getElementById("visEmoji");
    const visIconCircle = document.getElementById("visIconCircle");
    const valStatus = document.getElementById("valStatus");
    const valTimestamp = document.getElementById("valTimestamp");

    // Visibility Section
    const visibilityBox = document.getElementById("visibilityBox");
    const visCurrentTag = document.getElementById("visCurrentTag");
    const visCurrentSub = document.getElementById("visCurrentSub");
    const visExplanation = document.getElementById("visExplanation");

    // Map Controls
    const mapWrapper = document.getElementById("mapWrapper");
    const btnRecenter = document.getElementById("btnRecenter");
    const btnToggleFollow = document.getElementById("btnToggleFollow");
    const btnTogglePath = document.getElementById("btnTogglePath");
    const btnClearTrail = document.getElementById("btnClearTrail");
    const followIndicator = document.getElementById("followIndicator");
    const btnFullscreen = document.getElementById("btnFullscreen");
    const fullscreenText = document.getElementById("fullscreenText");
    const fullscreenIconExpand = document.getElementById("fullscreenIconExpand");
    const fullscreenIconCompress = document.getElementById("fullscreenIconCompress");
    const btnFloatingExitFullscreen = document.getElementById("btnFloatingExitFullscreen");

    // Map Mode Selectors (Toolbar pills + Floating map widget)
    const modePills = document.querySelectorAll(".mode-pill");
    const layerSwitchBtns = document.querySelectorAll(".layer-switch-btn");

    // History Table
    const historyTableBody = document.getElementById("historyTableBody");
    const historyCount = document.getElementById("historyCount");
    const btnRefreshHistory = document.getElementById("btnRefreshHistory");
    const btnClearHistory = document.getElementById("btnClearHistory");

    // -------------------------------------------------------------------------
    // Leaflet Map & Multi-Layer Modes (Google-Style Switching)
    // -------------------------------------------------------------------------
    // Available Map Modes: Standard Map & Satellite Imagery
    const tileLayers = {
        // Standard Street Map (OpenStreetMap)
        default: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank">OpenStreetMap</a> contributors',
            subdomains: ["a", "b", "c"],
            maxZoom: 18
        }),
        // Satellite Earth Imagery (Esri World Imagery - Photorealistic like Google Satellite)
        satellite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", {
            attribution: 'Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community',
            maxZoom: 18
        })
    };

    let currentMapMode = "default";

    // Create map centered on global view
    const map = L.map("map", {
        center: [20, 0],
        zoom: 3,
        minZoom: 2,
        maxZoom: 10,
        worldCopyJump: true
    });

    // Add initial default layer
    tileLayers.default.addTo(map);

    function setMapMode(mode) {
        if (!tileLayers[mode] || mode === currentMapMode) return;

        // Swap active layer
        map.removeLayer(tileLayers[currentMapMode]);
        tileLayers[mode].addTo(map);
        currentMapMode = mode;

        // Synchronize UI buttons
        modePills.forEach(pill => {
            if (pill.getAttribute("data-mode") === mode) {
                pill.classList.add("active");
            } else {
                pill.classList.remove("active");
            }
        });

        layerSwitchBtns.forEach(btn => {
            if (btn.getAttribute("data-mode") === mode) {
                btn.classList.add("active");
            } else {
                btn.classList.remove("active");
            }
        });

        // Adjust polyline trail color for high contrast in Satellite mode
        if (mode === "satellite") {
            trailPolyline.setStyle({ color: "#38bdf8", weight: 4, opacity: 0.95 });
        } else {
            trailPolyline.setStyle({ color: "#0284c7", weight: 3.5, opacity: 0.85 });
        }
    }

    // Attach listeners to mode pills
    modePills.forEach(pill => {
        pill.addEventListener("click", () => {
            const mode = pill.getAttribute("data-mode");
            setMapMode(mode);
        });
    });

    // Attach listeners to floating layer widget buttons
    layerSwitchBtns.forEach(btn => {
        btn.addEventListener("click", () => {
            const mode = btn.getAttribute("data-mode");
            setMapMode(mode);
        });
    });

    // Custom ISS Satellite Marker Icon with Pulsing Effect
    const issCustomIcon = L.divIcon({
        className: "iss-custom-marker-wrapper",
        html: `
            <div class="iss-marker-container">
                <div class="iss-pulse-ring"></div>
                <img src="static/images/iss-icon.svg" class="iss-marker-icon" alt="ISS Marker" />
            </div>
        `,
        iconSize: [48, 48],
        iconAnchor: [24, 24],
        popupAnchor: [0, -26]
    });

    // Marker & Polyline references
    let issMarker = null;
    const trailPolyline = L.polyline([], {
        color: "#0284c7",
        weight: 3.5,
        opacity: 0.85,
        dashArray: "6, 6",
        lineCap: "round",
        lineJoin: "round"
    }).addTo(map);

    // Handle user manual dragging: gracefully pause auto-follow so map doesn't snap back abruptly
    map.on("dragstart", () => {
        if (autoFollow) {
            setAutoFollow(false);
        }
    });

    // -------------------------------------------------------------------------
    // Helper Formatters
    // -------------------------------------------------------------------------
    function formatCoord(val, isLat) {
        if (val === null || val === undefined || isNaN(val)) return "--.----°";
        const absVal = Math.abs(val).toFixed(4);
        if (isLat) {
            return `${absVal}° ${val >= 0 ? "N" : "S"}`;
        } else {
            return `${absVal}° ${val >= 0 ? "E" : "W"}`;
        }
    }

    function formatHemisphere(val, isLat) {
        if (val === null || val === undefined || isNaN(val)) return "Awaiting coordinates...";
        if (isLat) {
            return val >= 0 ? "Northern Hemisphere" : "Southern Hemisphere";
        } else {
            return val >= 0 ? "Eastern Hemisphere" : "Western Hemisphere";
        }
    }

    function kmToMiles(km) {
        if (!km || isNaN(km)) return "--";
        return (km * 0.621371).toFixed(1);
    }

    // -------------------------------------------------------------------------
    // Error Handling & Banner
    // -------------------------------------------------------------------------
    function showError(message) {
        errorMessage.textContent = message || "Unable to retrieve live ISS data. Retrying...";
        errorBanner.style.display = "flex";
        liveBadge.classList.add("error");
        statusLabel.textContent = "OFFLINE / RETRYING";
        valStatus.textContent = "RETRYING";
        valStatus.className = "metric-value text-danger";
    }

    function hideError() {
        errorBanner.style.display = "none";
        liveBadge.classList.remove("error");
        statusLabel.textContent = "LIVE TELEMETRY";
        valStatus.textContent = "LIVE";
        valStatus.className = "metric-value text-success";
    }

    btnDismissAlert.addEventListener("click", () => {
        errorBanner.style.display = "none";
    });

    // -------------------------------------------------------------------------
    // Map Marker & Path Updates
    // -------------------------------------------------------------------------
    function updateMapMarker(lat, lon, telemetry) {
        const newLatLng = [lat, lon];

        // Format popup text
        const popupContent = `
            <div class="iss-popup-card">
                <div class="iss-popup-title">
                    🛰️ International Space Station
                </div>
                <div class="iss-popup-row">
                    <span>Latitude:</span>
                    <strong>${formatCoord(lat, true)}</strong>
                </div>
                <div class="iss-popup-row">
                    <span>Longitude:</span>
                    <strong>${formatCoord(lon, false)}</strong>
                </div>
                <div class="iss-popup-row">
                    <span>Altitude:</span>
                    <strong>${telemetry.altitude_str || "~400 km"}</strong>
                </div>
                <div class="iss-popup-row">
                    <span>Velocity:</span>
                    <strong>${telemetry.velocity_str || "~27,600 km/h"}</strong>
                </div>
                <div class="iss-popup-row">
                    <span>Illumination:</span>
                    <strong>${telemetry.visibility || "Unknown"}</strong>
                </div>
                <div class="iss-popup-row">
                    <span>UTC Time:</span>
                    <strong>${telemetry.timestamp || "Live"}</strong>
                </div>
            </div>
        `;

        if (!issMarker) {
            // First time: instantiate marker
            issMarker = L.marker(newLatLng, { icon: issCustomIcon }).addTo(map);
            issMarker.bindPopup(popupContent);
            map.setView(newLatLng, 4);
        } else {
            // Smoothly move marker to new position
            issMarker.setLatLng(newLatLng);
            issMarker.getPopup().setContent(popupContent);
        }

        // Add to historical polyline (prevent drawing line across international date line jump)
        if (previousPosition) {
            const lonDiff = Math.abs(previousPosition[1] - lon);
            // If the ISS crossed the antimeridian (jump of ~360 deg), reset path points
            if (lonDiff > 180) {
                trailCoordinates.length = 0;
            }
        }

        trailCoordinates.push(newLatLng);
        if (trailCoordinates.length > MAX_TRAIL_POINTS) {
            trailCoordinates.shift(); // Keep only recent points
        }

        if (showTrail) {
            trailPolyline.setLatLngs(trailCoordinates);
        }

        previousPosition = newLatLng;

        // Auto-follow map pan
        if (autoFollow) {
            map.panTo(newLatLng, { animate: true, duration: 1.0 });
        }
    }

    // -------------------------------------------------------------------------
    // UI Update with Live Telemetry
    // -------------------------------------------------------------------------
    function updateUI(data) {
        if (!data || !data.success) {
            showError(data?.error || "Invalid response from server.");
            return;
        }

        hideError();

        const lat = data.latitude;
        const lon = data.longitude;

        // Update Coordinate Cards
        valLatitude.textContent = formatCoord(lat, true);
        subLatitude.textContent = formatHemisphere(lat, true);

        valLongitude.textContent = formatCoord(lon, false);
        subLongitude.textContent = formatHemisphere(lon, false);

        // Update Altitude Card
        if (data.altitude !== null && data.altitude !== undefined) {
            valAltitude.textContent = data.altitude_str;
            subAltitude.textContent = `~${kmToMiles(data.altitude)} miles above sea level`;
        } else {
            valAltitude.textContent = "Unavailable";
            subAltitude.textContent = "Not provided by fallback source";
        }

        // Update Velocity Card
        if (data.velocity !== null && data.velocity !== undefined) {
            valVelocity.textContent = data.velocity_str;
            subVelocity.textContent = `${data.velocity_kms_str} (~Mach 22)`;
        } else {
            valVelocity.textContent = "Unavailable";
            subVelocity.textContent = "Not provided by fallback source";
        }

        // Update Visibility Card & Section
        const isDaylight = (data.visibility_raw === "daylight");
        if (isDaylight) {
            valVisibility.textContent = "Daylight";
            subVisibility.textContent = "Sunlit orbital phase";
            visEmoji.textContent = "☀️";
            visIconCircle.className = "icon-circle icon-amber";

            visibilityBox.className = "visibility-status-box";
            visCurrentTag.textContent = "Daylight";
            visCurrentSub.textContent = "Solar arrays actively generating power";
            visExplanation.textContent = "The ISS is currently traversing the sunlit hemisphere. Its 73-meter photovoltaic wings are converting direct solar radiation into ~120 kW of clean electrical power for life support and research racks.";
        } else if (data.visibility_raw === "eclipsed") {
            valVisibility.textContent = "Orbital Night";
            subVisibility.textContent = "In Earth's shadow (Eclipse)";
            visEmoji.textContent = "🌑";
            visIconCircle.className = "icon-circle icon-indigo";

            visibilityBox.className = "visibility-status-box eclipsed";
            visCurrentTag.textContent = "Orbital Night";
            visCurrentSub.textContent = "Running on rechargeable lithium-ion batteries";
            visExplanation.textContent = "The ISS is currently in the shadow of Earth. While eclipsed, solar generation ceases, and the entire station operates on high-capacity lithium-ion battery banks charged during the previous daylight phase.";
        } else {
            valVisibility.textContent = data.visibility || "Unknown";
            subVisibility.textContent = "Illumination status";
            visEmoji.textContent = "🛰️";
        }

        // Update Status & Timestamp
        valTimestamp.textContent = `Last updated: ${data.timestamp}`;
        if (data.source && data.source.includes("Fallback")) {
            statusLabel.textContent = "LIVE (FALLBACK API)";
        }

        // Update Map Marker and Polyline
        if (lat !== null && lon !== null) {
            updateMapMarker(lat, lon, data);
        }
    }

    // -------------------------------------------------------------------------
    // Fetch Live Telemetry (Dual-Mode: Flask Backend + GitHub Pages Static Support)
    // -------------------------------------------------------------------------
    async function fetchLiveTelemetry() {
        if (isFetching) return;
        isFetching = true;

        try {
            let data = null;

            // Strategy 1: Attempt local Flask API endpoint (/api/iss)
            try {
                const response = await fetch("/api/iss", {
                    headers: { "Accept": "application/json" }
                });
                if (response.ok) {
                    data = await response.json();
                }
            } catch (localErr) {
                // Not running on Flask server (e.g. GitHub Pages or static host)
            }

            // Strategy 2: If /api/iss is unavailable (GitHub Pages), query public CORS API directly
            if (!data || !data.success) {
                const pubResponse = await fetch("https://api.wheretheiss.at/v1/satellites/25544");
                if (pubResponse.ok) {
                    const raw = await pubResponse.json();
                    const lat = parseFloat(raw.latitude);
                    const lon = parseFloat(raw.longitude);
                    const alt = parseFloat(raw.altitude);
                    const vel = parseFloat(raw.velocity);
                    const vis = String(raw.visibility || "unknown").toLowerCase();
                    const epoch = parseInt(raw.timestamp);
                    const dt = new Date(epoch * 1000);
                    const timestampStr = dt.toISOString().replace("T", " ").substring(0, 19) + " UTC";

                    data = {
                        success: true,
                        status: "LIVE (GitHub Pages Direct)",
                        latitude: Math.round(lat * 10000) / 10000,
                        longitude: Math.round(lon * 10000) / 10000,
                        altitude: Math.round(alt * 100) / 100,
                        altitude_str: `${(Math.round(alt * 100) / 100).toFixed(2)} km`,
                        velocity: Math.round(vel * 100) / 100,
                        velocity_str: `${Math.round(vel).toLocaleString()} km/h`,
                        velocity_kms: Math.round((vel / 3600) * 100) / 100,
                        velocity_kms_str: `${(vel / 3600).toFixed(2)} km/s`,
                        visibility: vis === "daylight" ? "Daylight (Sunlit)" : "Orbital Night (In Earth's Shadow)",
                        visibility_raw: vis,
                        footprint_km: Math.round(parseFloat(raw.footprint || 0) * 100) / 100,
                        timestamp: timestampStr,
                        raw_timestamp: epoch,
                        source: "WhereTheISS.at (Direct CORS Feed for GitHub Pages)",
                        error: null
                    };

                    // Persist to browser localStorage for tracking history on GitHub Pages
                    saveClientHistory(data);
                }
            }

            if (data && data.success) {
                updateUI(data);
                loadTrackingHistory();
            } else {
                showError("Unable to retrieve live ISS data. Retrying...");
            }

        } catch (err) {
            console.error("Telemetry fetch error:", err);
            showError("Unable to retrieve live ISS data. Retrying...");
        } finally {
            isFetching = false;
            // Reset countdown for next automatic update
            countdownRemaining = POLLING_INTERVAL_SEC;
            updateCountdownDisplay();
        }
    }

    // -------------------------------------------------------------------------
    // Client-side LocalStorage Tracking History (For GitHub Pages)
    // -------------------------------------------------------------------------
    function saveClientHistory(data) {
        try {
            let hist = JSON.parse(localStorage.getItem("iss_history_cache") || "[]");
            hist.unshift({
                id: hist.length + 1,
                timestamp: data.timestamp,
                latitude: data.latitude,
                longitude: data.longitude,
                altitude: data.altitude_str,
                velocity: data.velocity_str,
                visibility: data.visibility
            });
            if (hist.length > 50) hist = hist.slice(0, 50); // Keep last 50
            localStorage.setItem("iss_history_cache", JSON.stringify(hist));
        } catch (e) {
            console.warn("LocalStorage save warning:", e);
        }
    }

    // -------------------------------------------------------------------------
    // Tracking History Table Fetcher (Dual-Mode: SQLite or LocalStorage)
    // -------------------------------------------------------------------------
    async function loadTrackingHistory() {
        try {
            // First try SQLite backend route
            const res = await fetch("/api/history?limit=15");
            if (res.ok) {
                const data = await res.json();
                if (data.success && Array.isArray(data.history)) {
                    renderHistoryTable(data.history);
                    return;
                }
            }
        } catch (e) {
            // Not on Flask server
        }

        // Fallback for GitHub Pages: load from localStorage
        try {
            const localHist = JSON.parse(localStorage.getItem("iss_history_cache") || "[]");
            renderHistoryTable(localHist.slice(0, 15));
        } catch (e) {
            console.warn("Could not load local history:", e);
        }
    }

    function renderHistoryTable(records) {
        if (!records || records.length === 0) {
            historyTableBody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center text-muted py-4">No tracking history recorded yet.</td>
                </tr>
            `;
            historyCount.textContent = "0 records recorded";
            return;
        }

        historyCount.textContent = `Showing latest ${records.length} records`;

        const rowsHtml = records.map(rec => {
            let visBadge = `<span class="table-pill">${rec.visibility}</span>`;
            if (rec.visibility.toLowerCase().includes("daylight")) {
                visBadge = `<span class="table-pill pill-daylight">☀️ Daylight</span>`;
            } else if (rec.visibility.toLowerCase().includes("night") || rec.visibility.toLowerCase().includes("eclipsed")) {
                visBadge = `<span class="table-pill pill-eclipsed">🌑 Night</span>`;
            }

            return `
                <tr>
                    <td><strong>#${rec.id}</strong></td>
                    <td>${rec.timestamp}</td>
                    <td>${formatCoord(rec.latitude, true)}</td>
                    <td>${formatCoord(rec.longitude, false)}</td>
                    <td>${rec.altitude}</td>
                    <td>${rec.velocity}</td>
                    <td>${visBadge}</td>
                </tr>
            `;
        }).join("");

        historyTableBody.innerHTML = rowsHtml;
    }

    // -------------------------------------------------------------------------
    // Map Controls Listeners
    // -------------------------------------------------------------------------
    function setAutoFollow(enabled) {
        autoFollow = enabled;
        if (autoFollow) {
            btnToggleFollow.classList.add("active");
            followIndicator.textContent = "✓";
            if (issMarker) {
                map.panTo(issMarker.getLatLng(), { animate: true });
            }
        } else {
            btnToggleFollow.classList.remove("active");
            followIndicator.textContent = "✕";
        }
    }

    btnToggleFollow.addEventListener("click", () => {
        setAutoFollow(!autoFollow);
    });

    btnRecenter.addEventListener("click", () => {
        if (issMarker) {
            map.setView(issMarker.getLatLng(), 4, { animate: true });
            setAutoFollow(true);
        }
    });

    btnTogglePath.addEventListener("click", () => {
        showTrail = !showTrail;
        if (showTrail) {
            trailPolyline.addTo(map);
            btnTogglePath.classList.remove("active");
            btnTogglePath.textContent = "Hide Trail";
        } else {
            map.removeLayer(trailPolyline);
            btnTogglePath.classList.add("active");
            btnTogglePath.textContent = "Show Trail";
        }
    });

    btnClearTrail.addEventListener("click", () => {
        trailCoordinates.length = 0;
        trailPolyline.setLatLngs([]);
    });

    // -------------------------------------------------------------------------
    // Full View / Fullscreen Toggle Implementation
    // -------------------------------------------------------------------------
    function setFullscreenMode(enable) {
        if (enable) {
            mapWrapper.classList.add("is-fullscreen");
            document.body.style.overflow = "hidden"; // Prevent page scrolling in full view
            fullscreenText.textContent = "Exit Full View";
            fullscreenIconExpand.style.display = "none";
            fullscreenIconCompress.style.display = "inline-block";
            btnFullscreen.classList.add("active");
        } else {
            mapWrapper.classList.remove("is-fullscreen");
            document.body.style.overflow = "";
            fullscreenText.textContent = "Full View";
            fullscreenIconExpand.style.display = "inline-block";
            fullscreenIconCompress.style.display = "none";
            btnFullscreen.classList.remove("active");
        }

        // Trigger Leaflet map dimension recalculation
        setTimeout(() => {
            map.invalidateSize();
            if (issMarker && autoFollow) {
                map.panTo(issMarker.getLatLng(), { animate: true });
            }
        }, 150);
    }

    function toggleFullscreen() {
        const isCurrentlyFull = mapWrapper.classList.contains("is-fullscreen");
        setFullscreenMode(!isCurrentlyFull);
    }

    btnFullscreen.addEventListener("click", toggleFullscreen);
    btnFloatingExitFullscreen.addEventListener("click", () => setFullscreenMode(false));

    // Handle Escape Key to exit Full View cleanly
    window.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && mapWrapper.classList.contains("is-fullscreen")) {
            setFullscreenMode(false);
        }
    });

    // Handle window resize event
    window.addEventListener("resize", () => {
        map.invalidateSize();
    });

    btnManualRefresh.addEventListener("click", () => {
        fetchLiveTelemetry();
    });

    btnRefreshHistory.addEventListener("click", () => {
        loadTrackingHistory();
    });

    btnClearHistory.addEventListener("click", async () => {
        if (!confirm("Are you sure you want to clear the recorded tracking history?")) {
            return;
        }

        try {
            await fetch("/api/history/clear", { method: "POST" });
        } catch (err) {
            // If running on static host (GitHub Pages), ignore network error
        }

        // Always clear client-side localStorage and refresh view
        try {
            localStorage.removeItem("iss_history_cache");
        } catch (e) {}

        loadTrackingHistory();
    });

    // -------------------------------------------------------------------------
    // Countdown Timer Loop
    // -------------------------------------------------------------------------
    function updateCountdownDisplay() {
        countdownText.textContent = `Next update: ${countdownRemaining}s`;
    }

    function startTimerLoop() {
        if (countdownTimer) clearInterval(countdownTimer);

        countdownTimer = setInterval(() => {
            countdownRemaining--;
            if (countdownRemaining <= 0) {
                fetchLiveTelemetry();
            } else {
                updateCountdownDisplay();
            }
        }, 1000);
    }

    // -------------------------------------------------------------------------
    // Initial Startup Sequence
    // -------------------------------------------------------------------------
    fetchLiveTelemetry();
    loadTrackingHistory();
    startTimerLoop();
});

