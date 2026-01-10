file_path = r'e:\ИИ\NP\style.css'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 369 in 1-based index is index 368
start_line_idx = 368
content_from_start = "".join(lines[start_line_idx:])

# Find the first '{' in this content (which corresponds to .btn-primary {)
first_brace_pos = content_from_start.find('{')

if first_brace_pos == -1:
    print("Could not find opening brace")
    exit()

# Now find the matching closing brace
open_count = 0
found = False
for i, char in enumerate(content_from_start):
    if char == '{':
        open_count += 1
    elif char == '}':
        open_count -= 1
        if open_count == 0:
            # Found the matching brace
            # Calculate absolute position
            # We need to map 'i' back to line number
            parsed_content = content_from_start[:i+1]
            line_offset = parsed_content.count('\n')
            match_line = start_line_idx + 1 + line_offset
            print(f"Matching closing brace found at line {match_line}")
            found = True
            break

if not found:
    print("No matching closing brace found (file might be truncated or unbalanced)")
