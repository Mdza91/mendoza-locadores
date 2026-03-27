export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      cambios_pendientes_datos: {
        Row: {
          campo: string
          created_at: string
          estado: string
          fecha_resolucion: string | null
          fecha_solicitud: string
          id: string
          locador_id: string
          resuelto_por: string | null
          updated_at: string
          valor_actual: string
          valor_propuesto: string
        }
        Insert: {
          campo: string
          created_at?: string
          estado?: string
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          id?: string
          locador_id: string
          resuelto_por?: string | null
          updated_at?: string
          valor_actual: string
          valor_propuesto: string
        }
        Update: {
          campo?: string
          created_at?: string
          estado?: string
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          id?: string
          locador_id?: string
          resuelto_por?: string | null
          updated_at?: string
          valor_actual?: string
          valor_propuesto?: string
        }
        Relationships: [
          {
            foreignKeyName: "cambios_pendientes_datos_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      cambios_pendientes_documentos: {
        Row: {
          created_at: string
          documento_id: string | null
          estado: string
          fecha_resolucion: string | null
          fecha_solicitud: string
          fecha_vencimiento_nueva: string | null
          id: string
          locador_id: string
          nombre_archivo_nuevo: string
          peso_bytes_nuevo: number
          resuelto_por: string | null
          ruta_archivo_nuevo: string
          tipo_documento: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documento_id?: string | null
          estado?: string
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          fecha_vencimiento_nueva?: string | null
          id?: string
          locador_id: string
          nombre_archivo_nuevo: string
          peso_bytes_nuevo: number
          resuelto_por?: string | null
          ruta_archivo_nuevo: string
          tipo_documento: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documento_id?: string | null
          estado?: string
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          fecha_vencimiento_nueva?: string | null
          id?: string
          locador_id?: string
          nombre_archivo_nuevo?: string
          peso_bytes_nuevo?: number
          resuelto_por?: string | null
          ruta_archivo_nuevo?: string
          tipo_documento?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cambios_pendientes_documentos_documento_id_fkey"
            columns: ["documento_id"]
            isOneToOne: false
            referencedRelation: "documentos"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_pendientes_documentos_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      cambios_pendientes_emergencia: {
        Row: {
          created_at: string
          documento_emergencia_id: string | null
          documento_key: string
          es_reemplazo: boolean
          estado: string
          fecha_resolucion: string | null
          fecha_solicitud: string
          id: string
          locador_id: string
          nombre_archivo_nuevo: string
          nombre_documento: string
          peso_bytes_nuevo: number
          resuelto_por: string | null
          ruta_archivo_nuevo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documento_emergencia_id?: string | null
          documento_key: string
          es_reemplazo?: boolean
          estado?: string
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          id?: string
          locador_id: string
          nombre_archivo_nuevo: string
          nombre_documento: string
          peso_bytes_nuevo: number
          resuelto_por?: string | null
          ruta_archivo_nuevo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documento_emergencia_id?: string | null
          documento_key?: string
          es_reemplazo?: boolean
          estado?: string
          fecha_resolucion?: string | null
          fecha_solicitud?: string
          id?: string
          locador_id?: string
          nombre_archivo_nuevo?: string
          nombre_documento?: string
          peso_bytes_nuevo?: number
          resuelto_por?: string | null
          ruta_archivo_nuevo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cambios_pendientes_emergencia_documento_emergencia_id_fkey"
            columns: ["documento_emergencia_id"]
            isOneToOne: false
            referencedRelation: "documentos_emergencia"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cambios_pendientes_emergencia_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      config_app_settings: {
        Row: {
          created_at: string
          id: string
          logo_url: string | null
          nombre_app: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          logo_url?: string | null
          nombre_app?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          logo_url?: string | null
          nombre_app?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_avatars: {
        Row: {
          created_at: string
          es_default: boolean
          id: string
          nombre: string
          ruta_archivo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          es_default?: boolean
          id?: string
          nombre: string
          ruta_archivo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          es_default?: boolean
          id?: string
          nombre?: string
          ruta_archivo?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_documentos_emergencia: {
        Row: {
          created_at: string
          documento_key: string
          habilitado: boolean
          id: string
          nombre_display: string
          subtitulo: string
          texto_ayuda: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documento_key: string
          habilitado?: boolean
          id?: string
          nombre_display: string
          subtitulo?: string
          texto_ayuda?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documento_key?: string
          habilitado?: boolean
          id?: string
          nombre_display?: string
          subtitulo?: string
          texto_ayuda?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_documentos_visibles_locadores: {
        Row: {
          created_at: string
          id: string
          tipo_documento: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          tipo_documento: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          tipo_documento?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      config_global: {
        Row: {
          created_at: string
          distribucion_activa: string
          documentos_administrativos_activo: boolean
          id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          distribucion_activa?: string
          documentos_administrativos_activo?: boolean
          id?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          distribucion_activa?: string
          documentos_administrativos_activo?: boolean
          id?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_items_seccion_locadores: {
        Row: {
          created_at: string
          id: string
          item_key: string
          nombre_display: string
          orden: number
          seccion_id: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          item_key: string
          nombre_display: string
          orden?: number
          seccion_id: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          item_key?: string
          nombre_display?: string
          orden?: number
          seccion_id?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "config_items_seccion_locadores_seccion_id_fkey"
            columns: ["seccion_id"]
            isOneToOne: false
            referencedRelation: "config_secciones_visibles_locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      config_links_solicitud_documentos: {
        Row: {
          created_at: string
          habilitado: boolean | null
          id: string
          nombre_display: string
          tipo_documento: string
          updated_at: string
          url_solicitud: string | null
        }
        Insert: {
          created_at?: string
          habilitado?: boolean | null
          id?: string
          nombre_display: string
          tipo_documento: string
          updated_at?: string
          url_solicitud?: string | null
        }
        Update: {
          created_at?: string
          habilitado?: boolean | null
          id?: string
          nombre_display?: string
          tipo_documento?: string
          updated_at?: string
          url_solicitud?: string | null
        }
        Relationships: []
      }
      config_notificaciones: {
        Row: {
          activa: boolean
          created_at: string
          dias_anticipacion: number
          id: string
          tipo: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          created_at?: string
          dias_anticipacion?: number
          id?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          created_at?: string
          dias_anticipacion?: number
          id?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      config_ocultamiento_inactivos: {
        Row: {
          created_at: string
          id: string
          ocultar_inactivos: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          ocultar_inactivos?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          ocultar_inactivos?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      config_secciones_visibles_locadores: {
        Row: {
          created_at: string
          id: string
          nombre_display: string
          orden: number
          seccion: string
          updated_at: string
          visible: boolean
        }
        Insert: {
          created_at?: string
          id?: string
          nombre_display: string
          orden?: number
          seccion: string
          updated_at?: string
          visible?: boolean
        }
        Update: {
          created_at?: string
          id?: string
          nombre_display?: string
          orden?: number
          seccion?: string
          updated_at?: string
          visible?: boolean
        }
        Relationships: []
      }
      config_timeout_inactividad: {
        Row: {
          created_at: string
          habilitado: boolean
          habilitado_admin: boolean
          id: string
          minutos_inactividad: number
          minutos_inactividad_admin: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          habilitado?: boolean
          habilitado_admin?: boolean
          id?: string
          minutos_inactividad?: number
          minutos_inactividad_admin?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          habilitado?: boolean
          habilitado_admin?: boolean
          id?: string
          minutos_inactividad?: number
          minutos_inactividad_admin?: number
          updated_at?: string
        }
        Relationships: []
      }
      denominaciones: {
        Row: {
          created_at: string
          id: string
          nombre: string
          requiere_habilidad: boolean
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          requiere_habilidad?: boolean
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          requiere_habilidad?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      documentos: {
        Row: {
          created_at: string
          etapa: string
          fecha_subida: string
          fecha_vencimiento: string | null
          id: string
          locador_id: string
          nombre_archivo: string
          peso_bytes: number
          ruta_archivo: string
          tipo_original:
            | Database["public"]["Enums"]["documento_tipo_original"]
            | null
          tipo_pago: Database["public"]["Enums"]["documento_tipo_pago"] | null
        }
        Insert: {
          created_at?: string
          etapa?: string
          fecha_subida?: string
          fecha_vencimiento?: string | null
          id?: string
          locador_id: string
          nombre_archivo: string
          peso_bytes: number
          ruta_archivo: string
          tipo_original?:
            | Database["public"]["Enums"]["documento_tipo_original"]
            | null
          tipo_pago?: Database["public"]["Enums"]["documento_tipo_pago"] | null
        }
        Update: {
          created_at?: string
          etapa?: string
          fecha_subida?: string
          fecha_vencimiento?: string | null
          id?: string
          locador_id?: string
          nombre_archivo?: string
          peso_bytes?: number
          ruta_archivo?: string
          tipo_original?:
            | Database["public"]["Enums"]["documento_tipo_original"]
            | null
          tipo_pago?: Database["public"]["Enums"]["documento_tipo_pago"] | null
        }
        Relationships: [
          {
            foreignKeyName: "documentos_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_emergencia: {
        Row: {
          created_at: string
          documento_key: string
          fecha_subida: string
          id: string
          locador_id: string
          nombre_archivo: string
          peso_bytes: number
          ruta_archivo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          documento_key: string
          fecha_subida?: string
          id?: string
          locador_id: string
          nombre_archivo: string
          peso_bytes: number
          ruta_archivo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          documento_key?: string
          fecha_subida?: string
          id?: string
          locador_id?: string
          nombre_archivo?: string
          peso_bytes?: number
          ruta_archivo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_emergencia_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      documentos_generales: {
        Row: {
          created_at: string
          fecha_subida: string
          id: string
          meses_correspondientes: string[]
          nombre_archivo: string
          numero_entregables: number
          peso_bytes: number
          ruta_archivo: string
          tipo: Database["public"]["Enums"]["documento_general_tipo"] | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          fecha_subida?: string
          id?: string
          meses_correspondientes: string[]
          nombre_archivo: string
          numero_entregables: number
          peso_bytes: number
          ruta_archivo: string
          tipo?: Database["public"]["Enums"]["documento_general_tipo"] | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          fecha_subida?: string
          id?: string
          meses_correspondientes?: string[]
          nombre_archivo?: string
          numero_entregables?: number
          peso_bytes?: number
          ruta_archivo?: string
          tipo?: Database["public"]["Enums"]["documento_general_tipo"] | null
          updated_at?: string
        }
        Relationships: []
      }
      documentos_generales_por_denominacion: {
        Row: {
          created_at: string
          denominacion_id: string
          fecha_subida: string
          id: string
          meses_correspondientes: string[]
          nombre_archivo: string
          numero_entregables: number
          peso_bytes: number
          ruta_archivo: string
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          denominacion_id: string
          fecha_subida?: string
          id?: string
          meses_correspondientes: string[]
          nombre_archivo: string
          numero_entregables?: number
          peso_bytes: number
          ruta_archivo: string
          tipo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          denominacion_id?: string
          fecha_subida?: string
          id?: string
          meses_correspondientes?: string[]
          nombre_archivo?: string
          numero_entregables?: number
          peso_bytes?: number
          ruta_archivo?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "documentos_generales_por_denominacion_denominacion_id_fkey"
            columns: ["denominacion_id"]
            isOneToOne: false
            referencedRelation: "denominaciones"
            referencedColumns: ["id"]
          },
        ]
      }
      locador_funciones: {
        Row: {
          created_at: string
          descripcion: string
          id: string
          locador_id: string
          numero_orden: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          descripcion: string
          id?: string
          locador_id: string
          numero_orden: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          descripcion?: string
          id?: string
          locador_id?: string
          numero_orden?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "locador_funciones_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
        ]
      }
      locadores: {
        Row: {
          activo: boolean
          apellidos: string
          avatar_id: string | null
          banco: string
          cci: string
          celular: string
          correo: string
          created_at: string
          denominacion_id: string
          direccion: string
          fin_actividades: string | null
          id: string
          inicio_actividades: string
          nombres: string
          numero_documento: string
          remuneracion: number
          requiere_constancia: boolean
          ruc: string
          tiene_fin_actividades: boolean
          tipo_documento: string
          unidad_id: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          activo?: boolean
          apellidos: string
          avatar_id?: string | null
          banco: string
          cci: string
          celular: string
          correo: string
          created_at?: string
          denominacion_id: string
          direccion: string
          fin_actividades?: string | null
          id?: string
          inicio_actividades: string
          nombres: string
          numero_documento: string
          remuneracion: number
          requiere_constancia?: boolean
          ruc: string
          tiene_fin_actividades?: boolean
          tipo_documento: string
          unidad_id: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          activo?: boolean
          apellidos?: string
          avatar_id?: string | null
          banco?: string
          cci?: string
          celular?: string
          correo?: string
          created_at?: string
          denominacion_id?: string
          direccion?: string
          fin_actividades?: string | null
          id?: string
          inicio_actividades?: string
          nombres?: string
          numero_documento?: string
          remuneracion?: number
          requiere_constancia?: boolean
          ruc?: string
          tiene_fin_actividades?: boolean
          tipo_documento?: string
          unidad_id?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "locadores_avatar_id_fkey"
            columns: ["avatar_id"]
            isOneToOne: false
            referencedRelation: "config_avatars"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locadores_denominacion_id_fkey"
            columns: ["denominacion_id"]
            isOneToOne: false
            referencedRelation: "denominaciones"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "locadores_unidad_id_fkey"
            columns: ["unidad_id"]
            isOneToOne: false
            referencedRelation: "unidades"
            referencedColumns: ["id"]
          },
        ]
      }
      locadores_audit_log: {
        Row: {
          access_type: string
          accessed_at: string
          accessed_by: string
          id: string
          ip_address: string | null
          locador_id: string
          user_agent: string | null
        }
        Insert: {
          access_type: string
          accessed_at?: string
          accessed_by: string
          id?: string
          ip_address?: string | null
          locador_id: string
          user_agent?: string | null
        }
        Update: {
          access_type?: string
          accessed_at?: string
          accessed_by?: string
          id?: string
          ip_address?: string | null
          locador_id?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      notificaciones_admin: {
        Row: {
          activa: boolean
          contenido: string
          created_at: string
          created_by: string | null
          dirigida_a: string
          duracion_horas: number
          fecha_inicio: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          activa?: boolean
          contenido: string
          created_at?: string
          created_by?: string | null
          dirigida_a?: string
          duracion_horas?: number
          fecha_inicio?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          activa?: boolean
          contenido?: string
          created_at?: string
          created_by?: string | null
          dirigida_a?: string
          duracion_horas?: number
          fecha_inicio?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      planilla_locadores: {
        Row: {
          apellidos_snapshot: string | null
          created_at: string
          denominacion_nombre_snapshot: string | null
          fin_actividades_snapshot: string | null
          id: string
          inicio_actividades_snapshot: string | null
          locador_id: string
          nombres_snapshot: string | null
          planilla_id: string
          remuneracion_snapshot: number | null
          ruc_snapshot: string | null
          tiene_fin_actividades_snapshot: boolean | null
          unidad_nombre_snapshot: string | null
        }
        Insert: {
          apellidos_snapshot?: string | null
          created_at?: string
          denominacion_nombre_snapshot?: string | null
          fin_actividades_snapshot?: string | null
          id?: string
          inicio_actividades_snapshot?: string | null
          locador_id: string
          nombres_snapshot?: string | null
          planilla_id: string
          remuneracion_snapshot?: number | null
          ruc_snapshot?: string | null
          tiene_fin_actividades_snapshot?: boolean | null
          unidad_nombre_snapshot?: string | null
        }
        Update: {
          apellidos_snapshot?: string | null
          created_at?: string
          denominacion_nombre_snapshot?: string | null
          fin_actividades_snapshot?: string | null
          id?: string
          inicio_actividades_snapshot?: string | null
          locador_id?: string
          nombres_snapshot?: string | null
          planilla_id?: string
          remuneracion_snapshot?: number | null
          ruc_snapshot?: string | null
          tiene_fin_actividades_snapshot?: boolean | null
          unidad_nombre_snapshot?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "planilla_locadores_locador_id_fkey"
            columns: ["locador_id"]
            isOneToOne: false
            referencedRelation: "locadores"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "planilla_locadores_planilla_id_fkey"
            columns: ["planilla_id"]
            isOneToOne: false
            referencedRelation: "planillas"
            referencedColumns: ["id"]
          },
        ]
      }
      planillas: {
        Row: {
          costo_total: number
          created_at: string
          id: string
          meses_correspondientes: string[]
          nombre: string
          numero_entregables: number
          total_locadores: number
          updated_at: string
        }
        Insert: {
          costo_total?: number
          created_at?: string
          id?: string
          meses_correspondientes: string[]
          nombre: string
          numero_entregables: number
          total_locadores?: number
          updated_at?: string
        }
        Update: {
          costo_total?: number
          created_at?: string
          id?: string
          meses_correspondientes?: string[]
          nombre?: string
          numero_entregables?: number
          total_locadores?: number
          updated_at?: string
        }
        Relationships: []
      }
      plantillas_usuarios: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          nombre: string
          nombre_archivo: string
          peso_bytes: number
          ruta_archivo: string
          tipo_archivo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          nombre: string
          nombre_archivo: string
          peso_bytes: number
          ruta_archivo: string
          tipo_archivo: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          nombre?: string
          nombre_archivo?: string
          peso_bytes?: number
          ruta_archivo?: string
          tipo_archivo?: string
          updated_at?: string
        }
        Relationships: []
      }
      unidades: {
        Row: {
          created_at: string
          id: string
          nombre: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          nombre: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          nombre?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_hr_or_admin: { Args: { _user_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "hr_manager" | "user" | "locador"
      documento_general_tipo:
        | "requerimiento"
        | "informe_logistica"
        | "memo_oea"
        | "memo_oepe"
        | "anexo_03"
        | "anexo_04"
      documento_tipo_original:
        | "suspension_cuarta"
        | "rnp"
        | "consulta_ruc"
        | "consulta_servir"
        | "sancion_tce"
        | "cotizacion"
        | "declaracion_jurada"
        | "tdr"
        | "cv_documentado"
        | "habilidad_vigente"
        | "cci"
        | "constancia_estudios"
        | "constancia_estudios_sin_fedatear"
        | "dni_vigente"
        | "sustento_cv"
      documento_tipo_pago:
        | "anexo_03"
        | "anexo_04"
        | "ccp_logistica"
        | "ccp_oepe"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "hr_manager", "user", "locador"],
      documento_general_tipo: [
        "requerimiento",
        "informe_logistica",
        "memo_oea",
        "memo_oepe",
        "anexo_03",
        "anexo_04",
      ],
      documento_tipo_original: [
        "suspension_cuarta",
        "rnp",
        "consulta_ruc",
        "consulta_servir",
        "sancion_tce",
        "cotizacion",
        "declaracion_jurada",
        "tdr",
        "cv_documentado",
        "habilidad_vigente",
        "cci",
        "constancia_estudios",
        "constancia_estudios_sin_fedatear",
        "dni_vigente",
        "sustento_cv",
      ],
      documento_tipo_pago: [
        "anexo_03",
        "anexo_04",
        "ccp_logistica",
        "ccp_oepe",
      ],
    },
  },
} as const
