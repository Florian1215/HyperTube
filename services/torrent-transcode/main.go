package main

import (
	"hypertube/torrent-transcode/internal"
	"hypertube/torrent-transcode/internal/torrent"
	"log"
	"net/http"
	"os"
	"sync"
	"io"
)

func main() {
	mux := http.NewServeMux()
	streams := make(map[string]io.ReadSeekCloser)
	mu      := &sync.Mutex{}
	torrentClient, err := torrent.NewClient(mu, &streams)
	if err != nil {
		log.Fatal("failed to create torrent client:", err)
	}
	torrentTranscode := torrent_transcode.NewTorrentTranscodeHandler(torrentClient, mu, &streams)

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mux.HandleFunc("POST /download/{id}", torrentTranscode.InitDownload)   // start torrent and prepapre for trancoding and streaming
	mux.HandleFunc("POST /transcode/{id}", torrentTranscode.InitTranscode) // start transcoding for an already downloaded torrent

	addr := ":" + getEnv("PORT", "8081")
	log.Printf("torrent-stream listening on %s", addr)
	log.Fatal(http.ListenAndServe(addr, mux))
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
