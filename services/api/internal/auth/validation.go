package auth

import (
	"net/mail"
	"regexp"
	"strings"

	"hypertube/api/internal/i18n"
)

const (
	minPasswordBytes = 8
	maxPasswordBytes = 72
	maxNameLength    = 100
)

var usernamePattern = regexp.MustCompile(`^[A-Za-z0-9_]{3,32}$`)

type validationErrors map[string]i18n.Message

func validateRegisterRequest(req registerRequest) (CreateUserParams, validationErrors, bool) {
	fields := validationErrors{}

	email, ok := normalizeEmail(req.Email)
	if !ok {
		fields["email"] = i18n.MsgValidEmailRequired
	}

	username := strings.TrimSpace(req.Username)
	if !usernamePattern.MatchString(username) {
		fields["username"] = i18n.MsgUsernameInvalid
	}

	firstName := strings.TrimSpace(req.FirstName)
	if firstName == "" {
		firstName = strings.TrimSpace(req.FrontendFirstName)
	}
	if firstName == "" || len(firstName) > maxNameLength {
		fields["first_name"] = i18n.MsgFirstNameInvalid
	}

	lastName := strings.TrimSpace(req.LastName)
	if lastName == "" {
		lastName = strings.TrimSpace(req.FrontendLastName)
	}
	if lastName == "" || len(lastName) > maxNameLength {
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
		login = strings.TrimSpace(req.Email)
	}
	if login == "" {
		fields["login"] = i18n.MsgLoginRequired
	} else if email, ok := normalizeEmail(login); ok {
		login = email
	} else if !usernamePattern.MatchString(login) {
		fields["login"] = i18n.MsgLoginInvalid
	}
	if req.Password == "" || len(req.Password) > maxPasswordBytes {
		fields["password"] = i18n.MsgPasswordRequired
	}

	if len(fields) > 0 {
		return "", fields, false
	}
	return login, nil, true
}

func validatePassword(password string) (i18n.Message, bool) {
	if len(password) < minPasswordBytes || len(password) > maxPasswordBytes {
		return i18n.MsgPasswordLength, false
	}
	return "", true
}

func normalizeEmail(raw string) (string, bool) {
	email := strings.ToLower(strings.TrimSpace(raw))
	if email == "" {
		return "", false
	}

	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return "", false
	}

	return email, true
}
