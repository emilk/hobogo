#!/bin/bash
set -eu

# Pre-requisites:
rustup target add wasm32-unknown-unknown
if ! [[ $(wasm-bindgen --version) ]]; then
    cargo install wasm-bindgen-cli
fi

# Build rust:
cargo build --target wasm32-unknown-unknown

# Lint and clean up typescript:
tslint --fix docs/*.ts

# Compile typescript:
tsc

# Generate JS bindings for wasm:
wasm-bindgen target/wasm32-unknown-unknown/debug/hobogo.wasm \
  --out-dir docs --no-modules
  # --no-modules-global hoboho
