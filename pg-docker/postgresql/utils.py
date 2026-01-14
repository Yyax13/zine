import random
import os

def gen_tag() -> str:
    lengths = [2, 4, 12, 48, 160, 320, 512, 1024, 2048, 4096]
    tag_parts = []

    pool = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%&*()_+-=.,'
    for d in range(3):
        length = lengths[min(d, len(lengths) - 1)]
        segment = ''.join(random.choice(pool) for _ in range(length))
        tag_parts.append(segment)

    return '-'.join(tag_parts)

def create_file(path, content, secure=False):
    with open(path, 'w') as f:
        f.write(content)
        print(f"Created {path}")
        f.close()
    
    if secure:
        os.chmod(path, 0o600)