USERS = [
    {
        "id": 1,
        "email": "admin@rapyder.com",
        "password_hash": "admin123",  # In production, use hashed passwords!
        "role": "admin"
    },
    {
        "id": 2,
        "email": "user@rapyder.com",
        "password_hash": "user123",
        "role": "user"
    }
]

def get_user_by_email(email):
    for user in USERS:
        if user["email"] == email:
            return user
    return None

def create_user(email, password_hash, role='user'):
    new_id = max(user["id"] for user in USERS) + 1 if USERS else 1
    user = {
        "id": new_id,
        "email": email,
        "password_hash": password_hash,
        "role": role
    }
    USERS.append(user)
    return user

def check_user_credentials(email, password_hash):
    user = get_user_by_email(email)
    if user and user["password_hash"] == password_hash:
        return user
    return None