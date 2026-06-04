package audit

import "sync"

type Event struct {
	Action  string
	Result  string
	TraceID string
}

type InMemoryService struct {
	mu     sync.Mutex
	events []Event
}

func (s *InMemoryService) Record(event Event) {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, event)
}

func (s *InMemoryService) Events() []Event {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := make([]Event, len(s.events))
	copy(result, s.events)
	return result
}
