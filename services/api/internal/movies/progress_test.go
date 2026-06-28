package movies

import "testing"

func TestWatchProgressPercentage(t *testing.T) {
	tests := []struct {
		name            string
		progressSeconds int
		runtimeMinutes  int
		complete        bool
		want            float64
	}{
		{
			name:            "zero progress returns zero",
			progressSeconds: 0,
			runtimeMinutes:  60,
			want:            0,
		},
		{
			name:            "negative progress returns zero",
			progressSeconds: -1,
			runtimeMinutes:  60,
			want:            0,
		},
		{
			name:            "zero runtime returns zero",
			progressSeconds: 100,
			runtimeMinutes:  0,
			want:            0,
		},
		{
			name:            "half watched",
			progressSeconds: 1800,
			runtimeMinutes:  60,
			want:            50,
		},
		{
			name:            "over duration clamps to one hundred",
			progressSeconds: 999999,
			runtimeMinutes:  60,
			want:            100,
		},
		{
			name:            "complete returns one hundred",
			progressSeconds: 1000,
			runtimeMinutes:  120,
			complete:        true,
			want:            100,
		},
		{
			name:            "fractional percentage rounds to two decimals",
			progressSeconds: 20,
			runtimeMinutes:  1,
			want:            33.33,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := watchProgressPercentage(tt.progressSeconds, tt.runtimeMinutes, tt.complete)
			if got != tt.want {
				t.Fatalf("expected %v, got %v", tt.want, got)
			}
		})
	}
}
