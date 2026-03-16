#!/bin/bash
# Use nicojoaquin account for this repo
GH_TOKEN=$(gh auth token --user nicojoaquin 2>/dev/null)
if [ -n "$GH_TOKEN" ]; then
  echo "protocol=https"
  echo "host=github.com"
  echo "username=nicojoaquin"
  echo "password=$GH_TOKEN"
fi
