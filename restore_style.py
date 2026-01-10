import os

file_path = r'e:\ИИ\NP\style.css'

new_content = """
/* Print Styles */
@media print {
    body {
        background: white !important;
        color: black !important;
    }
    .sidebar,
    .top-bar,
    .btn-primary,
    .btn-secondary,
    .btn-icon,
    .btn-icon-sm,
    .modal,
    #toast-container,
    .actions,
    .toolbar,
    .nav-menu,
    .user-profile,
    .logo,
    .gallery-actions,
    .file-actions {
        display: none !important;
    }
    .main-content {
        margin-left: 0 !important;
        padding: 0 !important;
        width: 100% !important;
    }
    .app-container {
        display: block !important;
        height: auto !important;
        overflow: visible !important;
    }
    .view {
        display: none !important;
    }
    .view.active {
        display: block !important;
        padding: 0 !important;
    }
    .card,
    .section-card,
    .project-info-card,
    .persons-card,
    .finance-card,
    .transactions-card {
        border: 1px solid #ddd !important;
        background: white !important;
        color: black !important;
        box-shadow: none !important;
        break-inside: avoid;
        margin-bottom: 20px;
    }
    .status-badge {
        border: 1px solid #000 !important;
        color: black !important;
        background: transparent !important;
    }
    /* Ensure text is dark */
    h1,
    h2,
    h3,
    h4,
    h5,
    h6,
    p,
    span,
    div,
    label {
        color: black !important;
    }
    /* Adjust Grid for Print */
    .project-details-content {
        display: block !important;
    }
    .project-details-content>div {
        margin-bottom: 20px;
    }
    /* Links */
    a {
        text-decoration: none !important;
        color: black !important;
    }
}

/* Project Details Grid */
.project-details-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 20px;
    align-items: start;
    padding-bottom: 30px;
}
.project-header-card,
.persons-card,
.finance-card,
.transactions-card {
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 20px;
}
.gallery-wrapper {
    grid-column: 1 / -1;
    background: var(--glass-bg);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 20px;
}
/* Gallery Grid Items */
.gallery-item {
    position: relative;
    aspect-ratio: 1;
    overflow: hidden;
    border-radius: 8px;
    cursor: pointer;
    background-color: rgba(255, 255, 255, 0.05);
    border: 1px solid var(--glass-border);
}
.gallery-item img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transition: transform 0.3s ease;
}
.gallery-item:hover img {
    transform: scale(1.05);
    filter: blur(3px) brightness(0.7);
}
.gallery-actions {
    position: absolute;
    top: 5px;
    right: 5px;
    display: flex;
    gap: 5px;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 10;
    background: rgba(0, 0, 0, 0.5);
    padding: 4px;
    border-radius: 6px;
    backdrop-filter: blur(4px);
}
.gallery-item:hover .gallery-actions {
    opacity: 1;
}
/* Global Card Style */
.card {
    background: var(--bg-card);
    border: 1px solid var(--glass-border);
    border-radius: 16px;
    padding: 20px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}
"""

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Keep lines 0 to 2360 (inclusive)
# Line 2360 is the closing brace for .detail-row
# Line 2361 is the extra brace
kept_lines = lines[:2361]

# Write back
with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(kept_lines)
    f.write(new_content)

print(f"Restored style.css. New line count: {len(kept_lines) + new_content.count(chr(10))}")
