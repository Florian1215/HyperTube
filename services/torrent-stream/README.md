Torrent-stream service documentation

Base path: *(no prefix — routes are mounted at root)*

Default port: `8081`

---

## GET /health

Health check.

### Response

`200 OK` — no body.

---

## GET /stream/{id}

Starts the HLS transcoding pipeline for a movie. If the stream was already initialised (folder exists), returns `200` immediately without re-transcoding.

### Path parameters

| Parameter | Type   | Description                    |
|-----------|--------|--------------------------------|
| `id`      | string | IMDb ID of the movie to stream |

### How it works

1. Checks whether `/data/videos/{id}/` already exists — if so, returns `200` immediately.
2. Creates `/data/videos/{id}/`.
3. Reads the source file at `/data/torrents/{id}/rubber.mp4`.
4. Runs `ffmpeg` to segment it into 5-second HLS chunks, writing `stream.m3u8` and `stream0.ts`, `stream1.ts` … into the video folder.
5. Returns `200` when done.

### Response

`200 OK` — no body.

### Error responses

```
500 Internal Server Error — "failed to create stream directory"
500 Internal Server Error — "failed to start stream"
```

---

## GET /stream/{id}/index

Returns the HLS playlist (`stream.m3u8`) for the given stream.

An HLS-capable player fetches this file first, then requests each segment listed inside it.

### Path parameters

| Parameter | Type   | Description                  |
|-----------|--------|------------------------------|
| `id`      | string | IMDb ID of the active stream |

### Response

`200 OK`

```
Content-Type: application/vnd.apple.mpegurl
```

Body is the raw `.m3u8` playlist:

```
#EXTM3U
#EXT-X-VERSION:3
#EXT-X-TARGETDURATION:5
#EXTINF:5.000000,
stream0.ts
#EXTINF:5.000000,
stream1.ts
...
#EXT-X-ENDLIST
```

### Error responses

```
500 Internal Server Error — "failed to read index file"
```

---

## GET /stream/{id}/{segment}

Serves a single HLS transport-stream segment (`.ts` file).

The player fetches these URLs automatically from the playlist returned by `GET /stream/{id}/index`. Clients do not need to construct segment URLs manually.

### Path parameters

| Parameter | Type   | Description                              |
|-----------|--------|------------------------------------------|
| `id`      | string | IMDb ID of the active stream             |
| `segment` | string | Segment filename, e.g. `stream0.ts`      |

### Response

`200 OK`

```
Content-Type: video/mp2t
```

Body is the raw binary `.ts` segment.

### Error responses

```
500 Internal Server Error — "failed to read segment file"
```
