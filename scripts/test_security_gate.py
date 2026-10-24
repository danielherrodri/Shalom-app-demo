"""Regression checks using generated fake secrets, never real credentials."""
import os
import secrets
import subprocess
import tempfile
import unittest
from pathlib import Path

from security_gate import ROOT, forbidden


class SecurityGateTests(unittest.TestCase):
    def test_restricted_files(self):
        for path in ['.env', '.env.production', '.ENV.local', 'x/key.pem',
                     'backup.sql', 'local.db', 'private-data/list.csv',
                     'datos-reales/personas.csv', '.aws/config', 'id_ed25519',
                     'credentials.json', 'backup.bak']:
            with self.subTest(path=path):
                self.assertTrue(forbidden(path))

    def test_source_files_allowed(self):
        for path in ['.env.example', 'backend/core/migrations/0001_initial.py',
                     'frontend/src/main.tsx', 'docs/desarrollo-seguro.md']:
            self.assertFalse(forbidden(path))

    def test_fake_secret_is_blocked_and_redacted(self):
        scanner = ROOT / '.security-tools' / ('gitleaks.exe' if os.name == 'nt' else 'gitleaks')
        self.assertTrue(scanner.is_file(), 'Instalar Gitleaks antes de verificar.')
        fake = 'gh' + 'p_' + secrets.token_hex(18)
        with tempfile.TemporaryDirectory(prefix='shalom-security-test-') as folder:
            (Path(folder) / 'example.txt').write_text('token = "' + fake + '"', encoding='utf-8')
            result = subprocess.run([str(scanner), 'dir', folder, '--redact=100', '--no-banner'],
                                    capture_output=True, text=True)
        self.assertEqual(result.returncode, 1, 'El ejemplo debe bloquearse.')
        self.assertNotIn(fake, result.stdout + result.stderr, 'No mostrar el valor detectado.')


if __name__ == '__main__':
    unittest.main()
