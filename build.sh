#!/bin/bash
set -eu

# Pre-requisites:
rustup target add wasm32-unknown-unknown
if ! [[ $(wasm-bindgen --version) ]]; then
    cargo install wasm-bindgen-cli
fi

# Build rust:
cargo build --target wasm32-unknown-unknown

# Generate JS bindings for wasm:
rm -rf pkg
mkdir -p pkg
wasm-bindgen target/wasm32-unknown-unknown/debug/hobogo.wasm \
  --out-dir pkg --no-modules
  # --no-modules-global hoboho
