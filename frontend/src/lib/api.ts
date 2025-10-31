// // API Configuration
// export const API_URL = 'http://localhost:3000';
export const API_URL = 'https://api.dev-ansh.xyz';


// Types
export interface User {
  userId: string;
  name: string;
  email: string;
  threads: Record<string, Thread>;
}

export interface Thread {
  thread_name: string;
  createdAt: string;
  updatedAt: string;
  documents: Document[];
  chats: Chat[];
}

export interface Document {
  docId: string;
  title: string;
  type: string;
  time_uploaded: string;
  file_name: string;
}

export interface Chat {
  type: 'user' | 'agent';
  content: string;
  timestamp: string;
  sources?: {
    documents_used: Array<{
      title: string;
      document_id: string;
      page_no: number;
    }>;
    web_used: Array<{
      title: string;
      url: string;
      favicon: string | null;
    }>;
  };
}

export interface LoginResponse {
  status: string;
  message: string;
  user: User;
  token: string;
}

export interface UploadResponse {
  status: string;
  message: string;
  thread_id: string;
  documents: Document[];
}

export interface QueryResponse {
  thread_id: string;
  user_id: string;
  question: string;
  answer: string;
  // Original shape (legacy)
  docs_used?: Array<{
    title: string;
    document_id: string;
    page_no: number;
  }>;
  web_used?: Array<{
    title: string;
    url: string;
    favicon: string | null;
  }>;
  // Newer shape returned by backend under a `sources` object
  sources?: {
    documents_used?: Array<{
      title: string;
      document_id: string;
      page_no: number;
    }>;
    web_used?: Array<{
      title: string;
      url: string;
      favicon: string | null;
    }>;
  };
}

// Mind map types
export interface MindMapNode {
  id: string;
  title: string;
  description?: string | null;
  parent_id?: string | null;
  children: MindMapNode[];
}

export interface GlobalMindMap {
  user_id: string;
  thread_id: string;
  roots: MindMapNode[];
}

export interface MindMapResponse {
  mind_map: boolean;
  status?: boolean; // only present when mind_map is true
  message: string;
  data?: GlobalMindMap; // present when mind_map && status
}

export interface SummaryResponse {
  status?: boolean;
  summary?: string;
  message?: string;
  error?: string;
}

// Roadmap types (mirror backend Pydantic models)
export interface VisionAndEndGoal {
  description: string;
  success_criteria: string[];
}

export interface SWOT {
  strengths: string[];
  weaknesses: string[];
  opportunities: string[];
  threats: string[];
}

export interface CurrentBaseline {
  summary: string;
  swot: SWOT;
}

export interface StrategicPillar {
  pillar_name: string;
  description: string;
}

export interface PhasedRoadmapItem {
  phase: string;
  time_frame: string;
  key_objectives: string[];
  key_initiatives: string[];
  expected_outcomes: string[];
}

export interface EnablersAndDependencies {
  technologies: string[];
  skills_and_resources: string[];
  stakeholders: string[];
}

export interface RiskAndMitigation {
  risk: string;
  mitigation_strategy: string;
}

export interface KeyMetricsAndMilestone {
  year_or_phase: string;
  metrics: string[];
}

export interface LLMInferredAddition {
  section_title: string;
  content: string;
}

export interface StrategicRoadmapLLMOutput {
  roadmap_title: string;
  vision_and_end_goal: VisionAndEndGoal;
  current_baseline: CurrentBaseline;
  strategic_pillars: StrategicPillar[];
  phased_roadmap: PhasedRoadmapItem[];
  enablers_and_dependencies: EnablersAndDependencies;
  risks_and_mitigation: RiskAndMitigation[];
  key_metrics_and_milestones: KeyMetricsAndMilestone[];
  future_opportunities: string[];
  llm_inferred_additions: LLMInferredAddition[];
}

export interface RoadmapResponse {
  status?: boolean;
  roadmap?: StrategicRoadmapLLMOutput;
  message?: string;
  error?: string;
}

// Pros & Cons types
export interface ProsConsOutput {
  pros: string[];
  cons: string[];
}

export interface ProsConsResponse {
  status?: boolean;
  pros_cons?: ProsConsOutput;
  message?: string;
  error?: string;
}

// Auth helpers
export const getAuthToken = () => localStorage.getItem('auth_token');
export const setAuthToken = (token: string) => localStorage.setItem('auth_token', token);
export const removeAuthToken = () => localStorage.removeItem('auth_token');
export const getCurrentUser = (): User | null => {
  const userStr = localStorage.getItem('current_user');
  return userStr ? JSON.parse(userStr) : null;
};
export const setCurrentUser = (user: User) => localStorage.setItem('current_user', JSON.stringify(user));
export const removeCurrentUser = () => localStorage.removeItem('current_user');

// API functions
export const api = {
  async register(name: string, email: string, password: string) {
    const response = await fetch(`${API_URL}/user/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    return response;
  },

  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await fetch(`${API_URL}/user/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!response.ok) {
      throw new Error('Invalid email or password');
    }

    return response.json();
  },

  async getUser(userId: string): Promise<User> {
    const token = getAuthToken();
    console.log("Using token:", token);
    console.log("Fetching user with ID:", userId);
    const response = await fetch(`${API_URL}/user/${userId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data.user;
  },

  async uploadFiles(data: { thread_name?: string; thread_id?: string; files: File[] }): Promise<UploadResponse> {
    const token = getAuthToken();
    const formData = new FormData();

    if (data.thread_name) formData.append('thread_name', data.thread_name);
    if (data.thread_id) formData.append('thread_id', data.thread_id);
    data.files.forEach(file => formData.append('files', file));

    const response = await fetch(`${API_URL}/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    return response.json();
  },


  async uploadFilesWithProgress(params: {
    thread_name?: string;
    thread_id?: string;
    files: File[];
    onProgress?: (args: { fileIndex: number; loaded: number; total: number; percent: number }) => void;
  }): Promise<UploadResponse> {
    const token = getAuthToken();

    const uploadSingle = (file: File): Promise<UploadResponse> => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/upload`, true);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.onload = () => {
          try {
            const json = JSON.parse(xhr.responseText);
            resolve(json);
          } catch (e) {
            reject(e);
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        const formData = new FormData();
        if (params.thread_name) formData.append('thread_name', params.thread_name);
        if (params.thread_id) formData.append('thread_id', params.thread_id);
        formData.append('files', file);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && params.onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
          }
        };

        xhr.send(formData);
      });
    };

    const results: UploadResponse = {
      status: 'success',
      message: 'Uploaded',
      thread_id: params.thread_id || '',
      documents: [],
    };

    for (let i = 0; i < params.files.length; i++) {
      const file = params.files[i];
      await new Promise<UploadResponse>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', `${API_URL}/upload`, true);
        if (token) {
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        }

        xhr.onload = () => {
          try {
            const json: UploadResponse = JSON.parse(xhr.responseText);
            if (!results.thread_id && json.thread_id) {
              results.thread_id = json.thread_id;
            }
            results.documents = [...results.documents, ...json.documents];
            resolve(json);
          } catch (e) {
            reject(e);
          }
        };

        xhr.onerror = () => reject(new Error('Network error during upload'));

        const formData = new FormData();
        if (params.thread_name) formData.append('thread_name', params.thread_name);
        if (params.thread_id) formData.append('thread_id', params.thread_id);
        formData.append('files', file);

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable && params.onProgress) {
            const percent = Math.round((event.loaded / event.total) * 100);
            params.onProgress({ fileIndex: i, loaded: event.loaded, total: event.total, percent });
          }
        };

        xhr.send(formData);
      });
    }

    return results;
  },

  async getThread(threadId: string): Promise<Thread> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/thread/${threadId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await response.json();
    return data.thread;
  },

  async query(threadId: string, question: string, mode: 'Internal' | 'External'): Promise<QueryResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/query`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread_id: threadId, question, mode }),
    });
    return response.json();
  },

  async deleteThread(threadId: string): Promise<{ status: boolean }> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/thread/delete/${threadId}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    return response.json();
  },

  async getMindMap(threadId: string): Promise<MindMapResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/mindmap/${threadId}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (!response.ok) {
      // Fallback shape with mind_map=false so UI can display error message
      return { mind_map: false, message: `Failed to fetch mind map (${response.status})` };
    }
    return response.json();
  },

  async summary(threadId: string, documentId: string): Promise<SummaryResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/summary`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread_id: threadId, document_id: documentId }),
    });
    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      return { status: false, error: `Failed to parse summary response (${response.status})` };
    }
    if (!response.ok) {
      // Normalize error shape
      return { status: false, error: data?.detail || data?.message || 'Summary request failed' };
    }
    return data as SummaryResponse;
  },

  async roadmap(threadId: string, documentId: string): Promise<RoadmapResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/roadmap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread_id: threadId, document_id: documentId }),
    });
    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      return { status: false, error: `Failed to parse roadmap response (${response.status})` };
    }
    if (!response.ok) {
      return { status: false, error: data?.detail || data?.message || 'Roadmap request failed' };
    }
    // Expected shapes: { status: false, message } or { status: true, roadmap }
    return data as RoadmapResponse;
  },

  async prosCons(threadId: string, documentId: string): Promise<ProsConsResponse> {
    const token = getAuthToken();
    const response = await fetch(`${API_URL}/pros_cons`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ thread_id: threadId, document_id: documentId }),
    });
    let data: any = null;
    try {
      data = await response.json();
    } catch (_) {
      return { status: false, error: `Failed to parse pros/cons response (${response.status})` };
    }
    if (!response.ok) {
      return { status: false, error: data?.detail || data?.message || 'Pros/Cons request failed' };
    }
    // Expected shapes: { status: false, message } or { status: true, pros_cons }
    return data as ProsConsResponse;
  },
};

// WebSocket helper
export const getWebSocketUrl = (path: string) => {
  // Allow explicit WS base via env, otherwise derive from API_URL
  const base = (import.meta.env.VITE_WS_URL as string | undefined) || API_URL;
  const url = new URL(base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  // Ensure we don't double up slashes
  const joined = `${url.origin}${path.startsWith('/') ? '' : '/'}${path}`;
  return joined;
};
