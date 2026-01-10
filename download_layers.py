import os
import urllib.request

base_url = "https://unpkg.com/leaflet@1.9.4/dist/images/"
target_dir = r"e:\ИИ\NP\lib\leaflet\images"

files = ["layers.png", "layers-2x.png"]

if not os.path.exists(target_dir):
    os.makedirs(target_dir)

for file in files:
    url = base_url + file
    path = os.path.join(target_dir, file)
    print(f"Downloading {file} from {url}...")
    try:
        urllib.request.urlretrieve(url, path)
        print(f"Saved {file}")
    except Exception as e:
        print(f"Error downloading {file}: {e}")
