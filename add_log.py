
import os

file_path = r'e:\ИИ\NP\app.js'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

if "console.log('App.js loaded - Fix Attempt 4');" not in content:
    new_content = "console.log('App.js loaded - Fix Attempt 4');\n" + content
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("Added console log to app.js")
else:
    print("Console log already present")
