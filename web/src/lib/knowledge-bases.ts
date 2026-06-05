export type KnowledgeBase = {
  id: string;
  name: string;
  scope: string;
  status: string;
  access_role: string;
  owner_email?: string;
  tenant_id?: string;
  workspace_user_id?: string;
};

export type KnowledgeDocument = {
  id: string;
  knowledge_base_id: string;
  name: string;
  source_type: string;
  source_uri?: string;
  status: string;
};

export type KnowledgeBuildTask = {
  id: string;
  knowledge_base_id: string;
  scope: string;
  status: string;
  trigger: string;
  document_count: number;
  last_error?: string;
};
