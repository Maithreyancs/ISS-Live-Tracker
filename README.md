[![Live Demo](https://img.shields.io/badge/🚀%20Live%20Demo-ISS%20Live%20Tracker-blue?style=for-the-badge)](https://iss-live-tracker.onrender.com)




# ISS LIVE TRACKER
### Real-Time International Space Station Tracking & Visualization System

A full-stack, real-time web application developed using Python, Flask, JavaScript, and Leaflet.js that dynamically tracks the current orbital position of the International Space Station (ISS) and displays its motion across an interactive world map.

---

## 1. Project Title
**Real-Time International Space Station (ISS) Tracking and Visualization System**

---

## 2. Project Overview
The International Space Station (ISS) is a habitable artificial satellite traveling in Low Earth Orbit (LEO) at an altitude of approximately 400 to 430 kilometers, hurtling through space at roughly 27,600 km/h (~7.66 km/s). At this staggering speed, it completes a full orbit around Earth every 92–93 minutes, making 15.5 to 16 revolutions per Earth day.

This project provides an interactive scientific dashboard that fetches authentic real-time orbital telemetry from public space APIs, plots the position on an interactive Leaflet/OpenStreetMap world map, animates the traveled ground path, records historical telemetry in a local SQLite database, and presents crucial orbital data including coordinates, speed, altitude, and solar illumination state (daylight vs. orbital night).

---

## 3. Problem Statement
Most public discussions regarding satellites assume they remain fixed in the sky or behave similarly to everyday weather or GPS satellites. Furthermore, tracking fast-moving orbital objects usually requires complex aerospace software or cluttered commercial applications. Students and astronomy enthusiasts often lack a clean, lightweight, open-source educational dashboard to observe how Low Earth Orbit mechanics work in real time without heavy software installations or proprietary paywalls.

---

## 4. Objectives
- **Real-Time Telemetry Retrieval:** Securely fetch authentic ISS coordinates, altitude, velocity, and solar lighting conditions from a public REST API.
- **Dynamic Geographic Visualization:** Plot the live position on an interactive world map using Leaflet.js and OpenStreetMap without reloading the entire webpage.
- **Trajectory Path Rendering:** Maintain recent geographic coordinates and draw a continuous ground trail indicating the space station’s traveled path.
- **Educational Distinction:** Clearly explain the functional and orbital differences between the ISS (manned, Low Earth Orbit), GPS satellites (Medium Earth Orbit), and Geostationary communication satellites (GEO).
- **Persistent Local History:** Log recent coordinate data into an embedded SQLite database with automatic record pruning to prevent data bloat.
- **Fault-Tolerant Operation:** Provide robust error handling and fallback mechanisms so the application remains stable and friendly during network interruptions.

---

## 5. Features
1. **Live Orbital Coordinate Tracking:** Real-time updates of latitude and longitude formatted with cardinal directions (N/S, E/W) and hemisphere identifiers.
2. **Speed & Altitude Telemetry:** Shows instantaneous orbital velocity (~27,600 km/h | ~7.66 km/s) and altitude (~410–430 km).
3. **Solar Illumination State:** Indicates whether the ISS is currently in direct sunlight ("Daylight") or traveling in Earth's shadow ("Orbital Night / Eclipsed").
4. **Interactive Leaflet.js World Map:** Pan, zoom, center, and inspect the station with a custom space station marker and popup information card.
5. **Dynamic Ground Trail (Polyline):** Renders recent flight history on the globe with auto-pruning (last 50 positions) and antimeridian date-line crossing protection.
6. **Auto-Follow Mode:** Automatically pans the camera to keep the ISS centered on screen, with smooth toggle controls.
7. **Asynchronous Polling (AJAX / Fetch API):** Seamless updates every 5 seconds without disturbing the user experience or reloading the page.
8. **SQLite Historical Telemetry Log:** Records recent observations in a local database with a clean UI table, manual refresh, and one-click database cleanup.
9. **Resilient Fallback & Graceful Error Handling:** Automatically handles API rate limits, timeouts, and network outages with a clean notification banner.
10. **Modern Scientific UI:** Professional light theme with crisp blue and cyan accents, accessible typography, and responsive support for desktop, tablets, and smartphones.

---

## 6. Technologies Used
- **Backend:** Python 3.x, Flask (Lightweight WSGI Web Framework)
- **HTTP Client:** Requests library (with custom headers and strict request timeouts)
- **Frontend / Presentation:** HTML5, CSS3 (Modern Flexbox & CSS Grid, Light Theme)
- **Client-Side Logic:** Vanilla JavaScript (ES6+, Fetch API, async/await, DOM manipulation)
- **Mapping & GIS:** Leaflet.js (v1.9.4) & OpenStreetMap tile servers
- **Data Persistence:** SQLite 3 (Built into Python standard library)
- **Data Interchange:** JSON (JavaScript Object Notation)

---

## 7. System Architecture

```text
+-------------------------------------------------------------+
|                     Client Web Browser                      |
|  - HTML5 / CSS3 Scientific Dashboard UI                    |
|  - Leaflet.js Map & Custom ISS Marker                       |
|  - JavaScript Polling Engine (Fetch API every 5 seconds)    |
+------------------------------+------------------------------+
                               |
                   HTTP GET /api/iss (JSON)
                               |
                               v
+-------------------------------------------------------------+
|                    Flask Python Backend                     |
|  - app.py                                                   |
|  - Route Handler & JSON Serialization                       |
|  - Error Handling & Timeout Protection                      |
+---------------+-----------------------------+---------------+
                |                             |
      Stores Telemetry Data         Fetches Live Telemetry
                |                             |
                v                             v
+-------------------------------+ +---------------------------+
|      SQLite Database          | |  External Public API      |
|  - database.db                | |  WhereTheISS.at /         |
|  - tracking_history Table     | |  Open-Notify Fallback     |
|  - Auto-prunes to 100 rows    | +---------------------------+
+-------------------------------+
```

---

## 8. How It Works
1. **Client Request:** When the user opens the application (`http://127.0.0.1:5000`), Flask renders `templates/index.html` and serves the static CSS, JavaScript, and SVG assets.
2. **Initial Telemetry Fetch:** As soon as the page loads, `script.js` fires an asynchronous `fetch('/api/iss')` request to the Flask server.
3. **Backend Proxying:** The Flask backend contacts `https://api.wheretheiss.at/v1/satellites/25544` with a 5-second timeout.
4. **Data Validation & Persistence:** Flask extracts coordinates, altitude, velocity, and solar visibility. It logs this entry into `database.db` and prunes records older than the last 100 entries.
5. **JSON Response:** Flask delivers a formatted JSON payload back to the browser.
6. **DOM & Map Update:** JavaScript receives the coordinates, updates the metric cards, smoothly transitions the Leaflet map marker, and appends the coordinate to the orbital path polyline.
7. **Periodic Refresh:** A 5-second countdown timer runs in JavaScript, triggering recurring updates without ever refreshing the browser window.

---

## 9. Project Structure
```text
iss_tracker/
│
├── app.py                  # Main Flask application and API route controllers
├── requirements.txt        # Minimal required Python dependencies
├── README.md               # Complete project documentation and guide
├── database.db             # SQLite database storing tracking history
│
├── templates/
│   └── index.html          # Main HTML5 dashboard template
│
├── static/
│   ├── css/
│   │   └── style.css       # Clean, modern scientific light theme
│   ├── js/
│   │   └── script.js       # Asynchronous telemetry polling & Leaflet map logic
│   └── images/
│       └── iss-icon.svg    # High-resolution vector icon of the space station
│
└── data/
    └── README.md           # Database schema documentation and retention rules
```

---

## 10. Installation

### Step 1: Create a Virtual Environment
Open your terminal or command prompt inside the project folder:
```bash
python -m venv venv
```

### Step 2: Activate the Virtual Environment
- **Windows (Command Prompt / PowerShell):**
  ```powershell
  venv\Scripts\activate
  ```
- **macOS / Linux:**
  ```bash
  source venv/bin/activate
  ```

### Step 3: Install Required Dependencies
Install the required packages (`Flask` and `requests`):
```bash
pip install -r requirements.txt
```

---

## 11. How to Run Locally
Start the Flask development server:
```bash
python app.py
```

Open your web browser and navigate to:
```text
http://127.0.0.1:5000
```
The application will immediately connect to the live satellite feed and begin real-time visualization.

---

## 11.1 Hosting on GitHub (GitHub Pages)

### Is it possible to host on GitHub?
**Yes!** While GitHub Pages natively serves static files (HTML, CSS, JavaScript) and does not run a Python interpreter, this project has been engineered with a **Dual-Mode Architecture**:

1. **When running with Flask (`python app.py`):** It uses the Flask backend, SQLite database persistence, and internal proxy routes.
2. **When deployed to GitHub Pages:** The client-side JavaScript automatically detects static hosting and securely connects directly to the public CORS-enabled satellite telemetry API (`WhereTheISS.at`). Tracking history is seamlessly maintained using browser `localStorage`!

### Step-by-Step Instructions to Host on GitHub Pages:

#### Step 1: Push your code to GitHub
If you haven't pushed your code to GitHub yet, create a new repository on [GitHub](https://github.com/new) named `iss-live-tracker`, then execute:
```bash
git branch -M main
git remote add origin https://github.com/<YOUR-USERNAME>/iss-live-tracker.git
git push -u origin main
```

#### Step 2: Enable GitHub Pages in Repository Settings
1. Navigate to your repository on GitHub (`https://github.com/<YOUR-USERNAME>/iss-live-tracker`).
2. Click the **Settings** tab near the top.
3. In the left navigation menu, click **Pages** (under the "Code and automation" section).
4. Under **Build and deployment**:
   - **Source:** Select `Deploy from a branch`.
   - **Branch:** Select `main` and set the folder dropdown to `/ (root)`.
   - Click **Save**.
5. Wait ~60 seconds for GitHub Actions to complete the deployment.

#### Step 3: Access Your Live Website
Your tracking system will be live at:
```text
https://<YOUR-USERNAME>.github.io/iss-live-tracker/
```

---

## 11.2 Hosting the Full Flask Backend on the Cloud (Optional)
If your college evaluation requires running the actual Python Flask backend on the cloud, you can host it for free on **Render** or **Railway**:
1. Connect your GitHub repository to [Render.com](https://render.com).
2. Create a new **Web Service**.
3. Render automatically detects `Procfile` (`web: python app.py`) and `requirements.txt`.
4. Click **Deploy Web Service** to obtain a live `https://iss-tracker.onrender.com` URL.

---

## 12. API Information

### 1. Telemetry Endpoint: `GET /api/iss`
Returns real-time orbital metrics and coordinates.
- **Example Response:**
```json
{
  "success": true,
  "status": "LIVE",
  "latitude": -45.8111,
  "longitude": -35.6279,
  "altitude": 432.72,
  "altitude_str": "432.72 km",
  "velocity": 27549.55,
  "velocity_str": "27,549.55 km/h",
  "velocity_kms": 7.65,
  "velocity_kms_str": "7.65 km/s",
  "visibility": "Daylight (Sunlit)",
  "visibility_raw": "daylight",
  "footprint_km": 4568.21,
  "timestamp": "2026-11-09 15:35:10 UTC",
  "raw_timestamp": 1794238510,
  "source": "WhereTheISS.at (Primary Telemetry)",
  "error": null
}
```

### 2. History Endpoint: `GET /api/history?limit=15`
Returns recent logged orbital tracking points from SQLite.
- **Parameters:** `limit` (optional integer, default: 15, max: 100)
- **Example Response:**
```json
{
  "count": 2,
  "history": [
    {
      "id": 2,
      "latitude": -45.8111,
      "longitude": -35.6279,
      "altitude": "432.72 km",
      "velocity": "27,549.55 km/h",
      "visibility": "Daylight (Sunlit)",
      "timestamp": "2026-11-09 15:35:10 UTC"
    }
  ],
  "success": true
}
```

### 3. Clear History Endpoint: `POST /api/history/clear`
Clears the contents of the `tracking_history` table.

---

## 13. Screenshots Section Placeholder

> *Place application screenshots in this section for college presentation and project reports.*

```text
+---------------------------------------------------------------------------------+
|  [ ISS LIVE TRACKER: Real-Time Visualization Dashboard ]                         |
|                                                                                 |
|  [Latitude: 24.1234° N] [Longitude: 78.4321° E] [Altitude: 418 km] [LIVE]       |
|                                                                                 |
|  +---------------------------------------------------------------------------+  |
|  |                           LEAFLET WORLD MAP                               |  |
|  |           [Marker: ISS] ~ ~ ~ ~ ~ ~ [Orbital Ground Trail]                |  |
|  +---------------------------------------------------------------------------+  |
|                                                                                 |
|  [ ISS Details & Orbit Info ]         [ Solar Illumination: Daylight / Night ]  |
|  [ Satellite Comparison Table ]       [ SQLite Telemetry History Table ]        |
+---------------------------------------------------------------------------------+
```

---

## 14. Future Enhancements
- **Future Pass Predictor:** Calculate and predict when the ISS will fly over a user's specific city or GPS coordinates.
- **Astronaut Crew Roster:** Integrate with Open-Notify crew API to display names, photos, and current mission duration of astronauts currently aboard the ISS.
- **3D Cesium.js / Three.js Earth Globe:** Provide an optional 3D orbital globe view rendering the actual orbital altitude above a spherical Earth model.
- **Audio Pass Notifications:** Trigger audio alerts or desktop notifications when the ISS is entering the user's visible horizon.

---

## 15. Advantages
- **Lightweight & Beginner-Friendly:** Uses standard Flask and vanilla JavaScript without cumbersome frontend frameworks like React, Vue, or Webpack.
- **High Data Accuracy:** Connects to authentic space tracking APIs and never fabricates telemetry data.
- **Low Network Footprint:** Employs client-side AJAX polling with 5-second intervals and lightweight JSON payloads.
- **Clean Scientific Aesthetics:** Crisp, responsive light theme tailored specifically for academic presentations.
- **Zero Configuration:** Database initializes itself automatically upon launching `app.py`.

---

## 16. Limitations
- **External API Dependency:** Relies on third-party satellite telemetry endpoints. If the external servers experience downtime, the app operates in fallback mode.
- **2D Map Distortion:** Standard Mercator map projections distort polar regions, causing high-latitude ground tracks to appear stretched.
- **Local SQLite Storage:** Designed for single-user or classroom demonstration; high-volume multi-user environments would benefit from PostgreSQL or Redis.

---

## 17. Conclusion
The **Real-Time International Space Station Tracking and Visualization System** successfully demonstrates the integration of modern web technologies, RESTful APIs, GIS mapping libraries, and relational database logging. The project provides an engaging, educational, and scientifically accurate platform for students and space enthusiasts to observe celestial orbital mechanics in real time.

---

## 18. Author
- **Course:** B.E. Computer Science &amp; Engineering / Cyber Security
- **Project Type:** College Capstone Project
- **Academic Year:** 2026–2027

