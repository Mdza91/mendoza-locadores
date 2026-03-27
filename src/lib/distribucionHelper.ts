import { supabase } from "@/integrations/supabase/client";

// Document types that are affected by the distribution system
export const TIPOS_DISTRIBUCION = [
  "requerimiento",
  "informe_logistica",
  "memo_oea",
  "memo_oepe",
  "anexo_03",
  "anexo_04",
];

/**
 * Gets the ruta_archivo for a general document considering the active distribution.
 * - Distribución Clásica: uses documentos_generales (global)
 * - Distribución Actualizada: uses documentos_generales_por_denominacion (per denomination)
 */
export async function getGeneralDocRoute(
  tipo: string,
  denominacionId: string | undefined,
  distribucionActiva: string,
  documentosGenerales: any[] | null | undefined,
  docsPorDenominacion?: any[] | null
): Promise<string | null> {
  if (distribucionActiva === "actualizada" && denominacionId) {
    // Use denomination-specific documents
    if (docsPorDenominacion) {
      const doc = docsPorDenominacion.find(
        (d: any) => d.tipo === tipo && d.denominacion_id === denominacionId
      );
      return doc?.ruta_archivo || null;
    }
    // Fallback: query directly
    const { data } = await supabase
      .from("documentos_generales_por_denominacion")
      .select("ruta_archivo")
      .eq("tipo", tipo)
      .eq("denominacion_id", denominacionId)
      .maybeSingle();
    return data?.ruta_archivo || null;
  }

  // Classic distribution: use global documents
  const doc = documentosGenerales?.find((d: any) => d.tipo === tipo);
  return doc?.ruta_archivo || null;
}

/**
 * Checks if a general document exists considering the active distribution.
 */
export function hasGeneralDoc(
  tipo: string,
  denominacionId: string | undefined,
  distribucionActiva: string,
  documentosGenerales: any[] | null | undefined,
  docsPorDenominacion?: any[] | null
): boolean {
  if (distribucionActiva === "actualizada" && denominacionId) {
    return (docsPorDenominacion || []).some(
      (d: any) => d.tipo === tipo && d.denominacion_id === denominacionId
    );
  }
  return (documentosGenerales || []).some((d: any) => d.tipo === tipo);
}
