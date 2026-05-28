package stream

import (
	"log"
	"net/http"
	"os"
)

type StreamHandler struct {
	videoBasePath   string
	torrentBasePath string
	transcodeURL    string
}

func NewStreamHandler() *StreamHandler {
	transcodeURL := os.Getenv("TRANSCODE_SERVICE_URL")
	if transcodeURL == "" {
		transcodeURL = "http://torrent-transcode:8081"
	}
	videoBasePath := os.Getenv("VIDEO_BASE_PATH")
	if videoBasePath == "" {
		videoBasePath = "/data/videos"
	}
	return &StreamHandler{
		videoBasePath:   videoBasePath,
		torrentBasePath: "/data/torrents",
		transcodeURL:    transcodeURL,
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

	// Init download
	// TODO: start torrent download and wait until enough data is buffered.

	// Init transcoding — delegate to the torrent-transcode service.
	resp, err := http.Post(s.transcodeURL+"/transcode/"+id, "application/json", nil)
	if err != nil || resp.StatusCode != http.StatusOK {
		http.Error(w, "failed to start stream", http.StatusInternalServerError)
		log.Printf("transcode service error for %s: %v", id, err)
		return
	}
	defer resp.Body.Close()

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
}

func (s *StreamHandler) GetIndex(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := s.videoBasePath + "/" + id
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	if bytes, err := os.ReadFile(videoPath + "/stream.m3u8"); err != nil {
		http.Error(w, "failed to read index file", http.StatusInternalServerError)
		log.Printf("failed to read index for %s: %v", id, err)
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
