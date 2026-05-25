package stream

import (
	"hypertube/torrent-stream/internal/transcode"
	"log"
	"net/http"
	"os"
)

type StreamHandler struct {
	videoBasePath   string
	torrentBasePath string
	convertHLS      func(inputPath, outputDir string) error
}

func NewStreamHandler() *StreamHandler {
	return &StreamHandler{
		videoBasePath:   "/data/videos",
		torrentBasePath: "/data/torrents",
		convertHLS:      transcode.ConvertHLS,
	}
}

func (s *StreamHandler) InitStream(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := s.videoBasePath + "/" + id

	// If the folder already exists the stream is ready — skip transcoding.
	if _, err := os.Stat(videoPath); err == nil {
		w.WriteHeader(http.StatusOK)
		return
	}

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

func (s *StreamHandler) GetIndex(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := s.videoBasePath + "/" + id
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	if bytes, err := os.ReadFile(videoPath + "/stream.m3u8"); err != nil {
		http.Error(w, "failed to read index file", http.StatusInternalServerError)
		return
	} else {
		w.WriteHeader(http.StatusOK)
		w.Write(bytes)
	}
}

func (s *StreamHandler) GetSegment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	prefix := s.videoBasePath + "/" + id
	segment := r.PathValue("segment")
	w.Header().Set("Content-Type", "video/mp2t")
	if bytes, err := os.ReadFile(prefix + "/" + segment); err != nil {
		http.Error(w, "failed to read segment file", http.StatusInternalServerError)
		return
	} else {
		w.WriteHeader(http.StatusOK)
		w.Write(bytes)
	}
}
