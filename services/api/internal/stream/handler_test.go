package stream

import (
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"testing"
)

// newTestHandler returns a StreamHandler wired to a temp dir and a fake
// transcode server, so tests never touch /data or a real torrent-transcode.
func newTestHandler(t *testing.T, transcodeHandler http.HandlerFunc) (*StreamHandler, string) {
	t.Helper()
	srv := httptest.NewServer(transcodeHandler)
	t.Cleanup(srv.Close)
	dir := t.TempDir()
	return &StreamHandler{
		videoBasePath:   dir + "/videos",
		torrentBasePath: dir + "/torrents",
		transcodeURL:    srv.URL,
	}, dir
}

// initRequest builds a request that carries the given id as a path value,
// matching what the Go 1.22 ServeMux injects at runtime.
func initRequest(id string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/stream/"+id, nil)
	req.SetPathValue("id", id)
	return req
}

func indexRequest(id string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/stream/"+id+"/index", nil)
	req.SetPathValue("id", id)
	return req
}

func segmentRequest(id, segment string) *http.Request {
	req := httptest.NewRequest(http.MethodGet, "/stream/"+id+"/"+segment, nil)
	req.SetPathValue("id", id)
	req.SetPathValue("segment", segment)
	return req
}

// checkFFmpeg skips the test if ffmpeg / ffprobe are not installed.
func checkFFmpeg(t *testing.T) {
	t.Helper()
	for _, bin := range []string{"ffmpeg", "ffprobe"} {
		if _, err := exec.LookPath(bin); err != nil {
			t.Skipf("%s not found in PATH — skipping integration test", bin)
		}
	}
}

// ---------------------------------------------------------------------------
// Unit tests — InitStream
// ---------------------------------------------------------------------------

func TestInitStream_CallsTranscodeServiceWhenFolderMissing(t *testing.T) {
	var called bool
	h, _ := newTestHandler(t, func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusOK)
	})

	rr := httptest.NewRecorder()
	h.InitStream(rr, initRequest("abc123"))

	if !called {
		t.Error("expected transcode service to be called, but it was not")
	}
	if rr.Code != http.StatusOK {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusOK)
	}
}

// func TestInitStream_Returns200WhenFolderAlreadyExists(t *testing.T) {
// 	var called bool
// 	h, dir := newTestHandler(t, func(w http.ResponseWriter, r *http.Request) {
// 		called = true
// 		w.WriteHeader(http.StatusOK)
// 	})

// 	// Pre-create the folder, simulating a stream that was already initialised.
// 	if err := os.MkdirAll(dir+"/videos/abc123", 0755); err != nil {
// 		t.Fatalf("setup: could not create folder: %v", err)
// 	}

// 	rr := httptest.NewRecorder()
// 	h.InitStream(rr, initRequest("abc123"))

// 	if rr.Code != http.StatusOK {
// 		t.Errorf("status: got %d, want %d", rr.Code, http.StatusOK)
// 	}
// 	if called {
// 		t.Error("expected transcode service to be skipped when folder already exists")
// 	}
// }

// ---------------------------------------------------------------------------
// Integration test — full pipeline: InitStream → GetIndex → GetSegment
// ---------------------------------------------------------------------------

func TestIntegration_InitThenIndexThenSegment(t *testing.T) {
	checkFFmpeg(t)

	const id = "test"
	h := NewStreamHandler()

	// Skip gracefully when rubber.mp4 isn't mounted (e.g. outside Docker).
	if _, err := os.Stat(h.torrentBasePath + "/" + id + "/rubber.mp4"); err != nil {
		t.Skip("rubber.mp4 not found — run inside Docker where /data is mounted")
	}

	// InitStream
	rr := httptest.NewRecorder()
	h.InitStream(rr, initRequest(id))
	if rr.Code != http.StatusOK {
		t.Fatalf("InitStream: %d\n%s", rr.Code, rr.Body)
	}

	// GetIndex
	rr = httptest.NewRecorder()
	h.GetIndex(rr, indexRequest(id))
	if rr.Code != http.StatusOK {
		t.Fatalf("GetIndex: %d\n%s", rr.Code, rr.Body)
	}

	// GetSegment — ffmpeg always names the first segment stream0.ts
	rr = httptest.NewRecorder()
	h.GetSegment(rr, segmentRequest(id, "stream0.ts"))
	if rr.Code != http.StatusOK {
		t.Fatalf("GetSegment: %d\n%s", rr.Code, rr.Body)
	}
}
