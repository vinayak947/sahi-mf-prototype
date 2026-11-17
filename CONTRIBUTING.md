# Pushing to main

Everyone on this repo pushes to `main`, and every push publishes the prototype. To keep each other's work safe:

## Always pull before you push

```bash
git pull --rebase origin main   # get everyone else's latest work on top
npm run build                   # check it still builds
git push origin main
```

If git says your push was **rejected** or the pre-push check stops you, someone pushed after your last pull. Run the three lines above again.

## Never force-push main

Don't use `git push --force` or `--force-with-lease` on `main`, and don't use `--no-verify` to skip the check. A force-push overwrites other people's commits.

If a pull gives you a conflict you can't sort out, stop and ask in the team channel. Don't force your version over theirs.

## One-time setup

Run `npm install` once after cloning (or after pulling this change). It turns on the pre-push check in `.githooks/pre-push`, which stops a push to `main` if you haven't pulled the latest.

To make `git pull` rebase by default:

```bash
git config pull.rebase true
```
