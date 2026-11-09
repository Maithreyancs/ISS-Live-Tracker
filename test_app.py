"""
Automated Test Suite for ISS Live Tracker
-----------------------------------------
Author: College Project
Description:
    Runs unit and integration tests across all Flask routes, API endpoints,
    database logging functions, and external telemetry fallback mechanisms.
"""

import unittest
import json
import sqlite3
import os
from app import app, init_db, DB_PATH, fetch_recent_history, save_tracking_point

class TestISSTracker(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        """Sets up the Flask test client and initializes the database."""
        app.config["TESTING"] = True
        cls.client = app.test_client()
        init_db()

    def test_01_home_page_renders(self):
        """Verifies that the main dashboard HTML page loads successfully (HTTP 200)."""
        response = self.client.get("/")
        self.assertEqual(response.status_code, 200)
        self.assertIn(b"ISS LIVE TRACKER", response.data)
        self.assertIn(b"leaflet-map-container", response.data)

    def test_02_static_assets_available(self):
        """Ensures CSS, JS, and SVG image assets are correctly served."""
        css_res = self.client.get("/static/css/style.css")
        self.assertEqual(css_res.status_code, 200)

        js_res = self.client.get("/static/js/script.js")
        self.assertEqual(js_res.status_code, 200)

        svg_res = self.client.get("/static/images/iss-icon.svg")
        self.assertEqual(svg_res.status_code, 200)

    def test_03_live_api_endpoint(self):
        """Tests the /api/iss route for valid JSON schema and non-empty telemetry."""
        response = self.client.get("/api/iss")
        self.assertEqual(response.status_code, 200)
        
        data = response.get_json()
        self.assertIsInstance(data, dict)
        self.assertIn("success", data)
        self.assertIn("status", data)
        self.assertIn("latitude", data)
        self.assertIn("longitude", data)

        if data["success"]:
            # If successfully connected to live API, check realistic coordinate ranges
            self.assertGreaterEqual(data["latitude"], -90.0)
            self.assertLessEqual(data["latitude"], 90.0)
            self.assertGreaterEqual(data["longitude"], -180.0)
            self.assertLessEqual(data["longitude"], 180.0)

    def test_04_database_logging_and_retrieval(self):
        """Tests logging a telemetry point and retrieving it from SQLite."""
        test_time = "2026-11-09 12:00:00 UTC"
        save_tracking_point(test_time, 15.1234, 75.5678, 420.5, 27550.0, "Daylight (Test)")

        history = fetch_recent_history(limit=5)
        self.assertGreater(len(history), 0)
        latest = history[0]
        self.assertEqual(latest["latitude"], 15.1234)
        self.assertEqual(latest["longitude"], 75.5678)

    def test_05_database_pruning_limit(self):
        """Ensures that inserting over 100 points maintains the maximum 100-entry cap."""
        for i in range(110):
            save_tracking_point(f"2026-11-09 12:{i:02d}:00 UTC", float(i % 50), float(i % 50), 415.0, 27600.0, "Daylight")

        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM tracking_history")
        count = cursor.fetchone()[0]
        conn.close()

        self.assertLessEqual(count, 100, "Database should not store more than 100 points.")

    def test_06_history_api_and_clear(self):
        """Verifies GET /api/history and POST /api/history/clear endpoints."""
        get_res = self.client.get("/api/history?limit=10")
        self.assertEqual(get_res.status_code, 200)
        hist_data = get_res.get_json()
        self.assertTrue(hist_data["success"])

        # Clear history
        clear_res = self.client.post("/api/history/clear")
        self.assertEqual(clear_res.status_code, 200)
        self.assertTrue(clear_res.get_json()["success"])

        # Check that table count is now 0
        get_res_after = self.client.get("/api/history")
        self.assertEqual(get_res_after.get_json()["count"], 0)


if __name__ == "__main__":
    print("=" * 60)
    print("  Running ISS Live Tracker Automated Test Suite")
    print("=" * 60)
    unittest.main()

