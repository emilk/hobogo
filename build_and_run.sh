#!/bin/bash
set -eu

./build.sh

# open "docs/index.html"
open http://localhost:8889
