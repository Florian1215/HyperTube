package main

import (
	"hypertube/torrent-transcode/internal/torrent_transcode"
	"log"
	"net/http"
	"os"
)

func main() {
	mux := http.NewServeMux()

	torrentTranscode := torrent_transcode.NewTorrentTranscodeHandler()

	mux.HandleFunc("GET /health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	})

	mux.HandleFunc("POST /download/{id}", torrentTranscode.InitDownload)    // start torrent and prepapre for trancoding and streaming
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
