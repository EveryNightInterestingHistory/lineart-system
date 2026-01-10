import os

file_path = r'e:\ИИ\NP\app.js'

try:
    with open(file_path, 'r', encoding='utf-8') as f:
        content = f.read()

    replacements = {
        '< div': '<div',
        '</div >': '</div>',
        '< option': '<option',
        '</option >': '</option>',
        '< li': '<li',
        '</li >': '</li>'
    }

    new_content = content
    count = 0
    for old, new in replacements.items():
        occurrences = new_content.count(old)
        if occurrences > 0:
            print(f"Found {occurrences} occurrences of '{old}'")
            new_content = new_content.replace(old, new)
            count += occurrences

    if count > 0:
        with open(file_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print(f"Successfully replaced {count} malformed tags.")
    else:
        print("No malformed tags found.")

except Exception as e:
    print(f"Error: {e}")
