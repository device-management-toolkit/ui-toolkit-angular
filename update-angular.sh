#!/bin/bash

# # Get the current branch name
# current_branch=$(git rev-parse --abbrev-ref HEAD)

# # Get the default branch (typically main or master)
# default_branch=$(git symbolic-ref refs/remotes/origin/HEAD | sed 's@^refs/remotes/origin/@@')

# # Check if there are uncommitted changes
# if ! git diff --quiet || ! git diff --staged --quiet; then
#   echo "Error: Your working directory has uncommitted changes. Please commit or stash them before running this script."
#   exit 1
# fi

# # Ensure we are on the default branch
# if [ "$current_branch" != "$default_branch" ]; then
#   echo "Error: You are on branch '$current_branch'. Please switch to '$default_branch' before running this script."
#   exit 1
# fi

# # Create and switch to the new branch
# git checkout -b angularUpdates


# Update Angular CLI
ng update @angular/cli
git add .
git commit -m "build(deps): update angular"
# Update Angular Core
ng update @angular/core
git add .
git commit --amend --no-edit
# Update Angular Material
ng update @angular/material
git add .
git commit --amend --no-edit
# Update Angular CDK
ng update @angular/cdk
git add .
git commit --amend --no-edit
