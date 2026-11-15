#!/bin/sh
set -eu
cd "$(dirname "$0")"
node --version
cmake -S . -B build
cmake --build build -j 2
exec node server.js
