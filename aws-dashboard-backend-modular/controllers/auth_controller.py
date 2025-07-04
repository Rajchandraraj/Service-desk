from flask import request, jsonify, session
from werkzeug.security import check_password_hash
from db_models.user_model import get_user_by_email


def login():
    data = request.json
    email = data.get("email")
    password = data.get("password")
    user = get_user_by_email(email)
    if user and user["password_hash"] == password:
        session["user"] = email
        return jsonify({"message": "Login successful", "email": email, "role": user["role"]})
    return jsonify({"error": "Invalid credentials"}), 401

def logout():
    session.pop("user", None)
    return jsonify({"message": "Logged out"})