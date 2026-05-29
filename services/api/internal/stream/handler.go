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
	return &StreamHandler{
		videoBasePath:   "/data/videos",
		torrentBasePath: "/data/torrents",
		transcodeURL:    "http://vpn:8081",
	}
}

func (s *StreamHandler) InitStream(w http.ResponseWriter, r *http.Request) {
	id := r.PathValue("id")

	// TODO check if the torrent stream ID has status finished, if yes exit with ok
	// if (check DB store for torrent.id.status == finished){
	// 	w.WriteHeader(http.StatusOK)
	// 	return
	// }

	// Init the download 
	respDownload, err := http.Post(s.transcodeURL + "/download/" + id, "application/json", nil)
	if err != nil || respDownload.StatusCode != http.StatusOK {
		http.Error(w, "failed to start stream", http.StatusInternalServerError)
		log.Printf("download service error for %s: %v", id, err)
		return
	}
	defer respDownload.Body.Close()
	
	// TODO add a timeout for torrent that are maybe just too long to init and exist with error

	// Init transcoding — delegate to the torrent-transcode service and wait for an OK;
	respTranscode, err := http.Post(s.transcodeURL + "/transcode/" + id, "application/json", nil)
	if err != nil || respTranscode.StatusCode != http.StatusOK {
		http.Error(w, "failed to start stream", http.StatusInternalServerError)
		log.Printf("transcode service error for %s: %v", id, err)
		return
	}
	defer respTranscode.Body.Close()

	// TODO add a timeout for torrent that are maybe just too long to init and exist with error

	// TODO add the torrent to the watch list of the user 

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
