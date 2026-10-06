# Adding a blog post

Steps for an agent publishing a post. Each step ends on its completion
criterion. `app/blog/worms-wmd/` is a complete example of every step; copy
its shape rather than inventing one.

All visitor-facing text is lowercase (`AGENTS.md` §1): the title, the
prose, alt text, captions, the description, and reference fields. Keep the
author's own wording, spelling and punctuation; correct only a factual
claim, and tell the author which one and why.

## 1. Register the post

Add an entry to the top of `posts` in `lib/blog/posts.ts`: `slug`, `title`,
`date` (ISO `YYYY-MM-DD`), `href` (`/blog/<slug>`), and `artwork` if the
post has a plate (step 2).

Every image file is named by the SHA-512 of its content (`AGENTS.md` §10).
Steps 2 and 4 rename each file they produce with:

```sh
f=<file>; mv "$f" "public/img/$(shasum -a 512 "$f" | cut -d' ' -f1).${f##*.}"
```

Done when the entry exists and `href` names the route step 3 creates.

## 2. Add the plate artwork

Skip this step for a post with no artwork; it then renders nothing in that
position.

The plate is drawn at 250 CSS px wide, from a 500 px wide source. Pixel art
must land on whole device pixels: scale it by an integer with
nearest-neighbour sampling, then pad it with transparency to the 500 px
canvas. Resampling by a fraction blurs it.

```sh
magick src.gif -coalesce -filter point -scale 200% -background none \
  -gravity center -extent 500x500 -strip -loop 0 scaled.gif
gif2webp -m 6 -q 100 scaled.gif -o plate.webp
magick "scaled.gif[0]" -coalesce -strip plate.png
```

`gif2webp` is lossless by default. Browsers play a GIF frame whose delay
is 10 ms or less at 100 ms, while WebP plays the stored duration, so set
each such frame (`gifsicle --info scaled.gif` lists the delays; `0.00s`
or `0.01s` qualify) to 100 ms with
`webpmux -duration 100,<frame>,<frame> plate.webp -o plate.webp`, frames
counted from 1. Rename both files into `public/img/` with the command in
step 1. Declare a
`<SLUG>_PLATE: PlateAsset` in `lib/images/plates.ts` with the two
`/img/...` paths and `width: 500, height: 500`, set `artwork` to it in
`lib/blog/posts.ts`, and add `<camelSlug>: publicFile(<SLUG>_PLATE.staticSrc)`
to `ogArtFiles` in `lib/images/og-art.ts`.

Done when `webpmux -info` on the WebP prints `Loop Count : 0`, the static
PNG is the animation's first frame at the same size, and both are
declared.

## 3. Write the route

Create `app/blog/<slug>/` with:

- `page.tsx`: `PostArticle` with a `references` array and a `body` built
  from `Paragraph` (`components/blog/post-article.tsx`); `Cite`, `CiteGroup`
  for one claim with several sources, `Screenshot` for an in-body image, and
  the `Reference` type, all from `@openbunny/react`; and `CommandLine`
  (`components/command-line.tsx`, the lowercase wrapper) for a shell
  command. End the body with `<Paragraph>-f</Paragraph>`.
- `opengraph-image.tsx`: a copy of an existing post's, with the slug
  changed. It exports `dynamic = "force-static"`, `dynamicParams = false`,
  `generateImageMetadata` and the default image function, all keyed by the
  slug. No `twitter-image.tsx` exists; the same card serves both. Add the
  post's card to `ogCards` in `lib/images/og-cards.ts`, drawing the post's
  `ogArtFiles` entry, or `ogArtFiles.blog` for a post with no artwork. Its
  `alt` names the picture and quotes the title the card draws.

Every external claim the author marks for citation gets a `Reference` whose
`url` resolves. Check each with `curl -sL -o /dev/null -w '%{http_code}'`.
GitHub answers `404` for a private repository as well as a missing one;
either way readers get that `404`, so tell the author.

Done when every citation the author asked for points to a reference whose
URL returns `200`, or the author has been told which one does not.

## 4. Add in-body images

Put files in `public/img/`, never `public/blog/`, which collides with the
`/blog` route. Render them through `Screenshot`, never a
bare `<img>` or `next/image`: the CSP blocks inline style attributes
(`AGENTS.md` §5), and `Screenshot` carries the house frame and caption.

The site is a static export with `images.unoptimized: true`, so nothing
resizes or re-encodes an image after it is committed: the file in
`public/` is the file every reader downloads. The body column is at most
`65ch`, so a source wider than 1440 px adds bytes and no detail on a 2x
display. Encode each image as WebP, at most 1440 px wide, keeping the
source's aspect ratio, pass the encoded size as `width` and `height`, and
rename the result with the command in step 1:

```sh
cwebp -q 80 -m 6 -metadata none -resize 1440 0 src.png -o shot.webp
```

`-metadata none` drops EXIF location and device data. Confirm with
`exiftool <file>`; strip with `exiftool -all= <file>` if any remains.

Done when every image renders through `Screenshot` with lowercase `alt`
text that states what the picture shows, is WebP at most 1440 px wide
under its SHA-512 name, with `width` and `height` matching the file, and
carries no metadata.

## 5. Test

Copy `page.test.tsx` from an existing post and change what differs: title,
date, citation order, reference URLs, artwork paths. Add the card's picture
to `pictures` in `lib/images/og-cards.test.ts`. Citation numbers follow first appearance; a source cited twice reuses
its number and gets one back-link per citation.

Done when `bunx vitest run app/blog/<slug> lib/images tests/unit/image-names.test.ts`
passes.

## 6. Run the gate

Add every new word cspell rejects to `words` in `cspell.json`, kept in
case-insensitive order. Then run `just check`.

`just check` builds the site. Turbopack's CSS worker binds a local port, so
the build fails with `binding to a port: Operation not permitted` inside a
sandbox that forbids that, and the same failure has appeared during a
network outage. Neither is a defect in the post: report the build as not
run, with that error, rather than as failed.

Done when `just check` passes, or the build-backed step is reported as not
run with the error that stopped it.

## 7. Hand off the manifest

A new post fails `bun run manifest verify` at deploy, exit 2, until the
signed manifest lists it (`AGENTS.md` §7). Only the owner signs. Stop here
and give the owner these commands, run after the commit:

```sh
bun run build
bun run manifest generate
bun run manifest sign
```

`manifest generate` overwrites `public/posts.asc` with unsigned text before
`manifest sign` replaces it with the signed one, so commit `posts.asc` only
after signing. It also writes `public/posts/<slug>.txt` and the archived
revision under `public/posts/<slug>/`; commit those with the signed
manifest.

Done when the owner has the three commands and knows the deploy fails
until they run.
