#!/bin/bash
set -eu

# Pre-requisites:
# cargo install wasm-bindgen-cli

cargo build --target wasm32-unknown-unknown
rm -rf pkg
mkdir -p pkg
wasm-bindgen target/wasm32-unknown-unknown/debug/hobogo.wasm \
  --out-dir pkg --no-modules
  # --no-modules-global hoboho

