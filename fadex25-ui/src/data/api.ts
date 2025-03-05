// Fadex25/fadex25-ui/src/data/api.ts
export async function fetchDbStatus(): Promise<{ status: 'Active' | 'Paused' | 'Error'; size: string }> {
    // Placeholder: Replace with actual API call to server.ts (/api/db/status)
    const response = await fetch('http://localhost:4000/api/db/status');
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return response.json();
  }