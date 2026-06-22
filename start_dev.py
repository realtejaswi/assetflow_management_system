#!/usr/bin/env python3
"""
AssetFlow Ecosystem — Local Development Startup Script

Usage:
    python start_dev.py --mode infra      # Start only MongoDB, Redis, Ollama
    python start_dev.py --mode bank       # Start Bank Simulator backend
    python start_dev.py --mode assetflow  # Start all AssetFlow services
    python start_dev.py --mode all        # Start everything
    python start_dev.py --stop            # Stop infrastructure
"""

import subprocess
import sys
import os
import time
import argparse

ROOT = os.path.dirname(os.path.abspath(__file__))

SERVICES = {
    "bank_backend": {
        "cwd": os.path.join(ROOT, "bank-simulator", "backend"),
        "cmd": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"],
        "venv": os.path.join(ROOT, "bank-simulator", "backend", "venv"),
    },
    "bank_frontend": {
        "cwd": os.path.join(ROOT, "bank-simulator", "frontend"),
        "cmd": ["npm", "run", "dev"],
    },
    "assetflow_backend": {
        "cwd": os.path.join(ROOT, "assetflow-system", "backend"),
        "cmd": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8002", "--reload"],
        "venv": os.path.join(ROOT, "assetflow-system", "backend", "venv"),
    },
    "consumer_service": {
        "cwd": os.path.join(ROOT, "assetflow-system", "consumer-service"),
        "cmd": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8003", "--reload"],
        "venv": os.path.join(ROOT, "assetflow-system", "consumer-service", "venv"),
    },
    "ml_service": {
        "cwd": os.path.join(ROOT, "assetflow-system", "ml-service"),
        "cmd": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8005", "--reload"],
        "venv": os.path.join(ROOT, "assetflow-system", "ml-service", "venv"),
    },
    "ai_service": {
        "cwd": os.path.join(ROOT, "assetflow-system", "ai-service"),
        "cmd": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8006", "--reload"],
        "venv": os.path.join(ROOT, "assetflow-system", "ai-service", "venv"),
    },
    "tax_service": {
        "cwd": os.path.join(ROOT, "assetflow-system", "tax-service"),
        "cmd": ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8007", "--reload"],
        "venv": os.path.join(ROOT, "assetflow-system", "tax-service", "venv"),
    },
    "assetflow_frontend": {
        "cwd": os.path.join(ROOT, "assetflow-system", "frontend"),
        "cmd": ["npm", "run", "dev"],
    },
}


def run_infra(action="up"):
    """Start/stop infrastructure with Docker Compose."""
    if action == "up":
        print("[+] Starting infrastructure (MongoDB, Redis, Ollama)...")
        subprocess.Popen(
            ["docker", "compose", "-f", "docker-compose.dev.yml", "up", "-d"],
            cwd=ROOT
        ).wait()
        print("[WAIT] Waiting 10s for MongoDB and Redis to initialize...")
        time.sleep(10)
        print("[+] Pulling phi3 model into Ollama (this may take a few minutes on first run)...")
        subprocess.Popen(
            ["docker", "exec", "assetflow-ollama-dev", "ollama", "pull", "phi3"],
            cwd=ROOT
        ).wait()
        print("[OK] Infrastructure ready!")
    else:
        print("[-] Stopping infrastructure...")
        subprocess.Popen(
            ["docker", "compose", "-f", "docker-compose.dev.yml", "down"],
            cwd=ROOT
        ).wait()


def install_venv(service_name, svc):
    """Create venv and install requirements if not present."""
    venv_path = svc.get("venv")
    if not venv_path:
        return
    if not os.path.exists(venv_path):
        print(f"[+] Creating venv for {service_name}...")
        subprocess.run([sys.executable, "-m", "venv", venv_path], check=True)
    req_path = os.path.join(svc["cwd"], "requirements.txt")
    if os.path.exists(req_path):
        pip = os.path.join(venv_path, "Scripts", "pip.exe") if sys.platform == "win32" else os.path.join(venv_path, "bin", "pip")
        subprocess.run([pip, "install", "-r", req_path, "-q"], check=True)


def start_service(service_name, svc):
    """Start a service in a new terminal window."""
    install_venv(service_name, svc)
    cmd = svc["cmd"]
    venv = svc.get("venv")
    if venv and sys.platform == "win32":
        python = os.path.join(venv, "Scripts", "python.exe")
        if cmd[0] in ["uvicorn", "python"]:
            cmd = [python, "-m"] + cmd

    if sys.platform == "win32":
        subprocess.Popen(
            ["start", "cmd", "/k", " ".join(cmd)],
            cwd=svc["cwd"], shell=True
        )
    else:
        subprocess.Popen(
            ["gnome-terminal", "--", "bash", "-c", " ".join(cmd) + "; exec bash"],
            cwd=svc["cwd"]
        )
    print(f"[OK] Started {service_name}")


def main():
    parser = argparse.ArgumentParser(description="AssetFlow Dev Startup")
    parser.add_argument("--mode", choices=["infra", "bank", "assetflow", "all"], default="all")
    parser.add_argument("--stop", action="store_true")
    args = parser.parse_args()

    if args.stop:
        run_infra("down")
        return

    run_infra("up")

    if args.mode in ("bank", "all"):
        for name in ["bank_backend", "bank_frontend"]:
            start_service(name, SERVICES[name])
            time.sleep(2)

    if args.mode in ("assetflow", "all"):
        for name in ["assetflow_backend", "consumer_service", "ml_service", "ai_service", "tax_service", "assetflow_frontend"]:
            start_service(name, SERVICES[name])
            time.sleep(2)

    print("\n" + "=" * 60)
    print("AssetFlow Ecosystem is starting!")
    print("=" * 60)
    print(f"  Bank Simulator UI:       http://localhost:3001")
    print(f"  Bank Simulator API:      http://localhost:8001/docs")
    print(f"  AssetFlow UI:            http://localhost:3002")
    print(f"  AssetFlow API:           http://localhost:8002/docs")
    print(f"  ML Service:              http://localhost:8005/docs")
    print(f"  AI Service:              http://localhost:8006/docs")
    print(f"  Tax Service:             http://localhost:8007/docs")
    print(f"  MongoDB GUI (Mongo-Exp): http://localhost:8081")
    print(f"  Redis Commander:         http://localhost:8082")
    print("=" * 60)
    print("\n[INFO] Demo credentials: admin@bank.com / admin123")


if __name__ == "__main__":
    main()
