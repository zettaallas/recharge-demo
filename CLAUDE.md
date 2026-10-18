# Working on Recharge

Two people edit this repo: zettaallas and ekin-su-gumus. Never overwrite the other person's work.

- `index.html` is the older app to reference from for the expo app at `.\app`.
- Before making any change, run `git pull --rebase` so the other person's latest commits are saved locally first.
- After changing, commit, run `git pull --rebase` again, then `git push`. If the pull reports a conflict, keep both people's changes and ask before dropping anything.
- GitHub Pages republishes https://zettaallas.github.io/recharge-demo/ about 30 seconds after a push.
- The claude.ai artifact (https://claude.ai/artifact/DmrcgJuFF6vtm9xGCHHQMz) is a separate copy. To update it, run `tools/make-artifact.sh` and publish `artifact.html` to that artifact's URL.
- Use fictional data only. Never add real pupils.
