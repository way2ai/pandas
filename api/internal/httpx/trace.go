package httpx

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"net/http"
)

type traceContextKey struct{}

// WithTrace attaches a trace id to each request context and response header.
func WithTrace(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		traceID := newTraceID()
		w.Header().Set("X-Trace-Id", traceID)
		ctx := context.WithValue(r.Context(), traceContextKey{}, traceID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// TraceID extracts the current trace id from context.
func TraceID(ctx context.Context) string {
	traceID, _ := ctx.Value(traceContextKey{}).(string)
	return traceID
}

func newTraceID() string {
	buf := make([]byte, 16)
	_, _ = rand.Read(buf)
	return hex.EncodeToString(buf)
}
