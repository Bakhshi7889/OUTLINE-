const STORAGE_KEY = 'aether_guest_projects';
const DRAFT_KEY = 'aether_draft_inputs';

export interface ProjectData {
  id: string;
  name: string;
  timestamp: number;
  inputs: {
    idea: string;
    target: string;
    type: string;
  };
  files: {
    prd: string;
    spec: string;
    task: string;
  };
}

// --- PROJECT HISTORY ---

export const saveProject = (project: ProjectData) => {
  try {
    const existing = loadProjects();
    // Remove duplicates by ID
    const updated = existing.filter(p => p.id !== project.id);
    updated.unshift(project); // Add to top
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated.slice(0, 20))); 
  } catch (e) {
    console.error("Storage failed", e);
  }
};

export const loadProjects = (): ProjectData[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
};

export const deleteProject = (id: string) => {
    try {
        const existing = loadProjects();
        const updated = existing.filter(p => p.id !== id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch (e) {
        console.error("Delete failed", e);
    }
}

// --- DRAFT STATE ---

export const saveDraft = (inputs: { idea: string, target: string, type: string }) => {
    try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(inputs));
    } catch (e) {
        console.error("Draft save failed", e);
    }
}

export const loadDraft = () => {
    try {
        const raw = localStorage.getItem(DRAFT_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch (e) {
        return null;
    }
}