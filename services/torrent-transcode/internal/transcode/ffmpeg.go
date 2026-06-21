package transcode

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"os/exec"
)

type ffprobeStream struct {
	Index     int    `json:"index"`
	CodecType string `json:"codec_type"`
	CodecName string `json:"codec_name"`
}

type ffprobeOutput struct {
	Streams []ffprobeStream `json:"streams"`
}

func probeStreamsFromReader(r io.Reader) ([]ffprobeStream, error) {
	var stdout bytes.Buffer
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_streams",
		"pipe:0",
	)
	cmd.Stdin = r
	cmd.Stdout = &stdout
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffprobe: %v", err)
	}
	var out ffprobeOutput
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		return nil, fmt.Errorf("ffprobe parse: %v", err)
	}
	return out.Streams, nil
}

func videoCodecName(streams []ffprobeStream) string {
	for _, s := range streams {
		if s.CodecType == "video" {
			return s.CodecName
		}
	}
	return ""
}

// buildH264Args repackages an h264 source into HLS 
func buildH264Args(input, outputDir string) []string {
	return []string{
		"-i", input,
		"-map", "0:v:0",
		"-map", "0:a:0",
		"-c:v", "copy",
		"-c:a", "copy",
		"-bsf:v", "h264_mp4toannexb",
		"-avoid_negative_ts", "make_zero",
		"-hls_time", "5",
		"-hls_list_size", "0",
		"-hls_flags", "append_list",
		"-f", "hls",
		outputDir + "/stream.m3u8",
	}
}

// buildHEVCArgs repackages an hevc source into HLS
func buildHEVCArgs(input, outputDir string) []string {
	return []string{
		"-i", input,
		"-map", "0:v:0",
		"-map", "0:a:0",
		"-c:v", "copy",
		"-c:a", "copy",
		"-bsf:v", "hevc_mp4toannexb",
		"-avoid_negative_ts", "make_zero",
		"-hls_time", "5",
		"-hls_list_size", "0",
		"-hls_flags", "append_list",
		"-f", "hls",
		outputDir + "/stream.m3u8",
	}
}

// buildAV1Args repackages an av1 source into HLS 
func buildAV1Args(input, outputDir string) []string {
	return []string{
		"-i", input,
		"-map", "0:v:0",
		"-map", "0:a:0",
		"-c:v", "copy",
		"-c:a", "copy",
		"-avoid_negative_ts", "make_zero",
		"-hls_segment_type", "fmp4",
		"-hls_fmp4_init_filename", "init.mp4",
		"-hls_time", "5",
		"-hls_list_size", "0",
		"-hls_flags", "append_list",
		"-f", "hls",
		outputDir + "/stream.m3u8",
	}
}

// ConvertPipeHLS probes the first 10 MB of reader to detect the video codec,
// seeks back to the start, then streams the full content into ffmpeg via stdin.
func ConvertPipeHLS(reader io.ReadSeeker, outputDir string) error {
	videoCodec := ""
	if streams, err := probeStreamsFromReader(io.LimitReader(reader, 10*1024*1024)); err != nil {
		log.Printf("probe video codec failed: %v", err)
	} else {
		videoCodec = videoCodecName(streams)
		log.Printf("source video codec: %s", videoCodec)
	}
	if _, err := reader.Seek(0, io.SeekStart); err != nil {
		return fmt.Errorf("seek: %w", err)
	}

	var args []string
	switch videoCodec {
	case "h264":
		args = buildH264Args("pipe:0", outputDir)
	case "hevc":
		args = buildHEVCArgs("pipe:0", outputDir)
	case "av1":
		args = buildAV1Args("pipe:0", outputDir)
	default:
		return fmt.Errorf("unsupported video codec: %q", videoCodec)
	}

	var stderr bytes.Buffer
	cmd := exec.Command("ffmpeg", args...)
	cmd.Stdin = reader
	cmd.Stderr = &stderr
	log.Printf("ffmpeg args: %v", args)
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg: %v\n%s", err, stderr.String())
	}
	return nil
}
