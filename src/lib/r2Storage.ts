import { supabase } from "@/integrations/supabase/client";

const R2_PUBLIC_URL = "https://pub-859bcf561b974ee98398f558079b35b9.r2.dev";

// Edge functions are deployed on the Lovable-managed project
const EDGE_FUNCTIONS_URL = "https://vfrhingfdteydwuvuttg.supabase.co";
const EDGE_FUNCTIONS_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmcmhpbmdmZHRleWR3dXZ1dHRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkxMzk2MjcsImV4cCI6MjA2NDcxNTYyN30.dummy";

/**
 * Get the public URL for a file stored in R2
 */
export function getR2PublicUrl(path: string): string {
  return `${R2_PUBLIC_URL}/${path}`;
}

/**
 * Upload a file to R2 via edge function using fetch (not invoke, to support query params)
 */
export async function uploadToR2(file: File, path: string): Promise<{ error: Error | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("No active session");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    const response = await fetch(
      `${EDGE_FUNCTIONS_URL}/functions/v1/r2-storage?action=upload`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: EDGE_FUNCTIONS_ANON_KEY,
        },
        body: formData,
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || `Upload failed: ${response.status}`);
    }

    const data = await response.json();
    if (data?.error) throw new Error(data.error);

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Delete files from R2 via edge function
 */
export async function deleteFromR2(paths: string[]): Promise<{ error: Error | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("No active session");

    const response = await fetch(
      `${EDGE_FUNCTIONS_URL}/functions/v1/r2-storage?action=delete`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          apikey: EDGE_FUNCTIONS_ANON_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paths }),
      }
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData?.error || `Delete failed: ${response.status}`);
    }

    const data = await response.json();
    if (data?.error) throw new Error(data.error);

    return { error: null };
  } catch (err) {
    return { error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Download a file from R2 (public bucket)
 */
export async function downloadFromR2(path: string): Promise<{ data: Blob | null; error: Error | null }> {
  try {
    const url = getR2PublicUrl(path);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Download failed: ${response.status}`);
    const blob = await response.blob();
    return { data: blob, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}

/**
 * Get a viewable URL for a file in R2 (public bucket, no signing needed)
 */
export function getR2ViewUrl(path: string): string {
  return getR2PublicUrl(path);
}
