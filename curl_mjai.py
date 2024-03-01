#!/usr/bin/env python3
import os
import sys
import requests
import argparse
import re

parser = argparse.ArgumentParser(description="Utility to help download json files for local development")
parser.add_argument('-u', '--url', required=True)
args = parser.parse_args()

json_url = re.sub('killerducky.*=/', '', args.url)
local_file_path = re.sub('.*=/', '', args.url)
local_url = (f"http://127.0.0.1:5500/index.html?data={local_file_path}")
os.makedirs(os.path.dirname(local_file_path), exist_ok=True)

print('server url ', args.url)
print('server json', json_url)
print('local  json', local_file_path)
print('local  url ', local_url)
if os.path.exists(local_file_path):
    print(f"{local_file_path} already exists")
    sys.exit()
response = requests.get(json_url)
if response.status_code == 200:
    with open(local_file_path, "wb") as file:
        file.write(response.content)
    print(f"File downloaded and saved to {local_file_path}")
else:
    print("Failed to download the file")

