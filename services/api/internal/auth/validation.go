package auth

import (
	"regexp"
	"strings"
	"unicode"

	"hypertube/api/internal/i18n"
)

const (
	minPasswordBytes  = 8
	maxPasswordBytes  = 72
	minUsernameLength = 3
	maxUsernameLength = 32
	maxNameLength     = 100
)

var usernameCharsPattern = regexp.MustCompile(`^[A-Za-z0-9_]+$`)
var emailPrefixPattern = regexp.MustCompile(`^[A-Za-z0-9._+\-]+$`)
var emailDomainPattern = regexp.MustCompile(`^[A-Za-z0-9.\-]+$`)

type validationErrors map[string]i18n.Message

func validateRegisterRequest(req registerRequest) (CreateUserParams, validationErrors, bool) {
	fields := validationErrors{}

	email, validationMessage, ok := validateEmail(req.Email)
	if !ok {
		fields["email"] = validationMessage
	}

	username, validationMessage, ok := validateUsername(req.Username)
	if !ok {
		fields["username"] = validationMessage
	}

	firstName := strings.TrimSpace(req.FirstName)
	if firstName == "" {
		firstName = strings.TrimSpace(req.FrontendFirstName)
	}
	if firstName == "" {
		fields["first_name"] = i18n.MsgFirstNameRequired
	} else if len(firstName) > maxNameLength {
		fields["first_name"] = i18n.MsgFirstNameTooLong
	} else if !validPersonName(firstName) {
		fields["first_name"] = i18n.MsgFirstNameInvalid
	}

	lastName := strings.TrimSpace(req.LastName)
	if lastName == "" {
		lastName = strings.TrimSpace(req.FrontendLastName)
	}
	if lastName == "" {
		fields["last_name"] = i18n.MsgLastNameRequired
	} else if len(lastName) > maxNameLength {
		fields["last_name"] = i18n.MsgLastNameTooLong
	} else if !validPersonName(lastName) {
		fields["last_name"] = i18n.MsgLastNameInvalid
	}

	if validationMessage, ok := validatePassword(req.Password); !ok {
		fields["password"] = validationMessage
	}

	if len(fields) > 0 {
		return CreateUserParams{}, fields, false
	}

	return CreateUserParams{
		Email:     email,
		Username:  username,
		FirstName: firstName,
		LastName:  lastName,
	}, nil, true
}

func validateLoginRequest(req loginRequest) (string, validationErrors, bool) {
	fields := validationErrors{}

	login := strings.TrimSpace(req.Login)
	if login == "" {
		fields["login"] = i18n.MsgLoginRequired
	} else {
		identifier, validationMessage, ok := validateLoginIdentifier(login)
		if ok {
			login = identifier
		} else {
			fields["login"] = validationMessage
		}
	}
	if req.Password == "" {
		fields["password"] = i18n.MsgPasswordRequired
	} else if len(req.Password) > maxPasswordBytes {
		fields["password"] = i18n.MsgPasswordTooLong
	}

	if len(fields) > 0 {
		return "", fields, false
	}
	return login, nil, true
}

func validateLoginIdentifier(raw string) (string, i18n.Message, bool) {
	if email, ok := normalizeEmail(raw); ok {
		return email, "", true
	}

	username, validationMessage, ok := validateUsername(raw)
	if ok {
		return username, "", true
	}
	if strings.Contains(raw, "@") {
		return "", i18n.MsgValidEmailRequired, false
	}
	if validationMessage == i18n.MsgUsernameTooShort || validationMessage == i18n.MsgUsernameTooLong {
		return "", validationMessage, false
	}
	return "", i18n.MsgLoginInvalid, false
}

func validateEmail(raw string) (string, i18n.Message, bool) {
	email := strings.TrimSpace(raw)
	if email == "" {
		return "", i18n.MsgEmailRequired, false
	}

	normalizedEmail, ok := normalizeEmail(email)
	if !ok {
		return "", i18n.MsgValidEmailRequired, false
	}
	return normalizedEmail, "", true
}

func validateUsername(raw string) (string, i18n.Message, bool) {
	username := strings.TrimSpace(raw)
	if username == "" {
		return "", i18n.MsgUsernameRequired, false
	}
	if len(username) < minUsernameLength {
		return "", i18n.MsgUsernameTooShort, false
	}
	if len(username) > maxUsernameLength {
		return "", i18n.MsgUsernameTooLong, false
	}
	if !usernameCharsPattern.MatchString(username) {
		return "", i18n.MsgUsernameInvalidChars, false
	}
	return username, "", true
}

func validatePassword(password string) (i18n.Message, bool) {
	if len(password) < minPasswordBytes {
		return i18n.MsgPasswordTooShort, false
	}
	if len(password) > maxPasswordBytes {
		return i18n.MsgPasswordTooLong, false
	}
	return "", true
}

func normalizeEmail(raw string) (string, bool) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if email == "" {
		return "", false
	}

	if !validEmail(email) {
		return "", false
	}

	return email, true
}

func validEmail(email string) bool {
	if strings.Count(email, "@") != 1 {
		return false
	}

	parts := strings.Split(email, "@")
	prefix, domain := parts[0], parts[1]
	if len(prefix) == 0 || len(prefix) > 64 {
		return false
	}
	if strings.HasPrefix(prefix, ".") || strings.HasSuffix(prefix, ".") || strings.Contains(prefix, "..") {
		return false
	}
	if !emailPrefixPattern.MatchString(prefix) {
		return false
	}

	if len(domain) == 0 || len(domain) > 253 {
		return false
	}
	if !emailDomainPattern.MatchString(domain) || !strings.Contains(domain, ".") {
		return false
	}

	labels := strings.Split(domain, ".")
	for _, label := range labels {
		if label == "" || strings.HasPrefix(label, "-") || strings.HasSuffix(label, "-") {
			return false
		}
	}

	tld := labels[len(labels)-1]
	if len(tld) < 2 || len(tld) > 63 {
		return false
	}
	for _, r := range tld {
		if !unicode.IsLetter(r) || r > 127 {
			return false
		}
	}
	return true
}

func validPersonName(name string) bool {
	for _, r := range name {
		if unicode.IsLetter(r) || r == ' ' || r == '-' || r == '\'' {
			continue
		}
		return false
	}
	return true
}
