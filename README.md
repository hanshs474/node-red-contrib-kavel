# node-red-contrib-kavel

Kavel is a free AI video generator and AI image generator — 4K clips with sound, and images you can run without an account or a card. This Node-RED node brings its image side into your flows: send a prompt, get back a link to the finished image, or pass an image URL and an instruction to edit it.

No API key is needed to start. Without one the node uses [Kavel](https://www.kavel.ai/?utm_source=nodered&utm_medium=readme)'s free tier (a small daily allowance, watermarked images). Add a key from [kavel.ai/settings/apikeys](https://www.kavel.ai/settings/apikeys) to run on your account's credits.

## Install

From the palette manager search for `node-red-contrib-kavel`, or:

```
cd ~/.node-red
npm install node-red-contrib-kavel
```

## Use

| Input | What it does |
|---|---|
| `msg.payload` (string) | The prompt |
| `msg.image` (URL, optional) | Edit this image instead of generating a new one |
| `msg.aspectRatio` (optional) | `1:1`, `16:9`, `9:16`, `4:3` or `3:4` |

Output: `msg.payload` is the image URL, `msg.kavel` is `{ url, watermarked }`.

Import `examples/generate-image.json` for a ready-made inject → kavel image → debug flow.

## Want to see what the edit model does?

The same model powers Kavel's photo tools on the web, for example adding someone to a photo they missed: [add person to photo](https://www.kavel.ai/image/add-person-to-photo?utm_source=nodered&utm_medium=readme).

## License

MIT
