
import os

file_path = r'e:\ИИ\NP\app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fixes
new_content = content.replace('< div', '<div')
new_content = new_content.replace('</div >', '</div>')
new_content = new_content.replace('< option', '<option')
new_content = new_content.replace('</option >', '</option>')

if content != new_content:
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Fixed syntax errors in app.js")
else:
    print("No changes needed")
