from files import *
from utils import create_file
import os

print("Starting pg setup")

os.mkdir("initdb", mode=0o777)

create_file(".env", dotenv)
create_file("docker-compose.yml", docker_compose_yml)
create_file("initdb/01_init.sql", initdb_01_init_sql)

print(f"Created with PG_PASS \"{POSTGRES_PASSWORD[:4]}...\" and app_user password: \"{APP_USER_PASS[:4]}...\"")
create_file(".passwords", 
f"""# Passwords backup. Don't leak it
POSTGRES_PASSWORD="{POSTGRES_PASSWORD}"
APP_USER_PASS="{APP_USER_PASS}"
""", True)

from urllib.parse import quote
import re

def _full_url_encode(value: str) -> str:
    base = quote(value, safe='')

    return (base
        .replace('!', '%21')
        .replace('#', '%23')
        .replace("'", '%27')
        .replace('(', '%28')
        .replace(')', '%29')
        .replace('*', '%2A')
        .replace('-', '%2D')
        .replace('.', '%2E')
        .replace('_', '%5F')
        .replace('~', '%7E')
    )

def _set_env_var(file_path: str, key: str, value: str) -> None:
    line = f'{key}="{value}"'
    if not os.path.exists(file_path):
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(line + '\n')
        return

    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    pattern = re.compile(rf'^\s*{re.escape(key)}\s*=\s*.*$', re.MULTILINE)

    if pattern.search(content):
        content = pattern.sub(line, content)
    else:
        if content and not content.endswith('\n'):
            content += '\n'
        content += line + '\n'

    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(content)

# Caminho do .env alvo (quatro níveis acima da pasta atual do script)
target_env_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../site/.env"))

# URL-encode total das senhas
encoded_pg_pass = _full_url_encode(POSTGRES_PASSWORD)
encoded_app_pass = _full_url_encode(APP_USER_PASS)

# Montagem das URLs
app_url = f"postgresql://app_user:{encoded_app_pass}@127.0.0.1:54322/app_db?schema=app"

# Atualiza/cria as chaves no .env externo
_set_env_var(target_env_path, "DATABASE_URL", app_url)

print(f'Updated {target_env_path} with DATABASE_URL.')

print("Successfuly created all files, run 'make run' to continue...")
