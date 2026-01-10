
with open(r'e:\ИИ\NP\index.html', 'r', encoding='utf-8') as f:
    content = f.read()
    if 'id="employee-form"' in content:
        print("Found id=\"employee-form\"")
        count = content.count('id="employee-form"')
        print(f"Count: {count}")
    else:
        print("Not found")
