package auth

import "hypertube/api/internal/models"

func (h *Handler) issueAccessToken(userID int64) (string, int64, error) {
	token, _, err := h.tokens.CreateAccessToken(userID)
	if err != nil {
		return "", 0, err
	}
	return token, int64(AccessTokenTTL.Seconds()), nil
}

func (h *Handler) newAuthResponse(user models.User, oauthMethod *string) (authResponse, error) {
	token, expiresIn, err := h.issueAccessToken(user.ID)
	if err != nil {
		return authResponse{}, err
	}

	return authResponse{
		AccessToken: token,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
		User:        toUserResponse(user, oauthMethod),
	}, nil
}
