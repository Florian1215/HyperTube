package models

import "time"

type User struct {
	ID             int64     `json:"id"`
	Email          string    `json:"email"`
	Username       string    `json:"username"`
	FirstName      string    `json:"first_name"`
	LastName       string    `json:"last_name"`
	ProfilePicture string    `json:"profile_picture,omitempty"`
	PasswordHash   string    `json:"-"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

type UserSmall struct {
	ID             int64  `json:"id"`
	Username       string `json:"username"`
	FirstName      string `json:"first_name"`
	LastName       string `json:"last_name"`
	ProfilePicture string `json:"profile_picture,omitempty"`
}

func ToUserSmall(u User) UserSmall {
	return UserSmall{
		ID:             u.ID,
		Username:       u.Username,
		FirstName:      u.FirstName,
		LastName:       u.LastName,
		ProfilePicture: u.ProfilePicture,
	}
}
