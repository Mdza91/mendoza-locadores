import { z } from "zod";

// Locador form validation schema
export const locadorSchema = z.object({
  apellidos: z
    .string()
    .trim()
    .min(1, "Los apellidos son obligatorios")
    .max(100, "Los apellidos no pueden exceder 100 caracteres")
    .regex(/^[A-ZÁÉÍÓÚÑ\s\-–]+$/, "Solo se permiten letras mayúsculas y guiones"),
  nombres: z
    .string()
    .trim()
    .min(1, "Los nombres son obligatorios")
    .max(100, "Los nombres no pueden exceder 100 caracteres")
    .regex(/^[A-ZÁÉÍÓÚÑ\s\-–]+$/, "Solo se permiten letras mayúsculas y guiones"),
  tipo_documento: z.enum(["DNI", "CE"], {
    required_error: "Seleccione un tipo de documento",
  }),
  numero_documento: z
    .string()
    .trim()
    .regex(/^\d+$/, "Solo se permiten números")
    .refine(
      (val) => val.length === 8 || val.length === 9,
      "Debe tener 8 dígitos (DNI) o 9 dígitos (CE)"
    ),
  ruc: z
    .string()
    .trim()
    .length(11, "El RUC debe tener exactamente 11 dígitos")
    .regex(/^\d+$/, "Solo se permiten números")
    .regex(/^(10|20)/, "El RUC debe comenzar con 10 o 20"),
  celular: z
    .string()
    .trim()
    .min(7, "El celular debe tener al menos 7 dígitos")
    .max(15, "El celular no puede exceder 15 dígitos")
    .regex(/^[0-9\s+()-]+$/, "Formato de celular inválido"),
  correo: z
    .string()
    .trim()
    .email("Correo electrónico inválido")
    .max(255, "El correo no puede exceder 255 caracteres")
    .toLowerCase(),
  remuneracion: z
    .string()
    .trim()
    .refine((val) => !isNaN(parseFloat(val)), "Debe ser un número válido")
    .refine((val) => parseFloat(val) > 0, "La remuneración debe ser mayor a 0")
    .refine(
      (val) => parseFloat(val) <= 999999.99,
      "La remuneración no puede exceder 999,999.99"
    ),
  banco: z
    .string()
    .trim()
    .min(1, "El banco es obligatorio")
    .max(100, "El nombre del banco no puede exceder 100 caracteres")
    .regex(/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s\-–]+$/, "Solo se permiten letras y guiones"),
  cci: z
    .string()
    .trim()
    .length(20, "El CCI debe tener exactamente 20 dígitos")
    .regex(/^\d+$/, "Solo se permiten números"),
  direccion: z
    .string()
    .trim()
    .min(10, "La dirección debe tener al menos 10 caracteres")
    .max(255, "La dirección no puede exceder 255 caracteres"),
  unidad_id: z.string().uuid("Seleccione una unidad válida"),
  denominacion_id: z.string().uuid("Seleccione una denominación válida"),
  inicio_actividades: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida")
    .refine(
      (val) => {
        // Comparar solo las fechas sin hora para evitar problemas de zona horaria
        const inputDate = new Date(val + 'T12:00:00');
        const today = new Date();
        today.setHours(12, 0, 0, 0);
        return inputDate <= today;
      },
      "La fecha no puede ser futura"
    ),
  activo: z.boolean().optional(),
  tiene_fin_actividades: z.boolean().optional(),
  fin_actividades: z
    .string()
    .optional()
    .refine(
      (val) => !val || !isNaN(Date.parse(val)),
      "Fecha inválida"
    ),
});

// Additional refinement for tipo_documento and numero_documento relationship
export const locadorSchemaWithRefinement = locadorSchema
  .refine(
    (data) => {
      if (data.tipo_documento === "DNI") {
        return data.numero_documento.length === 8;
      } else if (data.tipo_documento === "CE") {
        return data.numero_documento.length === 9;
      }
      return true;
    },
    {
      message: "DNI debe tener 8 dígitos, CE debe tener 9 dígitos",
      path: ["numero_documento"],
    }
  )
  .refine(
    (data) => {
      // Si tiene_fin_actividades es true, fin_actividades debe estar presente y ser válida
      if (data.tiene_fin_actividades) {
        return data.fin_actividades && data.fin_actividades.trim().length > 0;
      }
      return true;
    },
    {
      message: "La fecha de fin de actividades es obligatoria cuando está activada",
      path: ["fin_actividades"],
    }
  )
  .refine(
    (data) => {
      // Si tiene_fin_actividades es true, fin_actividades debe ser posterior a inicio_actividades
      if (data.tiene_fin_actividades && data.fin_actividades) {
        // Agregar hora del mediodía para evitar problemas de zona horaria
        const fechaFin = new Date(data.fin_actividades + 'T12:00:00');
        const fechaInicio = new Date(data.inicio_actividades + 'T12:00:00');
        return fechaFin > fechaInicio;
      }
      return true;
    },
    {
      message: "La fecha de fin de actividades debe ser posterior al inicio de actividades",
      path: ["fin_actividades"],
    }
  );

// Document upload validation schema
export const documentoUploadSchema = z.object({
  tipoDocumento: z.string().min(1, "Seleccione un tipo de documento"),
  archivo: z
    .instanceof(File, { message: "Debe seleccionar un archivo" })
    .refine((file) => file.size <= 10 * 1024 * 1024, "El archivo no puede exceder 10MB")
    .refine(
      (file) => file.type === "application/pdf",
      "Solo se permiten archivos PDF"
    ),
  fechaVencimiento: z.string().optional(),
});

// Document upload with expiration validation
export const documentoUploadConVencimientoSchema = documentoUploadSchema.extend({
  fechaVencimiento: z
    .string()
    .min(1, "La fecha de vencimiento es obligatoria")
    .refine((val) => !isNaN(Date.parse(val)), "Fecha inválida")
    .refine(
      (val) => new Date(val) > new Date(),
      "La fecha de vencimiento debe ser futura"
    ),
});

// Configuration name validation schema
export const configNombreSchema = z.object({
  nombre: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio")
    .max(100, "El nombre no puede exceder 100 caracteres")
    .regex(
      /^[A-Za-zÁÉÍÓÚáéíóúÑñ0-9\s\-().,]+$/,
      "Contiene caracteres no permitidos"
    ),
});

// Denomination with ability requirement validation
export const denominacionSchema = configNombreSchema.extend({
  requiere_habilidad: z.boolean(),
});

export type LocadorFormData = z.infer<typeof locadorSchemaWithRefinement>;
export type DocumentoUploadData = z.infer<typeof documentoUploadSchema>;
export type DocumentoUploadConVencimientoData = z.infer<
  typeof documentoUploadConVencimientoSchema
>;
export type ConfigNombreData = z.infer<typeof configNombreSchema>;
export type DenominacionData = z.infer<typeof denominacionSchema>;
