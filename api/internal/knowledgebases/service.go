package knowledgebases

import (
	"errors"
	"fmt"
	"strings"
	"sync"

	"github.com/way2ai/pandas/api/internal/auth"
)

var (
	ErrKnowledgeBaseNotFound = errors.New("knowledge_base_not_found")
	ErrKnowledgeBaseAccess   = errors.New("knowledge_base_access_denied")
	ErrKnowledgeBaseEmpty    = errors.New("knowledge_base_has_no_documents")
	ErrBuildNotFound         = errors.New("build_not_found")
	ErrBuildNotRetryable     = errors.New("build_not_retryable")
	ErrBuildNotCancellable   = errors.New("build_not_cancellable")
)

type KnowledgeBase struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Scope          string `json:"scope"`
	Status         string `json:"status"`
	AccessRole     string `json:"access_role"`
	OwnerEmail     string `json:"owner_email,omitempty"`
	TenantID       string `json:"tenant_id,omitempty"`
	WorkspaceUser  string `json:"workspace_user_id,omitempty"`
}

type Document struct {
	ID              string `json:"id"`
	KnowledgeBaseID string `json:"knowledge_base_id"`
	Name            string `json:"name"`
	SourceType      string `json:"source_type"`
	SourceURI       string `json:"source_uri,omitempty"`
	Status          string `json:"status"`
}

type BuildTask struct {
	ID              string `json:"id"`
	KnowledgeBaseID string `json:"knowledge_base_id"`
	Scope           string `json:"scope"`
	Status          string `json:"status"`
	Trigger         string `json:"trigger"`
	DocumentCount   int    `json:"document_count"`
	LastError       string `json:"last_error,omitempty"`
}

type Service struct {
	mu        sync.Mutex
	nextID    int
	records   []KnowledgeBase
	documents []Document
	builds    []BuildTask
}

func NewInMemoryService() *Service {
	return &Service{
		nextID: 3,
		records: []KnowledgeBase{
			{
				ID:            "kb-personal-1",
				Name:          "Personal Notes",
				Scope:         "personal",
				Status:        "ready",
				AccessRole:    "owner",
				OwnerEmail:    "user@example.com",
				WorkspaceUser: "user@example.com",
			},
			{
				ID:         "kb-tenant-1",
				Name:       "Tenant Handbook",
				Scope:      "tenant",
				Status:     "ready",
				AccessRole: "viewer",
				TenantID:   "tenant-demo",
			},
		},
		documents: []Document{
			{
				ID:              "doc-personal-1",
				KnowledgeBaseID: "kb-personal-1",
				Name:            "notes.md",
				SourceType:      "file",
				Status:          "ready",
			},
			{
				ID:              "doc-tenant-1",
				KnowledgeBaseID: "kb-tenant-1",
				Name:            "https://example.com/handbook",
				SourceType:      "url",
				SourceURI:       "https://example.com/handbook",
				Status:          "ready",
			},
		},
		builds: []BuildTask{
			{
				ID:              "build-kb-tenant-1",
				KnowledgeBaseID: "kb-tenant-1",
				Scope:           "tenant",
				Status:          "ready",
				Trigger:         "seed",
				DocumentCount:   1,
			},
			{
				ID:              "build-kb-tenant-queued",
				KnowledgeBaseID: "kb-tenant-1",
				Scope:           "tenant",
				Status:          "queued",
				Trigger:         "manual",
				DocumentCount:   1,
			},
			{
				ID:              "build-kb-personal-failed",
				KnowledgeBaseID: "kb-personal-1",
				Scope:           "personal",
				Status:          "failed",
				Trigger:         "manual",
				DocumentCount:   1,
				LastError:       "embedding_timeout",
			},
		},
	}
}

func (s *Service) ListForApp(currentSession auth.Session) []KnowledgeBase {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := []KnowledgeBase{}
	for _, record := range s.records {
		switch {
		case record.Scope == "personal" && currentSession.SystemRole == "personal_user" && record.OwnerEmail == currentSession.UserEmail:
			result = append(result, record)
		case record.Scope == "tenant" && (currentSession.SystemRole == "tenant_admin" || currentSession.SystemRole == "tenant_member"):
			nextRecord := record
			if currentSession.SystemRole == "tenant_admin" {
				nextRecord.AccessRole = "admin"
			}
			result = append(result, nextRecord)
		}
	}
	return result
}

func (s *Service) ListForTenant() []KnowledgeBase {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := []KnowledgeBase{}
	for _, record := range s.records {
		if record.Scope == "tenant" {
			nextRecord := record
			nextRecord.AccessRole = "admin"
			result = append(result, nextRecord)
		}
	}
	return result
}

func (s *Service) ListAll() []KnowledgeBase {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := make([]KnowledgeBase, len(s.records))
	copy(result, s.records)
	return result
}

func (s *Service) CreatePersonal(ownerEmail, name string) KnowledgeBase {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := KnowledgeBase{
		ID:            fmt.Sprintf("kb-personal-%d", s.nextID),
		Name:          strings.TrimSpace(name),
		Scope:         "personal",
		Status:        "pending_build",
		AccessRole:    "owner",
		OwnerEmail:    ownerEmail,
		WorkspaceUser: ownerEmail,
	}
	s.nextID++
	s.records = append(s.records, record)
	return record
}

func (s *Service) CreateTenant(name string) KnowledgeBase {
	s.mu.Lock()
	defer s.mu.Unlock()

	record := KnowledgeBase{
		ID:         fmt.Sprintf("kb-tenant-%d", s.nextID),
		Name:       strings.TrimSpace(name),
		Scope:      "tenant",
		Status:     "pending_build",
		AccessRole: "admin",
		TenantID:   "tenant-demo",
	}
	s.nextID++
	s.records = append(s.records, record)
	return record
}

func (s *Service) ListDocumentsForApp(currentSession auth.Session, knowledgeBaseID string) ([]Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findAppKnowledgeBase(currentSession, knowledgeBaseID)
	if err != nil {
		return nil, err
	}
	return s.documentsForKnowledgeBaseLocked(record.ID), nil
}

func (s *Service) ListDocumentsForTenant(knowledgeBaseID string) ([]Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findTenantKnowledgeBase(knowledgeBaseID)
	if err != nil {
		return nil, err
	}
	return s.documentsForKnowledgeBaseLocked(record.ID), nil
}

func (s *Service) CreatePersonalDocument(ownerEmail, knowledgeBaseID, name, sourceType, sourceURI string) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findPersonalKnowledgeBase(ownerEmail, knowledgeBaseID)
	if err != nil {
		return Document{}, err
	}

	document := Document{
		ID:              fmt.Sprintf("doc-personal-%d", s.nextID),
		KnowledgeBaseID: record.ID,
		Name:            strings.TrimSpace(name),
		SourceType:      strings.TrimSpace(sourceType),
		SourceURI:       strings.TrimSpace(sourceURI),
		Status:          "pending_build",
	}
	s.nextID++
	s.documents = append(s.documents, document)
	s.setKnowledgeBaseStatusLocked(record.ID, "pending_build")
	return document, nil
}

func (s *Service) CreateTenantDocument(knowledgeBaseID, name, sourceType, sourceURI string) (Document, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findTenantKnowledgeBase(knowledgeBaseID)
	if err != nil {
		return Document{}, err
	}

	document := Document{
		ID:              fmt.Sprintf("doc-tenant-%d", s.nextID),
		KnowledgeBaseID: record.ID,
		Name:            strings.TrimSpace(name),
		SourceType:      strings.TrimSpace(sourceType),
		SourceURI:       strings.TrimSpace(sourceURI),
		Status:          "pending_build",
	}
	s.nextID++
	s.documents = append(s.documents, document)
	s.setKnowledgeBaseStatusLocked(record.ID, "pending_build")
	return document, nil
}

func (s *Service) ListBuildsForApp(currentSession auth.Session, knowledgeBaseID string) ([]BuildTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findAppKnowledgeBase(currentSession, knowledgeBaseID)
	if err != nil {
		return nil, err
	}
	return s.buildsForKnowledgeBaseLocked(record.ID), nil
}

func (s *Service) ListBuildsForTenant(knowledgeBaseID string) ([]BuildTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findTenantKnowledgeBase(knowledgeBaseID)
	if err != nil {
		return nil, err
	}
	return s.buildsForKnowledgeBaseLocked(record.ID), nil
}

func (s *Service) ListAllBuilds() []BuildTask {
	s.mu.Lock()
	defer s.mu.Unlock()

	result := make([]BuildTask, len(s.builds))
	copy(result, s.builds)
	return result
}

func (s *Service) RetryBuild(id string) (BuildTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := s.findBuildIndexLocked(id)
	if index < 0 {
		return BuildTask{}, ErrBuildNotFound
	}

	build := s.builds[index]
	if build.Status != "failed" && build.Status != "cancelled" {
		return BuildTask{}, ErrBuildNotRetryable
	}

	build.Status = "queued"
	build.Trigger = "retry"
	build.LastError = ""
	s.builds[index] = build
	s.setKnowledgeBaseStatusLocked(build.KnowledgeBaseID, "pending_build")
	s.setDocumentsStatusLocked(build.KnowledgeBaseID, "pending_build")
	return build, nil
}

func (s *Service) CancelBuild(id string) (BuildTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	index := s.findBuildIndexLocked(id)
	if index < 0 {
		return BuildTask{}, ErrBuildNotFound
	}

	build := s.builds[index]
	if build.Status != "queued" && build.Status != "processing" {
		return BuildTask{}, ErrBuildNotCancellable
	}

	build.Status = "cancelled"
	s.builds[index] = build
	return build, nil
}

func (s *Service) QueuePersonalBuild(ownerEmail, knowledgeBaseID string) (BuildTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findPersonalKnowledgeBase(ownerEmail, knowledgeBaseID)
	if err != nil {
		return BuildTask{}, err
	}
	return s.queueBuildLocked(record, "manual")
}

func (s *Service) QueueTenantBuild(knowledgeBaseID string) (BuildTask, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	record, err := s.findTenantKnowledgeBase(knowledgeBaseID)
	if err != nil {
		return BuildTask{}, err
	}
	return s.queueBuildLocked(record, "manual")
}

func (s *Service) documentsForKnowledgeBaseLocked(knowledgeBaseID string) []Document {
	result := []Document{}
	for _, document := range s.documents {
		if document.KnowledgeBaseID == knowledgeBaseID {
			result = append(result, document)
		}
	}
	return result
}

func (s *Service) buildsForKnowledgeBaseLocked(knowledgeBaseID string) []BuildTask {
	result := []BuildTask{}
	for _, build := range s.builds {
		if build.KnowledgeBaseID == knowledgeBaseID {
			result = append(result, build)
		}
	}
	return result
}

func (s *Service) findBuildIndexLocked(id string) int {
	for index, build := range s.builds {
		if build.ID == id {
			return index
		}
	}
	return -1
}

func (s *Service) findAppKnowledgeBase(currentSession auth.Session, knowledgeBaseID string) (KnowledgeBase, error) {
	switch currentSession.SystemRole {
	case "personal_user":
		return s.findPersonalKnowledgeBase(currentSession.UserEmail, knowledgeBaseID)
	case "tenant_admin", "tenant_member":
		return s.findTenantKnowledgeBase(knowledgeBaseID)
	default:
		return KnowledgeBase{}, ErrKnowledgeBaseAccess
	}
}

func (s *Service) findPersonalKnowledgeBase(ownerEmail, knowledgeBaseID string) (KnowledgeBase, error) {
	for _, record := range s.records {
		if record.ID == knowledgeBaseID {
			if record.Scope != "personal" || record.OwnerEmail != ownerEmail {
				return KnowledgeBase{}, ErrKnowledgeBaseAccess
			}
			return record, nil
		}
	}
	return KnowledgeBase{}, ErrKnowledgeBaseNotFound
}

func (s *Service) findTenantKnowledgeBase(knowledgeBaseID string) (KnowledgeBase, error) {
	for _, record := range s.records {
		if record.ID == knowledgeBaseID {
			if record.Scope != "tenant" {
				return KnowledgeBase{}, ErrKnowledgeBaseAccess
			}
			return record, nil
		}
	}
	return KnowledgeBase{}, ErrKnowledgeBaseNotFound
}

func (s *Service) queueBuildLocked(record KnowledgeBase, trigger string) (BuildTask, error) {
	documentCount := len(s.documentsForKnowledgeBaseLocked(record.ID))
	if documentCount == 0 {
		return BuildTask{}, ErrKnowledgeBaseEmpty
	}

	build := BuildTask{
		ID:              fmt.Sprintf("build-%s-%d", record.ID, s.nextID),
		KnowledgeBaseID: record.ID,
		Scope:           record.Scope,
		Status:          "queued",
		Trigger:         trigger,
		DocumentCount:   documentCount,
	}
	s.nextID++
	s.builds = append(s.builds, build)
	s.setKnowledgeBaseStatusLocked(record.ID, "pending_build")
	return build, nil
}

func (s *Service) setKnowledgeBaseStatusLocked(knowledgeBaseID, status string) {
	for index, record := range s.records {
		if record.ID == knowledgeBaseID {
			record.Status = status
			s.records[index] = record
			return
		}
	}
}

func (s *Service) setDocumentsStatusLocked(knowledgeBaseID, status string) {
	for index, document := range s.documents {
		if document.KnowledgeBaseID == knowledgeBaseID {
			document.Status = status
			s.documents[index] = document
		}
	}
}
