package transcode

// import (
// 	"os"
// 	"slices"
// 	"strings"
// 	"testing"
// )

// // Set to false to inspect output files after a run.
// const CLEANUP_OUTPUT = true

// func cleanupOutput(t *testing.T, path string) {
// 	t.Helper()
// 	t.Cleanup(func() {
// 		if CLEANUP_OUTPUT {
// 			os.RemoveAll(path)
// 		}
// 	})
// }

// // makeStream builds an ffprobeStream for use in unit tests.
// func makeStream(codecType, codecName string) ffprobeStream {
// 	return ffprobeStream{CodecType: codecType, CodecName: codecName}
// }

// // ---------------------------------------------------------------------------
// // selectCodecs
// // ---------------------------------------------------------------------------

// func TestSelectCodecs(t *testing.T) {
// 	cases := []struct {
// 		name      string
// 		streams   []ffprobeStream
// 		wantVideo string
// 		wantAudio string
// 	}{
// 		{
// 			name:      "h264+aac: both copy",
// 			streams:   []ffprobeStream{makeStream("video", "h264"), makeStream("audio", "aac")},
// 			wantVideo: "copy", wantAudio: "copy",
// 		},
// 		{
// 			name:      "h265+aac: video transcode",
// 			streams:   []ffprobeStream{makeStream("video", "hevc"), makeStream("audio", "aac")},
// 			wantVideo: "libx264", wantAudio: "copy",
// 		},
// 		{
// 			name:      "h264+ac3: audio transcode",
// 			streams:   []ffprobeStream{makeStream("video", "h264"), makeStream("audio", "ac3")},
// 			wantVideo: "copy", wantAudio: "aac",
// 		},
// 		{
// 			name:      "h265+ac3: both transcode",
// 			streams:   []ffprobeStream{makeStream("video", "hevc"), makeStream("audio", "ac3")},
// 			wantVideo: "libx264", wantAudio: "aac",
// 		},
// 	}

// 	for _, tc := range cases {
// 		t.Run(tc.name, func(t *testing.T) {
// 			video, audio := selectCodecs(tc.streams)
// 			if video != tc.wantVideo {
// 				t.Errorf("video: got %q, want %q", video, tc.wantVideo)
// 			}
// 			if audio != tc.wantAudio {
// 				t.Errorf("audio: got %q, want %q", audio, tc.wantAudio)
// 			}
// 		})
// 	}
// }

// // ---------------------------------------------------------------------------
// // buildFFmpegArgs
// // ---------------------------------------------------------------------------

// func TestBuildFFmpegArgs(t *testing.T) {
// 	args := buildFFmpegArgs("in.mkv", "/out", "copy", "aac")

// 	mustContainSequence(t, args, "-map", "0:v:0")
// 	mustContainSequence(t, args, "-map", "0:a:0")
// 	mustContainSequence(t, args, "-c:v", "copy")
// 	mustContainSequence(t, args, "-c:a", "aac")
// 	mustContainSequence(t, args, "-f", "hls")
// 	mustEndWith(t, args, "/out/stream.m3u8")

// 	if slices.Contains(args, "-c:s") {
// 		t.Error("subtitle codec must not appear in video-only args")
// 	}
// }

// // ---------------------------------------------------------------------------
// // Integration tests — full ffmpeg pipeline
// // ---------------------------------------------------------------------------

// func TestConvertHLS(t *testing.T) {
// 	cases := []struct {
// 		name    string
// 		fixture string
// 	}{
// 		{
// 			name:    "h264+aac: all copy",
// 			fixture: "1920_multi_sub_h264.mkv",
// 		},
// 		{
// 			name:    "h265+aac: video transcode",
// 			fixture: "1920_multi_sub_h265.mkv",
// 		},
// 		{
// 			name:    "h264+ac3: audio transcode",
// 			fixture: "1920_multi_sub_h264_ac3.mkv",
// 		},
// 		{
// 			name:    "h264+aac: no subtitles",
// 			fixture: "1920_nosub_h264.mkv",
// 		},
// 	}

// 	cleanupOutput(t, "./test/output/")

// 	for _, tc := range cases {
// 		t.Run(tc.name, func(t *testing.T) {
// 			t.Parallel()
// 			safeName := strings.NewReplacer(":", "-", " ", "_").Replace(tc.name)
// 			out := "./test/output/" + safeName
// 			if err := os.MkdirAll(out, 0755); err != nil {
// 				t.Fatalf("failed to create output dir: %v", err)
// 			}

// 			if err := ConvertHLS("./test/"+tc.fixture, out); err != nil {
// 				t.Fatalf("ConvertHLS failed: %v", err)
// 			}
// 			mustExist(t, out+"/stream.m3u8")
// 		})
// 	}
// }

// // ---------------------------------------------------------------------------
// // Helpers
// // ---------------------------------------------------------------------------

// func mustContainSequence(t *testing.T, haystack []string, a, b string) {
// 	t.Helper()
// 	for i := 0; i < len(haystack)-1; i++ {
// 		if haystack[i] == a && haystack[i+1] == b {
// 			return
// 		}
// 	}
// 	t.Errorf("expected %q %q in args %v", a, b, haystack)
// }

// func mustEndWith(t *testing.T, args []string, want string) {
// 	t.Helper()
// 	if len(args) == 0 || args[len(args)-1] != want {
// 		t.Errorf("expected last arg %q, got %q", want, args[len(args)-1])
// 	}
// }

// func mustExist(t *testing.T, path string) {
// 	t.Helper()
// 	if _, err := os.Stat(path); err != nil {
// 		t.Errorf("expected file to exist: %s", path)
// 	}
// }
