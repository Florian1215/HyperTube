package i18n

import "testing"

func TestFromHeaderMatchesSupportedLanguages(t *testing.T) {
	tests := []struct {
		header string
		want   Locale
	}{
		{header: "en", want: English},
		{header: "en-US,en;q=0.9", want: English},
		{header: "fr", want: French},
		{header: "de-DE,de;q=0.9,en;q=0.8", want: German},
		{header: "fr-CA,fr;q=0.9,en;q=0.8", want: French},
		{header: "es", want: English},
		{header: "not a language", want: English},
		{header: "", want: English},
	}

	for _, tt := range tests {
		if got := FromHeader(tt.header); got != tt.want {
			t.Fatalf("FromHeader(%q) = %q, want %q", tt.header, got, tt.want)
		}
	}
}

func TestTranslateMessages(t *testing.T) {
	if got := T(French, MsgValidEmailRequired); got != "Email invalide" {
		t.Fatalf("unexpected French message: %q", got)
	}
	if got := T(German, MsgInvalidCredentials); got != "E-Mail, Benutzername oder Passwort ist ungültig" {
		t.Fatalf("unexpected German message: %q", got)
	}
	if got := T(English, MsgOAuthProviderNotConfigured, "GitHub"); got != "OAuth provider GitHub is not configured" {
		t.Fatalf("unexpected English message: %q", got)
	}
	if got := T(French, MsgFailedCreateUser); got != "Échec de la création de l'utilisateur" {
		t.Fatalf("unexpected capitalized French message: %q", got)
	}
}
