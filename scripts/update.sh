#!/usr/bin/env bash

# Exit immediately if anything fails
set -e

# Clean workspace
rm -rf node_modules
rm -rf dist
rm -f package-lock.json

# Update and install dependencies
npm pkg set engines.vscode="^$(npm view @types/vscode version)"
sudo npm install -g npm-check-updates
npx npm-check-updates -u
npm install
npm audit fix --force
