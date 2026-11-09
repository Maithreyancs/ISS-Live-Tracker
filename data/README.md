# ISS Live Tracker - Data Directory

This directory stores database files and documentation related to ISS tracking telemetry.

## Database Overview

- **Engine:** SQLite 3
- **Database File:** `../database.db` (created automatically in the project root on first run)
- **Table:** `tracking_history`

## Schema Definition

```sql
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
```

## Data Management & Pruning

To keep the application lightweight and beginner-friendly:
1. Records are automatically logged whenever live ISS coordinates are fetched.
2. The system retains the most recent 100 entries, automatically pruning older data to prevent excessive storage growth.
3. If no database exists, the Flask application initializes one automatically at launch.

