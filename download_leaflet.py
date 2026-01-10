import os
import urllib.request

def download_file(url, filepath):
    try:
        os.makedirs(os.path.dirname(filepath), exist_ok=True)
        print(f"Downloading {url} to {filepath}...")
        urllib.request.urlretrieve(url, filepath)
        print(f"Downloaded: {filepath}")
    except Exception as e:
        print(f"Failed to download {url}: {e}")

base_dir = "lib/leaflet"
images_dir = os.path.join(base_dir, "images")

files = {
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.css": os.path.join(base_dir, "leaflet.css"),
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.js": os.path.join(base_dir, "leaflet.js"),
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png": os.path.join(images_dir, "marker-icon.png"),
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png": os.path.join(images_dir, "marker-icon-2x.png"),
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png": os.path.join(images_dir, "marker-shadow.png"),
}

for url, path in files.items():
    download_file(url, path)
