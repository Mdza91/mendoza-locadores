import { supabase } from "@/integrations/supabase/client";

/**
 * Base URL for edge functions (deployed on the Lovable-managed Supabase project).
 * The database/auth remain on the external project (gikeegxdrkelhpfkcaci).
 */
export const EDGE_FUNCTIONS_BASE_URL = "https://vfrhingfdteydwuvuttg.supabase.co";

/**
 * Call an edge function deployed on the Lovable-managed project.
 * Passes the user's auth token from the external project for verification.
 */
export async function invokeEdgeFunction(
  functionName: string,
  body: Record<string, unknown>
): Promise<{ data: any; error: Error | null }> {
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    const accessToken = sessionData?.session?.access_token;
    if (!accessToken) throw new Error("No active session");

    const response = await fetch(
      `${EDGE_FUNCTIONS_BASE_URL}/functions/v1/${functionName}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify(body),
      }
    );

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || `Function failed: ${response.status}`);
    }

    if (data?.error) throw new Error(data.error);

    return { data, error: null };
  } catch (err) {
    return { data: null, error: err instanceof Error ? err : new Error(String(err)) };
  }
}