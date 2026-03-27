// Utilidades para manejo de fechas


export const estaVencido = (fechaVencimiento: string | null): boolean => {
  if (!fechaVencimiento) return false;
  return new Date(fechaVencimiento) < new Date();
};

export const diasHastaVencimiento = (fechaVencimiento: string): number => {
  const hoy = new Date();
  const vencimiento = new Date(fechaVencimiento);
  const diff = vencimiento.getTime() - hoy.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
};

export const formatearFecha = (fecha: string): string => {
  // Tratar fechas (DATE de Postgres) como fechas locales para evitar desfases por zona horaria
  const [year, month, day] = fecha.split("T")[0].split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

export const formatearFechaCorta = (fecha: string): string => {
  const [year, month, day] = fecha.split("T")[0].split("-");
  const date = new Date(Number(year), Number(month) - 1, Number(day));

  return date.toLocaleDateString("es-PE", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
};

export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

export const formatearMeses = (meses: string[]): string => {
  if (meses.length === 0) return "";
  if (meses.length === 1) return meses[0];
  if (meses.length === 2) return `${meses[0]} y ${meses[1]}`;
  
  // Para 3 o más meses consecutivos, mostrar rango
  const indicesMeses = meses.map(mes => MESES.indexOf(mes));
  const consecutivos = indicesMeses.every((val, i, arr) => 
    i === 0 || val === arr[i - 1] + 1
  );
  
  if (consecutivos && meses.length >= 3) {
    return `${meses[0]} – ${meses[meses.length - 1]}`;
  }
  
  return meses.join(", ");
};

// Calcula el número de días en un mes específico
export const getDiasEnMes = (mes: string, año: number): number => {
  const mesIndex = MESES.indexOf(mes);
  if (mesIndex === -1) return 30; // Default
  
  // Crear fecha del primer día del mes siguiente y restar 1 día
  const fecha = new Date(año, mesIndex + 1, 0);
  return fecha.getDate();
};

// Calcula el prorrateo de días trabajados en un mes específico
export const calcularProrrateoDiasTrabajados = (
  mes: string,
  año: number,
  inicioActividades: string,
  finActividades: string | null,
  tieneFinActividades: boolean
): number => {
  const mesIndex = MESES.indexOf(mes);
  if (mesIndex === -1) return 1; // Si el mes no es válido, retornar factor 1
  
  const diasDelMes = getDiasEnMes(mes, año);
  const primerDiaMes = new Date(año, mesIndex, 1);
  const ultimoDiaMes = new Date(año, mesIndex, diasDelMes);
  
  // Agregar hora del mediodía para evitar problemas de zona horaria
  const inicioDate = new Date(inicioActividades + 'T12:00:00');
  const finDate = tieneFinActividades && finActividades ? new Date(finActividades + 'T12:00:00') : null;
  
  // Determinar el día de inicio efectivo en el mes
  let diaInicioEfectivo = 1;
  if (inicioDate > primerDiaMes) {
    // Si inició después del primer día del mes
    if (inicioDate.getMonth() === mesIndex && inicioDate.getFullYear() === año) {
      diaInicioEfectivo = inicioDate.getDate();
    } else if (inicioDate > ultimoDiaMes) {
      // No trabajó en este mes
      return 0;
    }
  }
  
  // Determinar el día de fin efectivo en el mes
  let diaFinEfectivo = diasDelMes;
  if (finDate) {
    if (finDate < primerDiaMes) {
      // Ya había terminado antes de este mes
      return 0;
    }
    if (finDate.getMonth() === mesIndex && finDate.getFullYear() === año) {
      diaFinEfectivo = finDate.getDate();
    }
  }
  
  // Calcular días trabajados
  const diasTrabajados = Math.max(0, diaFinEfectivo - diaInicioEfectivo + 1);
  
  // Retornar el factor de prorrateo
  return diasTrabajados / diasDelMes;
};

// Calcula el sueldo prorrateado basado en días trabajados
export const calcularSueldoProrrateado = (
  sueldoBase: number,
  mes: string,
  año: number,
  inicioActividades: string,
  finActividades: string | null,
  tieneFinActividades: boolean
): number => {
  const factorProrrateo = calcularProrrateoDiasTrabajados(
    mes,
    año,
    inicioActividades,
    finActividades,
    tieneFinActividades
  );
  
  const sueldoProrrateado = sueldoBase * factorProrrateo;
  
  // Redondear a 1 decimal
  return Math.round(sueldoProrrateado * 10) / 10;
};
