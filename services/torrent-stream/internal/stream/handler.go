package stream

import (
	"hypertube/torrent-stream/internal/transcode"
	"log"
	"net/http"
	"os"
)

type StreamHandler struct{}

func NewStreamHandler() *StreamHandler {
	return &StreamHandler{}
}

func (s *StreamHandler) InitStream(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := "/data/videos/" + id
	torrentPath := "/data/torrents/" + id + "/rubber.mp4"
	os.MkdirAll(videoPath, 0755) //TODO only do if folder doesnt exist, and watchout for folder existing but not with a complete stream.
	err := transcode.ConvertHLS(torrentPath, videoPath)
	if err != nil {
		http.Error(w, "failed to start stream", http.StatusInternalServerError)
		log.Printf("failed to start stream: %v", err)
		return
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(200)
}

func (s *StreamHandler) GetIndex(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	videoPath := "/data/videos/" + id
	w.Header().Set("Content-Type", "application/vnd.apple.mpegurl")
	if bytes, err := os.ReadFile(videoPath + "/index.m3u8"); err != nil {
		http.Error(w, "failed to read index file", http.StatusInternalServerError)
		return
	} else {
		w.WriteHeader(200)
		w.Write(bytes)
	}
}

func (s *StreamHandler) GetSegment(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")
	prefix := "/data/videos/" + id
	segment := r.PathValue("segment")
	w.Header().Set("Content-Type", "video/mp2t")
	if bytes, err := os.ReadFile(prefix + segment); err != nil {
		http.Error(w, "failed to read segment file", http.StatusInternalServerError)
		return
	} else {
		w.WriteHeader(200)
		w.Write(bytes)
	}
}
