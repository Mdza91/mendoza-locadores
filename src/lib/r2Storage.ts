import { supabase } from "@/integrations/supabase/client";

const R2_PUBLIC_URL = "https://pub-859bcf561b974ee98398f558079b35b9.r2.dev";

/**
 * Get the public URL for a file stored in R2
 */
export function getR2PublicUrl(path: string): string {
  return `${R2_PUBLIC_URL}/${path}`;
}

/**
 * Upload a file to R2 via edge function
 */
export async function uploadToR2(file: File, path: string): Promise<{ error: Error | null }> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("path", path);

    const { data, error } = await supabase.functions.invoke("r2-storage?action=upload", {
      body: formData,
    });

    if (error) throw error;
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
    const { data, error } = await supabase.functions.invoke("r2-storage?action=delete", {
      body: { paths },
    });

    if (error) throw error;
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
