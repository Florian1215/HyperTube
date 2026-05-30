package auth

import (
	"net/mail"
	"regexp"
	"strings"

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
	}

	lastName := strings.TrimSpace(req.LastName)
	if lastName == "" {
		lastName = strings.TrimSpace(req.FrontendLastName)
	}
	if lastName == "" {
		fields["last_name"] = i18n.MsgLastNameRequired
	} else if len(lastName) > maxNameLength {
		fields["last_name"] = i18n.MsgLastNameTooLong
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

	field, rawLogin := loginFieldAndValue(req)
	login := strings.TrimSpace(rawLogin)
	if login == "" {
		if field == "email" {
			fields[field] = i18n.MsgEmailRequired
		} else {
			fields[field] = i18n.MsgLoginRequired
		}
	} else {
		identifier, validationMessage, ok := validateLoginIdentifier(login)
		if ok {
			login = identifier
		} else {
			fields[field] = validationMessage
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

func loginFieldAndValue(req loginRequest) (string, string) {
	if req.Login != nil {
		return "login", *req.Login
	}
	if req.Email != nil {
		return "email", *req.Email
	}
	return "email", ""
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

	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return "", false
	}

	return email, true
}
