export interface ApprovalAreaRecord {
  id?: string;
  name: string;
  role: string;
  isOwner?: boolean;
}

export interface ProcessMetadata {
  code: string;
  version: string;
  classification: string;
  processName: string;
  direction: string;
  owner: string;
  directorApprover: string;
  roles?: string;
  tools?: string;
  emisionDate?: string;
  actualizacionDate?: string;
  today: string;
  approvalAreas?: ApprovalAreaRecord[];
}

export interface AttachedMediaFile {
  name: string;
  mimeType: string;
  data: string; // Base64
}

export interface AttachedTextFile {
  name: string;
  content: string;
}
