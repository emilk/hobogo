#!/bin/bash
set -eu

# Pre-requisites:
rustup target add wasm32-unknown-unknown
if ! [[ $(wasm-bindgen --version) ]]; then
    cargo install wasm-bindgen-cli
fi

BUILD=release

# Build rust:
cargo build --$BUILD --target wasm32-unknown-unknown

# Lint and clean up typescript:
tslint --fix docs/*.ts

# Compile typescript:
tsc

# Generate JS bindings for wasm:
wasm-bindgen target/wasm32-unknown-unknown/"$BUILD"/hobogo.wasm \
  --out-dir docs --no-modules
  # --no-modules-global hoboho
