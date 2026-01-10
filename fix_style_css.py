
import os

file_path = r'e:\ИИ\NP\style.css'

# The correct new styles to append
new_styles = """
    overflow-y: auto;
    min-height: 0;
}

.project-details-grid {
    align-items: start;
}

/* Project Details Cards */
.project-header-card,
.contacts-card,
.finance-card,
.transactions-card,
.sections-card,
.gallery-card {
    background-color: rgba(30, 30, 30, 0.6);
    backdrop-filter: blur(12px);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
    margin-bottom: 20px;
}

.card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;
}

.card-header h3 {
    margin: 0;
    font-size: 1.1rem;
    font-weight: 600;
}

.sections-card,
.gallery-card,
.map-card {
    grid-column: 1 / -1;
}

/* Gallery Grid Layout */
.gallery-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
}
"""

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines up to 2583 (index 2583 is line 2584, so slice [:2583])
# Line 2583 in the file is "    flex: 1;"
# We need to keep it.
# Python list is 0-indexed. Line 1 is index 0.
# Line 2583 is index 2582.
# So we want lines[:2583].

clean_lines = lines[:2583]

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(clean_lines)
    f.write(new_styles)

print(f"Fixed style.css. New length: {len(clean_lines) + new_styles.count(chr(10))} lines.")
