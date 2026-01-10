import re

file_path = r'e:\ИИ\NP\style.css'

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

print(f"Total lines: {len(lines)}")

media_print_indices = [i for i, line in enumerate(lines) if '@media print' in line]
print(f"@media print found at lines: {media_print_indices}")

# Check for orphaned print styles (black text !important, white bg !important)
orphaned_print_indices = []
for i, line in enumerate(lines):
    if 'color: black !important;' in line and not any(start < i < start + 200 for start in media_print_indices):
        # Heuristic: if it's far from a media print start, it might be orphaned.
        # But we need to check if it's inside a block.
        orphaned_print_indices.append(i)

print(f"Potential orphaned print styles at lines: {orphaned_print_indices[:10]}...")

# Check brace balance
balance = 0
for i, line in enumerate(lines):
    balance += line.count('{')
    balance -= line.count('}')
    if balance < 0:
        print(f"Negative brace balance at line {i}: {line.strip()}")
        balance = 0 # Reset to avoid cascading errors

print(f"Final brace balance: {balance}")
