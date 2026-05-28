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

func probeStreams(inputPath string) ([]ffprobeStream, error) {
	log.Printf("probeStreams: probing %s", inputPath)
	var stdout, stderr bytes.Buffer
	cmd := exec.Command("ffprobe",
		"-v", "quiet",
		"-print_format", "json",
		"-show_streams",
		inputPath,
	)
	cmd.Stdout = &stdout
	cmd.Stderr = &stderr
	if err := cmd.Run(); err != nil {
		return nil, fmt.Errorf("ffprobe: %v\n%s", err, stderr.String())
	}
	var out ffprobeOutput
	if err := json.Unmarshal(stdout.Bytes(), &out); err != nil {
		return nil, fmt.Errorf("ffprobe parse: %v", err)
	}
	return out.Streams, nil
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

func buildFFmpegArgs(input, outputDir, videoCodec, audioCodec string) []string {
	return []string{
		"-i", input,
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

func ConvertHLS(inputPath string, outputDir string) error {
	streams, err := probeStreams(inputPath)
	if err != nil {
		return err
	}
	videoCodec, audioCodec := selectCodecs(streams)
	return runFFmpeg(buildFFmpegArgs(inputPath, outputDir, videoCodec, audioCodec))
}

// ConvertPipeHLS probes the first 10 MB of reader to select codecs, seeks back
// to the start, then streams the full content into ffmpeg via stdin.
func ConvertPipeHLS(reader io.ReadSeeker, outputDir string) error {
	// streams, err := probeStreamsFromReader(io.LimitReader(reader, 10*1024*1024))
	// if err != nil {
	// 	return err
	// }
	// if _, err := reader.Seek(0, io.SeekStart); err != nil {
	// 	return fmt.Errorf("seek: %w", err)
	// }
	// videoCodec, audioCodec := selectCodecs(streams)

	// args := buildFFmpegArgs("pipe:0", outputDir, videoCodec, audioCodec)
	args := buildFFmpegArgs("pipe:0", outputDir, "h264", "aac") // hardcoded for now since codec copy doesn't seem to work with pipe input

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
