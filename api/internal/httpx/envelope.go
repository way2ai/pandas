package httpx

import (
	"encoding/json"
	"net/http"
)

// WriteJSON writes a small JSON response envelope for API handlers.
func WriteJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

// WriteError writes a standard error envelope for API handlers.
func WriteError(w http.ResponseWriter, status int, traceID, code, message string) {
	WriteJSON(w, status, map[string]any{
		"trace_id": traceID,
		"error": map[string]string{
			"code":    code,
			"message": message,
		},
	})
}
