"""Download a fixed official release and verify its published SHA-256."""
import hashlib
import io
import platform
import tarfile
import urllib.request
import zipfile
from pathlib import Path

VERSION = '8.30.1'
ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / '.security-tools'


def install():
    system = {'Windows': 'windows', 'Linux': 'linux'}.get(platform.system())
    if not system or platform.machine().lower() not in {'amd64', 'x86_64'}:
        raise SystemExit('Instala Gitleaks 8.30.1 para tu plataforma desde su distribución oficial.')
    extension = 'zip' if system == 'windows' else 'tar.gz'
    name = f'gitleaks_{VERSION}_{system}_x64.{extension}'
    base = f'https://github.com/gitleaks/gitleaks/releases/download/v{VERSION}/'
    checksums = urllib.request.urlopen(base + f'gitleaks_{VERSION}_checksums.txt', timeout=45).read().decode()
    expected = next(line.split()[0] for line in checksums.splitlines() if line.split()[-1] == name)
    payload = urllib.request.urlopen(base + name, timeout=45).read()
    if hashlib.sha256(payload).hexdigest() != expected:
        raise SystemExit('Checksum incorrecto; no se instala.')
    executable = 'gitleaks.exe' if system == 'windows' else 'gitleaks'
    if extension == 'zip':
        with zipfile.ZipFile(io.BytesIO(payload)) as archive:
            binary = archive.read(executable)
    else:
        with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as archive:
            binary = archive.extractfile(executable).read()
    TARGET.mkdir(exist_ok=True)
    path = TARGET / executable
    path.write_bytes(binary)
    path.chmod(0o755)
    print(f'Gitleaks {VERSION}: archivo oficial verificado e instalado localmente.')


if __name__ == '__main__':
    install()
