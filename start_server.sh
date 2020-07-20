#!/bin/bash
set -eu

cd docs
echo "open http://localhost:8889"
python3 -m http.server 8889 --bind 127.0.0.1
