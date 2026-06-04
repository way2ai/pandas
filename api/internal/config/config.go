package config

import "os"

type Config struct {
	HTTPAddr            string
	SessionCookieName   string
	SessionCookieSecure bool
}

func Load() Config {
	addr := os.Getenv("API_HTTP_ADDR")
	if addr == "" {
		addr = ":8080"
	}

	cookieName := os.Getenv("SESSION_COOKIE_NAME")
	if cookieName == "" {
		cookieName = "platform_session"
	}

	cookieSecure := os.Getenv("SESSION_COOKIE_SECURE") == "true"

	return Config{
		HTTPAddr:            addr,
		SessionCookieName:   cookieName,
		SessionCookieSecure: cookieSecure,
	}
}
