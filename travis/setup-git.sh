#!/bin/bash
#
# Setup the git user with the right credentials so we can push to the paper.js
# repository. The GH_TOKEN is generated as a secure environment variable:
#
# travis encrypt GH_TOKEN=<TOKEN> --add

git config --global user.name "Paper.js Bot"
git config --global user.email "bot@paperjs.org"
git config --global credential.helper "store --file ~/.git-credentials"
echo "https://${GH_TOKEN}:@github.com" > ~/.git-credentials
