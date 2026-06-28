package movies

import "math"

func watchProgressPercentage(progressSeconds int, runtimeMinutes int, complete bool) float64 {
	if complete {
		return 100
	}
	if progressSeconds <= 0 || runtimeMinutes <= 0 {
		return 0
	}

	durationSeconds := float64(runtimeMinutes) * 60
	percentage := float64(progressSeconds) / durationSeconds * 100
	percentage = math.Max(0, math.Min(100, percentage))
	return math.Round(percentage*100) / 100
}
