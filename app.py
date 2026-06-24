from flask import Flask, request, jsonify, render_template
from flask_cors import CORS
from pymongo import MongoClient
from dotenv import load_dotenv
import os
from datetime import datetime
import numpy as np

load_dotenv()

app = Flask(__name__)
CORS(app)

client = MongoClient(os.getenv("MONGO_URI"))
db = client["safetrace"]
incidents_col = db["incidents"]

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/report", methods=["POST"])
def report_incident():
    data = request.get_json()
    incident = {
        "type": data.get("type"),
        "description": data.get("description"),
        "lat": data.get("lat"),
        "lng": data.get("lng"),
        "timestamp": datetime.utcnow().isoformat()
    }
    incidents_col.insert_one(incident)
    return jsonify({"message": "Incident reported successfully"}), 201

@app.route("/incidents", methods=["GET"])
def get_incidents():
    incidents = list(incidents_col.find({}, {"_id": 0}))
    return jsonify(incidents), 200

@app.route("/safety-score", methods=["POST"])
def safety_score():
    data = request.get_json()
    click_lat = data.get("lat")
    click_lng = data.get("lng")

    # Get all incidents
    incidents = list(incidents_col.find({}, {"_id": 0}))

    if not incidents:
        return jsonify({"score": 10, "level": "Safe", "count": 0})

    # Count incidents within 5km radius
    nearby_count = 0
    type_weights = {
        "Harassment": 3,
        "Stalking": 4,
        "Unsafe Area": 2,
        "Poor Lighting": 1
    }

    weighted_score = 0
    for inc in incidents:
        # Calculate distance
        lat_diff = abs(inc["lat"] - click_lat)
        lng_diff = abs(inc["lng"] - click_lng)
        distance = (lat_diff**2 + lng_diff**2) ** 0.5

        if distance < 0.05:  # roughly 5km
            nearby_count += 1
            weighted_score += type_weights.get(inc["type"], 1)

    # Calculate safety score (10 = safest, 1 = most dangerous)
    if nearby_count == 0:
        score = 10
        level = "✅ Very Safe"
        color = "green"
    elif weighted_score <= 3:
        score = 8
        level = "🟡 Mostly Safe"
        color = "yellow"
    elif weighted_score <= 6:
        score = 6
        level = "🟠 Moderate Risk"
        color = "orange"
    elif weighted_score <= 10:
        score = 4
        level = "🔴 High Risk"
        color = "red"
    else:
        score = 2
        level = "🚨 Danger Zone!"
        color = "darkred"

    return jsonify({
        "score": score,
        "level": level,
        "color": color,
        "nearby_incidents": nearby_count
    })

@app.route("/danger-check", methods=["POST"])
def danger_check():
    data = request.get_json()
    user_lat = data.get("lat")
    user_lng = data.get("lng")

    incidents = list(incidents_col.find({}, {"_id": 0}))

    nearby_count = 0
    for inc in incidents:
        lat_diff = abs(inc["lat"] - user_lat)
        lng_diff = abs(inc["lng"] - user_lng)
        distance = (lat_diff**2 + lng_diff**2) ** 0.5
        if distance < 0.02:  # roughly 2km
            nearby_count += 1

    is_danger = nearby_count >= 2
    return jsonify({
        "is_danger": is_danger,
        "nearby_incidents": nearby_count
    })

import os

if __name__ == "__main__":
    app.run(
        host="0.0.0.0",
        port=int(os.environ.get("PORT", 5000)),
        debug=True
    )