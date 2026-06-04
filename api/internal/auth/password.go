package auth

import "golang.org/x/crypto/bcrypt"

// HashPassword converts a raw password into a bcrypt hash for storage.
func HashPassword(raw string) (string, error) {
	bytes, err := bcrypt.GenerateFromPassword([]byte(raw), bcrypt.DefaultCost)
	return string(bytes), err
}

// CheckPassword verifies a raw password against a stored hash.
func CheckPassword(hash, raw string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(raw)) == nil
}
