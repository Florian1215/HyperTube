package torrent_transcode

import (
	"hypertube/torrent-transcode/internal/transcode"
	"log"
	"net/http"
	"os"
)

type TorrentTranscodeHandler struct {
	videoBasePath   string
	torrentBasePath string
	convertHLS      func(inputPath, outputDir string) error
}

func NewTorrentTranscodeHandler() *TorrentTranscodeHandler {
	return &TorrentTranscodeHandler{
		videoBasePath:   "/data/videos",
		torrentBasePath: "/data/torrents",
		convertHLS:      transcode.ConvertHLS,
	}
}

func (s *TorrentTranscodeHandler) InitDownload(w http.ResponseWriter, r *http.Request) {

}

func (s *TorrentTranscodeHandler) InitTranscode(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := s.videoBasePath + "/" + id

	// TODO: start torrent download and wait until enough data is buffered.
	torrentPath := s.torrentBasePath + "/" + id + "/rubber.mp4" // hardcoded for now

	if err := os.MkdirAll(videoPath, 0755); err != nil {
		http.Error(w, "failed to create stream directory", http.StatusInternalServerError)
		log.Printf("failed to create stream directory: %v", err)
		return
	}

	// TODO in the future convert it will be replaced by a goroutine that will progressively convert
	if err := s.convertHLS(torrentPath, videoPath); err != nil {
		http.Error(w, "failed to start stream", http.StatusInternalServerError)
		log.Printf("failed to start stream: %v", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}
