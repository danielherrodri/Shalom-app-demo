"""Fail closed on missing scanner; redact findings and never print secret values."""
import argparse
import shutil
import subprocess
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def forbidden(path):
    file = Path(path)
    name = file.name.lower()
    return (name.startswith('.env') and name != '.env.example') or file.suffix.lower() in {'.pem', '.key', '.p12', '.pfx', '.sqlite3', '.db', '.sql', '.dump', '.backup', '.bak'} or name in {'id_rsa', 'id_ed25519', '.npmrc', '.pypirc', 'credentials.json'} or any(part.lower() in {'backups', 'private-data', 'datos-reales', '.aws', '.ssh'} for part in file.parts)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--staged', action='store_true')
    parser.add_argument('--history', action='store_true')
    options = parser.parse_args()
    executable = ROOT / '.security-tools' / ('gitleaks.exe' if __import__('os').name == 'nt' else 'gitleaks')
    if not executable.exists():
        raise SystemExit('Falta escáner. Ejecuta python scripts/install_gitleaks.py; no se omite la validación.')
    if options.history:
        result = subprocess.run([str(executable), 'git', '.', '--redact=100', '--no-banner', '--log-opts=--all'], cwd=ROOT)
        raise SystemExit(result.returncode)
    raw = git('diff', '--cached', '--name-only', '--diff-filter=ACMR', '-z') if options.staged else git('ls-files', '--cached', '--others', '--exclude-standard', '-z')
    paths = sorted(set(p.decode('utf-8') for p in raw.split(b'\0') if p))
    blocked = [p for p in paths if forbidden(p)]
    if blocked:
        print('Archivos restringidos detectados (solo rutas):')
        print('\n'.join(blocked))
        raise SystemExit(1)
    with tempfile.TemporaryDirectory(prefix='shalom-scan-') as folder:
        for path in paths:
            source = ROOT / path
            if not options.staged and not source.is_file():
                continue
            destination = Path(folder) / path
            destination.parent.mkdir(parents=True, exist_ok=True)
            if options.staged:
                destination.write_bytes(git('show', ':' + path))
            else:
                shutil.copyfile(source, destination)
        result = subprocess.run([str(executable), 'dir', folder, '--redact=100', '--no-banner'], cwd=ROOT)
    raise SystemExit(result.returncode)


if __name__ == '__main__':
    main()
