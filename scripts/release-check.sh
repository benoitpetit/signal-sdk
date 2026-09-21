#!/usr/bin/env bash

set -euo pipefail

npm run lint
npm run build
npm run test:ci
npm pack --dry-run --ignore-scripts
