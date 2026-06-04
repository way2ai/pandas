package app

import (
	"net/http"

	"github.com/way2ai/pandas/api/internal/httpx"
)

func Handler() http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		httpx.WriteJSON(w, http.StatusOK, map[string]any{
			"trace_id": httpx.TraceID(r.Context()),
			"data": map[string]string{
				"area": "app",
			},
		})
	})
}
