import subprocess
import os
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS


app = Flask(__name__, static_folder="../client/dist", static_url_path="")
CORS(app)


def run_redis_cli(*args):
    proc = subprocess.run(
        ["redis-cli", *args], capture_output=True, text=True, check=True
    )
    return proc.stdout.strip()


@app.route("/api/hello")
def hello():
    return "hello"


@app.route("/api/command", methods=["POST"])
def command():
    data = request.get_json(force=True)
    if "command" not in data:
        return jsonify({"error": "No command provided"}), 400
    run_redis_cli("SET", "command", data["command"])
    return jsonify({"command": data["command"]})


@app.route("/api/command", methods=["GET"])
def current_command():
    return jsonify({"command": run_redis_cli("GET", "command")})


@app.route("/", defaults={"path": ""})
@app.route("/<path:path>")
def serve(path):
    """
    Serve any file out of dist/ if it exists,
    otherwise fall back to index.html (for SPA routing).
    """
    if path and os.path.exists(os.path.join(app.static_folder, path)):
        return send_from_directory(app.static_folder, path)
    # either “/” or missing file → serve index.html
    return send_from_directory(app.static_folder, "index.html")


if __name__ == "__main__":
    app.run("0.0.0.0", port=80, debug=True)
