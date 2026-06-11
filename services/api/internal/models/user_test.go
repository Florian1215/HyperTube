package models

import "testing"

func TestIsValidUserColor(t *testing.T) {
	for _, color := range AllowedUserColors {
		if !IsValidUserColor(color) {
			t.Fatalf("expected %q to be valid", color)
		}
	}

	invalidColors := []string{
		"",
		"   ",
		"orange",
		"#747AF5",
		"var(--color-purple)",
		"purple-hover",
		"Purple",
	}
	for _, color := range invalidColors {
		if IsValidUserColor(color) {
			t.Fatalf("expected %q to be invalid", color)
		}
	}
}

func TestRandomUserColorAlwaysReturnsAllowedColor(t *testing.T) {
	for i := 0; i < 100; i++ {
		color := RandomUserColor()
		if !IsValidUserColor(color) {
			t.Fatalf("random color %q is not allowed", color)
		}
	}
}
