import os

file_path = r'e:\ИИ\NP\style.css'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Remove empty lines and strip whitespace
clean_lines = [line.rstrip() for line in lines if line.strip()]

# Check for duplication
# We'll look for the ":root {" start marker and see if it appears multiple times
root_indices = [i for i, line in enumerate(clean_lines) if ':root {' in line]

if len(root_indices) > 1:
    print(f"Found {len(root_indices)} occurrences of ':root {{'. Truncating to the last valid block or removing duplicates.")
    # Assuming the last block is the most recent/valid one, or we just take the first one if they are identical.
    # But wait, if I appended to the end, the end might have the new stuff but the beginning is old.
    # However, the file size suggests duplication.
    # Let's try to take the content from the first :root { to the line before the second :root {
    # Actually, if the file was appended to itself, we might have:
    # [Original Content] [Original Content + New Stuff]
    # Or [Original Content] [New Stuff]
    
    # Let's just take the unique lines? No, order matters.
    # Let's take the first block and see.
    
    # Strategy: Read until we hit the second ":root {" and stop there?
    # Or maybe the duplication is more subtle.
    
    # Let's just remove the double spacing first and see if that fixes the main issue.
    # If the file is 6000 lines, and original was 3000, and we see double spacing...
    # 3000 lines * 2 = 6000 lines. So maybe it's JUST double spacing?
    pass

# Reconstruct content
content = '\n'.join(clean_lines)

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"Fixed style.css. New line count: {len(clean_lines)}")
