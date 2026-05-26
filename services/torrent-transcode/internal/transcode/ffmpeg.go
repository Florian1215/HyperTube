package transcode

import (
	"bytes"
	"encoding/json"
	"fmt"
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

// Return details about the streams in the file
func probeStreams(inputPath string) ([]ffprobeStream, error) {
	var stdout bytes.Buffer
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_streams",
		inputPath,
	)
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

// Decide whether to re-encode or remux (copy) for video and audio
func selectCodecs(streams []ffprobeStream) (video, audio string) {
	video, audio = "libx264", "aac"
	for _, s := range streams {
		if s.CodecType == "video" && s.CodecName == "h264" {
			video = "copy"
		}
		if s.CodecType == "audio" && s.CodecName == "aac" {
			audio = "copy"
		}
	}
	return
}

// buildFFmpegArgs assembles the args for a single video+audio HLS output
func buildFFmpegArgs(inputPath, outputDir, videoCodec, audioCodec string) []string {
	return []string{
		"-i", inputPath,
		"-map", "0:v:0",
		"-map", "0:a:0",
		"-c:v", videoCodec,
		"-c:a", audioCodec,
		"-avoid_negative_ts", "make_zero",
		"-hls_time", "5",
		"-hls_list_size", "0",
		"-hls_flags", "append_list",
		"-f", "hls",
		outputDir + "/stream.m3u8",
	}
}

// Execute ffmpeg with the given args
func runFFmpeg(args []string) error {
	var stderr bytes.Buffer
	cmd := exec.Command("ffmpeg", args...)
	log.Printf("ffmpeg args: %v", args)
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return fmt.Errorf("ffmpeg: %v\n%s", err, stderr.String())
	}
	return nil
}

// ConvertHLS converts or remuxes inputPath into an HLS stream at outputDir/stream.m3u8
func ConvertHLS(inputPath string, outputDir string) error {
	streams, err := probeStreams(inputPath)
	if err != nil {
		return err
	}
	videoCodec, audioCodec := selectCodecs(streams)
	return runFFmpeg(buildFFmpegArgs(inputPath, outputDir, videoCodec, audioCodec))
}
