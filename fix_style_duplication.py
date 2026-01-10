lines = open('e:/ИИ/NP/style.css', 'r', encoding='utf-8').readlines()
# We want to keep lines 1-1972 (indices 0-1971)
# And lines 2177-end (indices 2176-end)
# Removing lines 1973-2176 (indices 1972-2175)

# Verify line 1973 starts with "background-color" and line 2177 starts with "/* New Section"
print(f"Line 1973: {lines[1972]}")
print(f"Line 2177: {lines[2176]}")

if "background-color" in lines[1972] and "New Section" in lines[2176]:
    new_content = "".join(lines[:1972] + lines[2176:])
    with open('e:/ИИ/NP/style.css', 'w', encoding='utf-8') as f:
        f.write(new_content)
    print("File updated successfully.")
else:
    print("Validation failed. Indices might be wrong.")
