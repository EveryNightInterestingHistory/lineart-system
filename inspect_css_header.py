import os

file_path = r'e:\ИИ\NP\style.css'

with open(file_path, 'rb') as f:
    content = f.read(50)
    
print(content)
