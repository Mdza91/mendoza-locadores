// Tipos de documentos organizados por etapa

export const DOCUMENTOS_PRIMERA_ETAPA = {
  suspension_cuarta: "Suspensión de Cuarta Categoría",
  rnp: "RNP",
  consulta_ruc: "Consulta RUC",
  consulta_servir: "Consulta Servir",
  sancion_tce: "Sanción TCE",
  cotizacion: "Cotización",
  declaracion_jurada: "Declaración Jurada",
  tdr: "TDR",
  cv_documentado: "Hoja de Vida - CV",
  dni_vigente: "DNI Vigente",
  sustento_cv: "Sustento - CV",
  constancia_estudios_sin_fedatear: "Constancia de Estudios",
  constancia_estudios: "Constancia de Estudios Fedateada",
  habilidad_vigente: "Habilidad Vigente",
  cci: "CCI",
} as const;

export const DOCUMENTOS_SEGUNDA_ETAPA = {
  anexo_03: "Anexo 03",
  anexo_04: "Anexo 04",
  ccp_logistica: "CCP – Logística",
  ccp_oepe: "CCP – OEPE",
} as const;

export const DOCUMENTOS_GENERALES = {
  requerimiento: "Requerimiento",
  informe_logistica: "Informe – Logística",
  memo_oea: "Memo – OEA",
  memo_oepe: "Memo – OEPE",
  anexo_03: "Anexo 03",
  anexo_04: "Anexo 04",
} as const;




// Orden de documentos para expediente de Primera Etapa
export const ORDEN_EXPEDIENTE_ORIGINAL = [
  'suspension_cuarta',
  'rnp',
  'consulta_ruc',
  'consulta_servir',
  'sancion_tce',
  'cotizacion',
  'declaracion_jurada',
  'tdr',
  'cv_documentado',
  'dni_vigente',
  'sustento_cv',
  'constancia_estudios_sin_fedatear',
  'constancia_estudios',
  'habilidad_vigente',
  'cci',
];

// Orden de documentos para expediente de Segunda Etapa (Pago)
export const ORDEN_EXPEDIENTE_PAGO = [
  'suspension_cuarta',
  'memo_oepe',
  'ccp_oepe',
  'memo_oea',
  'informe_logistica',
  'ccp_logistica',
  'anexo_03',
  'anexo_04',
  'rnp',
  'consulta_ruc',
  'consulta_servir',
  'sancion_tce',
  'cotizacion',
  'declaracion_jurada',
  'tdr',
  'requerimiento',
  'cv_documentado',
  'dni_vigente',
  'sustento_cv',
  'constancia_estudios_sin_fedatear',
  'constancia_estudios',
  'habilidad_vigente',
  'cci',
];

export type DocumentoTipoGeneral = keyof typeof DOCUMENTOS_GENERALES;
