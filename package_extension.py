"""
Build script to package the extension for Chrome Web Store and Edge Add-ons.
Creates a clean production ZIP excluding all developer files, docs, and git files.
"""

import os
import json
import zipfile

def build():
    with open('manifest.json', 'r', encoding='utf-8') as f:
        manifest = json.load(f)

    version = manifest.get('version', '1.0.0')
    os.makedirs('dist', exist_ok=True)
    zip_name = f'dist/claude-farsi-fonts-v{version}.zip'

    include_files = [
        'manifest.json',
        'background.js',
        'content.js',
    ]

    include_dirs = [
        'css',
        'fonts',
        'icons',
        'popup'
    ]

    with zipfile.ZipFile(zip_name, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in include_files:
            if os.path.exists(f):
                zf.write(f, arcname=f)
                print(f'Added: {f}')

        for d in include_dirs:
            for root, dirs, files in os.walk(d):
                for file in files:
                    path = os.path.join(root, file)
                    arcname = path.replace('\\', '/')
                    zf.write(path, arcname=arcname)
                    print(f'Added: {arcname}')

    size_kb = os.path.getsize(zip_name) / 1024
    print(f'\nPackage created: {zip_name} ({size_kb:.1f} KB)')

if __name__ == '__main__':
    build()
