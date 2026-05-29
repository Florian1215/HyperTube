package i18n

import "testing"

func TestFromHeaderMatchesSupportedLanguages(t *testing.T) {
	tests := []struct {
		header string
		want   Locale
	}{
		{header: "fr", want: French},
		{header: "de-DE,de;q=0.9,en;q=0.8", want: German},
		{header: "fr-CA,fr;q=0.9,en;q=0.8", want: French},
		{header: "es", want: English},
		{header: "", want: English},
	}

	for _, tt := range tests {
		if got := FromHeader(tt.header); got != tt.want {
			t.Fatalf("FromHeader(%q) = %q, want %q", tt.header, got, tt.want)
		}
	}
}

func TestTranslateMessages(t *testing.T) {
	if got := T(French, MsgValidEmailRequired); got != "adresse email invalide" {
		t.Fatalf("unexpected French message: %q", got)
	}
	if got := T(German, MsgInvalidCredentials); got != "Benutzername/E-Mail oder Passwort ist ungültig" {
		t.Fatalf("unexpected German message: %q", got)
	}
	if got := T(English, MsgOAuthProviderNotConfigured, "GitHub"); got != "GitHub OAuth is not configured" {
		t.Fatalf("unexpected English message: %q", got)
	}
}

func TestTMDBLanguage(t *testing.T) {
	if got := TMDBLanguage(French); got != "fr-FR" {
		t.Fatalf("TMDBLanguage(French) = %q", got)
	}
	if got := TMDBLanguage(German); got != "de-DE" {
		t.Fatalf("TMDBLanguage(German) = %q", got)
	}
	if got := TMDBLanguage(English); got != "en-US" {
		t.Fatalf("TMDBLanguage(English) = %q", got)
	}
}
