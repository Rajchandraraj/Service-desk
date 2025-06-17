from flask import Flask
from flask_cors import CORS

from routes.ec2_routes import ec2_bp
from routes.s3_routes import s3_bp
from routes.security_routes import security_bp
from routes.utility_routes import utility_bp   # <-- Add this line

app = Flask(__name__)
CORS(app, origins="*")

app.register_blueprint(ec2_bp, url_prefix='/ec2')
app.register_blueprint(s3_bp, url_prefix='/s3')
app.register_blueprint(security_bp, url_prefix='/security')
app.register_blueprint(utility_bp, url_prefix='/utility')  # <-- Add this line

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)