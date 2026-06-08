#!/usr/bin/env bash

# Minimum VS Code API version
version="1.65.0"

# Clean workspace
set -e

# Clean workspace
rm -rf .vscode-test dist node_modules out package-lock.json

# Update and install dependencies
sudo npm install -g npm-check-updates
npx npm-check-updates -u
npm pkg set engines.vscode="^$version"
npm install -D @types/vscode@"$version"
npm install
npm audit fix --force
