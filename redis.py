import subprocess


def run_redis_cli(*args):
    try:
        proc = subprocess.run(
            ["redis-cli", *args], capture_output=True, text=True, check=True
        )
        return proc.stdout.strip()
    except:
        return None
