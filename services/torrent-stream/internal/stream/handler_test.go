package stream

import (
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"testing"
)

// newTestHandler returns a StreamHandler wired to a temp dir so tests never
// touch /data/videos or /data/torrents.
func newTestHandler(t *testing.T, convertHLS func(string, string) error) (*StreamHandler, string) {
	t.Helper()
	dir := t.TempDir() // cleaned up automatically after the test
	return &StreamHandler{
		videoBasePath:   dir + "/videos",
		torrentBasePath: dir + "/torrents",
		convertHLS:      convertHLS,
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

func TestInitStream_CreatesFolderWhenMissing(t *testing.T) {
	var convertCalled bool
	h, dir := newTestHandler(t, func(_, _ string) error {
		convertCalled = true
		return nil
	})

	rr := httptest.NewRecorder()
	h.InitStream(rr, initRequest("abc123"))

	// Folder must have been created.
	expectedPath := dir + "/videos/abc123"
	if _, err := os.Stat(expectedPath); os.IsNotExist(err) {
		t.Errorf("expected folder %s to be created", expectedPath)
	}

	// ConvertHLS must have been called to build the HLS stream.
	if !convertCalled {
		t.Error("expected convertHLS to be called, but it was not")
	}

	if rr.Code != http.StatusOK {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusOK)
	}
}

func TestInitStream_Returns200WhenFolderAlreadyExists(t *testing.T) {
	var convertCalled bool
	h, dir := newTestHandler(t, func(_, _ string) error {
		convertCalled = true
		return nil
	})

	// Pre-create the folder, simulating a stream that was already initialised.
	existingPath := dir + "/videos/abc123"
	if err := os.MkdirAll(existingPath, 0755); err != nil {
		t.Fatalf("setup: could not create folder: %v", err)
	}

	rr := httptest.NewRecorder()
	h.InitStream(rr, initRequest("abc123"))

	if rr.Code != http.StatusOK {
		t.Errorf("status: got %d, want %d", rr.Code, http.StatusOK)
	}

	// ConvertHLS must NOT be called — the stream is already ready.
	if convertCalled {
		t.Error("expected convertHLS to be skipped when folder already exists")
	}
}

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
