package throttle

import (
	"sync"
	"time"
)

type attemptState struct {
	failures    int
	windowStart time.Time
}

type MemoryLimiter struct {
	mu          sync.Mutex
	maxFailures int
	window      time.Duration
	states      map[string]attemptState
}

func NewMemoryLimiter(maxFailures int, window time.Duration) *MemoryLimiter {
	return &MemoryLimiter{
		maxFailures: maxFailures,
		window:      window,
		states:      map[string]attemptState{},
	}
}

func (l *MemoryLimiter) Blocked(key string) bool {
	l.mu.Lock()
	defer l.mu.Unlock()

	state, ok := l.states[key]
	if !ok {
		return false
	}
	if time.Since(state.windowStart) > l.window {
		delete(l.states, key)
		return false
	}
	return state.failures >= l.maxFailures
}

func (l *MemoryLimiter) RecordFailure(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()

	state, ok := l.states[key]
	if !ok || time.Since(state.windowStart) > l.window {
		state = attemptState{windowStart: time.Now()}
	}
	state.failures++
	l.states[key] = state
}

func (l *MemoryLimiter) Reset(key string) {
	l.mu.Lock()
	defer l.mu.Unlock()
	delete(l.states, key)
}
