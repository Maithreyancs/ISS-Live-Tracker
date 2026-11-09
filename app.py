"""
Real-Time International Space Station (ISS) Tracking and Visualization System
-----------------------------------------------------------------------------
Backend: Flask Application
Author: College Project
Description:
    This Flask server provides API endpoints to fetch live ISS orbital coordinates,
    altitude, velocity, and solar visibility from a verified public API.
    Telemetry is logged into a lightweight SQLite database for historical tracking.
"""

import os
import sqlite3
from datetime import datetime, timezone
import requests
from flask import Flask, render_template, jsonify, request

# Initialize Flask application
app = Flask(__name__)

# Database configuration
BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASE_DIR, "database.db")

# API Configuration
PRIMARY_API_URL = "https://api.wheretheiss.at/v1/satellites/25544"
FALLBACK_API_URL = "http://api.open-notify.org/iss-now.json"
REQUEST_TIMEOUT = 5  # seconds


# ---------------------------------------------------------------------------
# Database Management
# ---------------------------------------------------------------------------

def get_db_connection():
    """Establishes and returns a connection to the SQLite database."""
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row  # Enables dictionary-like access to columns
    return conn


def init_db():
    """Creates the tracking_history table if it does not already exist."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tracking_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            timestamp TEXT NOT NULL,
            latitude REAL NOT NULL,
            longitude REAL NOT NULL,
            altitude REAL,
            velocity REAL,
            visibility TEXT,
            recorded_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    """)
    conn.commit()
    conn.close()


def save_tracking_point(timestamp_str, latitude, longitude, altitude, velocity, visibility):
    """
    Saves a single telemetry point into SQLite and prunes old records
    to prevent unlimited historical database growth.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Insert current point
        cursor.execute("""
            INSERT INTO tracking_history (timestamp, latitude, longitude, altitude, velocity, visibility)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (timestamp_str, latitude, longitude, altitude, velocity, visibility))
        
        # Prune old records: keep only the 100 most recent points
        cursor.execute("""
            DELETE FROM tracking_history
            WHERE id NOT IN (
                SELECT id FROM tracking_history ORDER BY id DESC LIMIT 100
            )
        """)
        
        conn.commit()
        conn.close()
    except Exception as db_err:
        print(f"[Database Warning] Failed to log tracking point: {db_err}")


def fetch_recent_history(limit=20):
    """Retrieves recent recorded tracking points from SQLite."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT id, timestamp, latitude, longitude, altitude, velocity, visibility
            FROM tracking_history
            ORDER BY id DESC
            LIMIT ?
        """, (limit,))
        rows = cursor.fetchall()
        conn.close()
        
        history = []
        for row in rows:
            history.append({
                "id": row["id"],
                "timestamp": row["timestamp"],
                "latitude": round(row["latitude"], 4),
                "longitude": round(row["longitude"], 4),
                "altitude": f"{round(row['altitude'], 2)} km" if row["altitude"] is not None else "N/A",
                "velocity": f"{round(row['velocity'], 2):,} km/h" if row["velocity"] is not None else "N/A",
                "visibility": row["visibility"] if row["visibility"] else "N/A"
            })
        return history
    except Exception as err:
        print(f"[Database Error] Could not fetch history: {err}")
        return []


# ---------------------------------------------------------------------------
# External API Integration & Telemetry Fetching
# ---------------------------------------------------------------------------

def fetch_live_iss():
    """
    Fetches real-time ISS telemetry from the primary public API.
    If the primary API is unreachable, attempts a graceful fallback.
    Never invents or fabricates fake telemetry values.
    """
    headers = {
        "User-Agent": "ISS-Live-Tracker/1.0 (College Student Project; Python/Flask)"
    }
    
    # Attempt 1: Primary API (wheretheiss.at - provides coordinates, altitude, velocity, visibility)
    try:
        response = requests.get(PRIMARY_API_URL, headers=headers, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            
            lat = float(data.get("latitude", 0.0))
            lon = float(data.get("longitude", 0.0))
            alt = float(data.get("altitude", 0.0))
            vel = float(data.get("velocity", 0.0))
            vis_raw = str(data.get("visibility", "unknown")).lower()
            epoch_time = int(data.get("timestamp", 0))
            footprint = float(data.get("footprint", 0.0))
            
            # Format solar visibility
            if vis_raw == "daylight":
                visibility_label = "Daylight (Sunlit)"
            elif vis_raw == "eclipsed":
                visibility_label = "Orbital Night (In Earth's Shadow)"
            else:
                visibility_label = vis_raw.capitalize()
                
            # Formatted human-readable UTC timestamp
            dt = datetime.fromtimestamp(epoch_time, tz=timezone.utc)
            timestamp_str = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
            
            # Save to SQLite database
            save_tracking_point(timestamp_str, lat, lon, alt, vel, visibility_label)
            
            return {
                "success": True,
                "status": "LIVE",
                "latitude": round(lat, 4),
                "longitude": round(lon, 4),
                "altitude": round(alt, 2),
                "altitude_str": f"{round(alt, 2)} km",
                "velocity": round(vel, 2),
                "velocity_str": f"{round(vel, 2):,} km/h",
                "velocity_kms": round(vel / 3600.0, 2),
                "velocity_kms_str": f"{round(vel / 3600.0, 2)} km/s",
                "visibility": visibility_label,
                "visibility_raw": vis_raw,
                "footprint_km": round(footprint, 2),
                "timestamp": timestamp_str,
                "raw_timestamp": epoch_time,
                "source": "WhereTheISS.at (Primary Telemetry)",
                "error": None
            }
    except requests.RequestException as e:
        print(f"[Primary API Warning] Error accessing {PRIMARY_API_URL}: {e}")

    # Attempt 2: Fallback API (Open-Notify - provides latitude and longitude only)
    try:
        response = requests.get(FALLBACK_API_URL, headers=headers, timeout=REQUEST_TIMEOUT)
        if response.status_code == 200:
            data = response.json()
            if data.get("message") == "success":
                pos = data.get("iss_position", {})
                lat = float(pos.get("latitude", 0.0))
                lon = float(pos.get("longitude", 0.0))
                epoch_time = int(data.get("timestamp", 0))
                
                dt = datetime.fromtimestamp(epoch_time, tz=timezone.utc)
                timestamp_str = dt.strftime("%Y-%m-%d %H:%M:%S UTC")
                
                # As per requirements: do NOT fake altitude or velocity if missing from API
                save_tracking_point(timestamp_str, lat, lon, None, None, "Unavailable")
                
                return {
                    "success": True,
                    "status": "LIVE (Fallback Source)",
                    "latitude": round(lat, 4),
                    "longitude": round(lon, 4),
                    "altitude": None,
                    "altitude_str": "Unavailable",
                    "velocity": None,
                    "velocity_str": "Unavailable",
                    "velocity_kms": None,
                    "velocity_kms_str": "Unavailable",
                    "visibility": "Unavailable from fallback API",
                    "visibility_raw": "unavailable",
                    "footprint_km": None,
                    "timestamp": timestamp_str,
                    "raw_timestamp": epoch_time,
                    "source": "Open-Notify (Fallback Telemetry - Lat/Lon only)",
                    "error": None
                }
    except requests.RequestException as e:
        print(f"[Fallback API Warning] Error accessing {FALLBACK_API_URL}: {e}")

    # If both APIs failed, return an informative error state without crashing
    return {
        "success": False,
        "status": "DISCONNECTED",
        "latitude": None,
        "longitude": None,
        "altitude": None,
        "altitude_str": "N/A",
        "velocity": None,
        "velocity_str": "N/A",
        "velocity_kms": None,
        "velocity_kms_str": "N/A",
        "visibility": "N/A",
        "visibility_raw": "unknown",
        "footprint_km": None,
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC"),
        "raw_timestamp": None,
        "source": "None",
        "error": "Unable to retrieve live ISS data. Retrying..."
    }


# ---------------------------------------------------------------------------
# Application Routes
# ---------------------------------------------------------------------------

@app.route("/")
def index():
    """Renders the main dashboard page."""
    return render_template("index.html")


@app.route("/api/iss")
def api_iss():
    """
    JSON API endpoint returning real-time ISS telemetry.
    Called asynchronously by JavaScript fetch() every few seconds.
    """
    telemetry = fetch_live_iss()
    return jsonify(telemetry)


@app.route("/api/history")
def api_history():
    """
    JSON API endpoint returning recent tracking records from SQLite.
    """
    limit = request.args.get("limit", default=15, type=int)
    # Clamp limit between 1 and 100 for safety
    limit = max(1, min(limit, 100))
    history_data = fetch_recent_history(limit=limit)
    return jsonify({
        "success": True,
        "count": len(history_data),
        "history": history_data
    })


@app.route("/api/history/clear", methods=["POST"])
def api_clear_history():
    """Clears the SQLite tracking history table."""
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("DELETE FROM tracking_history")
        conn.commit()
        conn.close()
        return jsonify({"success": True, "message": "Tracking history cleared."})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ---------------------------------------------------------------------------
# Application Startup
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    # Ensure SQLite database and table exist
    init_db()
    print("=" * 60)
    print("  ISS LIVE TRACKER - Python Flask Server")
    print("  Real-Time International Space Station Tracking System")
    print("  Running on: http://127.0.0.1:5000")
    print("=" * 60)
    app.run(host="127.0.0.1", port=5000, debug=True)

