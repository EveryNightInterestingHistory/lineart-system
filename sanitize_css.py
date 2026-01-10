import os

file_path = r'e:\ИИ\NP\style.css'

try:
    with open(file_path, 'rb') as f:
        content = f.read()

    # Filter out null bytes and other non-printable chars (except whitespace)
    # We want to keep 0x09 (tab), 0x0A (LF), 0x0D (CR), and 0x20-0x7E (printable ASCII)
    # Plus UTF-8 sequences.
    
    # Actually, simpler: decode as utf-8 with 'ignore' or 'replace', then re-encode.
    # This will strip invalid byte sequences.
    
    text = content.decode('utf-8', errors='ignore')
    
    # Also remove null characters if they survived decoding (unlikely but possible if encoded as \x00)
    text = text.replace('\x00', '')
    
    # Write back
    with open(file_path, 'w', encoding='utf-8') as f:
        f.write(text)
        
    print(f"Sanitized style.css. New size: {len(text)} chars.")

except Exception as e:
    print(f"Error: {e}")
