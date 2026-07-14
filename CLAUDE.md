# Working with Epiq (project owner)

Epiq is non-technical and often on his phone using voice dictation. Rules for every session:

1. **Always give clickable links** when asking him to do something. Never describe where to click without the URL.
2. **No em dashes** in any writing, chat included. (Also a content rule for video scripts.)
3. **Plain language.** No jargon (deploy, permalink, repo, encode). Say "the folder", "the link", "the video file".
4. **Show, don't describe.** Render images/boards for any visual decision. He picks from labeled options (A/B/C).
5. **One ask at a time.** Multi-step instructions get lost. Numbered steps, max ~5, each one action.
6. **Be straight.** He calls out overselling ("stop the cap"). Say plainly what is real, what is missing, what failed.
7. He may deny permission dialogs (AskUserQuestion). Prefer plain text questions.

# Project

The real project is `agoravoy/` (content machine for his Virgin Voyages travel agency). Read `agoravoy/README.md` then `agoravoy/HANDOFF.md` first. `agoravoy/BRAND.md` is the locked visual spec; never deviate from it. The NativeScript app at the repo root is unrelated leftovers.

# Environment notes

- Chat uploads from Epiq land in `/root/.claude/uploads/<session>/`. Videos over ~30MB fail silently on his end; route big files through Google Drive instead.
- The Google Drive connector sees ONLY the agoravoytravel@gmail.com shared drive (parent id `0ANXoX_mDCQXMUk9PVA`). Read calls work; download/copy/create hit an approval wall. Workaround for big files: he flips the file to "Anyone with the link", then `curl "https://drive.usercontent.google.com/download?id=<ID>&export=download&confirm=t"`.
- ffmpeg needs `apt-get update && apt-get install -y ffmpeg` each fresh container. api.heygen.com IS reachable from here.
- SendUserFile has a 30MB limit; compress previews with crf 24.
