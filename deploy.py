import sys
import subprocess

def run_remote():
    try:
        import paramiko
    except ImportError:
        subprocess.check_call([sys.executable, "-m", "pip", "install", "paramiko"])
        import paramiko

    host = "147.93.123.69"
    user = "root"
    password = "MoNjiz@M2024"
    target_dir = "/var/www/rfq"

    print(f"Connecting to {host} as {user}...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect(host, username=user, password=password, timeout=10)
    print("SSH Connection established successfully!")

    commands = [
        f"mkdir -p {target_dir}",
        "echo '=== VPS Environment Check ==='",
        "uname -a",
        "df -h /",
        "free -h",
    ]

    for cmd in commands:
        print(f"\n---> Executing: {cmd}")
        stdin, stdout, stderr = ssh.exec_command(cmd)
        out = stdout.read().decode("utf-8")
        err = stderr.read().decode("utf-8")
        if out:
            print(out.strip())
        if err:
            print("ERR:", err.strip())

    ssh.close()

if __name__ == "__main__":
    run_remote()
