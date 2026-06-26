import React, { useState, useEffect, useRef } from 'react'
import { exportarPDFPresupuesto, exportarExcelPresupuesto } from './exportInforme'

// ═══════════════════════════════════════════════════════════════════════
// DATOS DE GASTOS (Siigo Ene–May 2026) — embebidos para evitar imports cruzados
// ═══════════════════════════════════════════════════════════════════════

// (datos de gastos embebidos)
// ─────────────────────────────────────────────────────────────────────────
// GASTOS REALES · WELLcomm Spa & Hotel  (Operacion Wllmm SAS)
// Fuente: export contable Siigo · Enero–Mayo 2026 (cierre real)
// 127 cuentas con movimiento. Cuadre validado peso por peso:
//   ENE -291.074.276 · FEB -270.262.857 · MAR -277.576.289
//   ABR -267.637.287 · MAY -214.377.154 · TOTAL -1.320.927.865
// Valores en pesos (centavos truncados). Negativo = egreso; positivo = contra/ajuste.
// NOTA: Siigo es la fuente de COSTOS. Para INGRESOS rige Cloudbeds/Poster, no Siigo.
// ─────────────────────────────────────────────────────────────────────────

const MESES_GASTOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo'];
const MESES_CIERRE_GASTOS = 5; // Ene–May reales cargados

// Secciones (apartados) tal cual el informe, en orden de lectura de direccion.
const SECCIONES_GASTOS = [
  { id: 'NOMINA_ADMIN', nombre: 'Personal · Administracion', bloque: 'PERSONAL' },
  { id: 'NOMINA_OPER', nombre: 'Personal · Operacion', bloque: 'PERSONAL' },
  { id: 'NOMINA_COMERCIAL', nombre: 'Personal · Comercial', bloque: 'PERSONAL' },
  { id: 'HONORARIOS', nombre: 'Honorarios y asesorias', bloque: 'HONORARIOS' },
  { id: 'CANALES_OTAS', nombre: 'Comisiones OTAs y canales', bloque: 'OTAS' },
  { id: 'MARKETING', nombre: 'Marketing y comercial', bloque: 'MARKETING' },
  { id: 'SERVICIOS', nombre: 'Servicios publicos y generales', bloque: 'SERVICIOS' },
  { id: 'MANTENIMIENTO', nombre: 'Mantenimiento y adecuaciones', bloque: 'MANTENIMIENTO' },
  { id: 'IMPUESTOS', nombre: 'Impuestos, contribuciones y legales', bloque: 'ADMIN_FIN' },
  { id: 'SEGUROS', nombre: 'Seguros', bloque: 'ADMIN_FIN' },
  { id: 'OTROS_OPS', nombre: 'Otros gastos operativos', bloque: 'ADMIN_FIN' },
  { id: 'VIAJES', nombre: 'Viajes', bloque: 'ADMIN_FIN' },
  { id: 'FINANCIEROS', nombre: 'Gastos financieros y no operacionales', bloque: 'ADMIN_FIN' },
  { id: 'COSTOS_HAB', nombre: 'Costos directos · Habitaciones y experiencias', bloque: 'COSTOS' },
  { id: 'COSTOS_OPER', nombre: 'Costos directos · Insumos de operacion', bloque: 'COSTOS' },
];

// Bloques macro (para tarjetas resumen / graficas).
const BLOQUES_GASTOS = {
  PERSONAL: 'Personal y prestaciones',
  HONORARIOS: 'Honorarios y asesorias',
  OTAS: 'Comisiones OTAs y canales',
  MARKETING: 'Marketing y comercial',
  SERVICIOS: 'Servicios publicos y generales',
  MANTENIMIENTO: 'Mantenimiento y adecuaciones',
  ADMIN_FIN: 'Administracion, impuestos, seguros y financieros',
  COSTOS: 'Costos directos (insumos, lavanderia, A&B, amenities)',
};

// Detalle por cuenta. real = { enero, febrero, marzo, abril, mayo }
const GASTOS = [
  // ── Personal · Administracion ──
  { codigo: '51050601', nombre: 'Sueldos', seccion: 'NOMINA_ADMIN', real: { enero: -68278637, febrero: -65553007, marzo: -72083096, abril: -65467049, mayo: -48712667 } },
  { codigo: '51051501', nombre: 'Horas extras y recargos', seccion: 'NOMINA_ADMIN', real: { enero: -9169666, febrero: -6775120, marzo: -6907119, abril: -9352489, mayo: -7705514 } },
  { codigo: '51052401', nombre: 'Incapacidades', seccion: 'NOMINA_ADMIN', real: { enero: -133333, febrero: -822433, marzo: -561580, abril: -231426, mayo: -509100 } },
  { codigo: '51052701', nombre: 'Auxilio de transporte', seccion: 'NOMINA_ADMIN', real: { enero: -5928461, febrero: -5729185, marzo: -6202465, abril: -5779003, mayo: -5239298 } },
  { codigo: '51053001', nombre: 'Cesantias', seccion: 'NOMINA_ADMIN', real: { enero: -2187956, febrero: -1986566, marzo: -2426784, abril: -4564577, mayo: -734380 } },
  { codigo: '51053097', nombre: 'D. fiscal cesantias', seccion: 'NOMINA_ADMIN', real: { enero: 806304, febrero: 602483, marzo: 1026209, abril: 601791, mayo: 315173 } },
  { codigo: '51053301', nombre: 'Intereses sobre cesantias', seccion: 'NOMINA_ADMIN', real: { enero: -5174272, febrero: -166089, marzo: -168068, abril: -270738, mayo: -50304 } },
  { codigo: '51053601', nombre: 'Prima de servicios', seccion: 'NOMINA_ADMIN', real: { enero: -1381651, febrero: -1384082, marzo: -1400574, abril: -3962786, mayo: -419206 } },
  { codigo: '51053901', nombre: 'Vacaciones', seccion: 'NOMINA_ADMIN', real: { enero: -3533504, febrero: -4584329, marzo: -1037519, abril: -4419842, mayo: -4115514 } },
  { codigo: '51054801', nombre: 'Bonificaciones', seccion: 'NOMINA_ADMIN', real: { enero: -100000, febrero: -1851800, marzo: -3067050, abril: -10579892, mayo: -300000 } },
  { codigo: '51055101', nombre: 'Dotacion y suministro a trabajadores', seccion: 'NOMINA_ADMIN', real: { enero: 0, febrero: -234159, marzo: -108000, abril: -793000, mayo: 0 } },
  { codigo: '51056801', nombre: 'Aportes ARL', seccion: 'NOMINA_ADMIN', real: { enero: -181399, febrero: -188910, marzo: -192970, abril: -190190, mayo: -130330 } },
  { codigo: '51056901', nombre: 'Aportes EPS', seccion: 'NOMINA_ADMIN', real: { enero: -17509, febrero: -16341, marzo: -8754, abril: 0, mayo: 0 } },
  { codigo: '51057001', nombre: 'Aporte a fondos de pension y/o cesantias', seccion: 'NOMINA_ADMIN', real: { enero: -2000017, febrero: -2002330, marzo: -1994863, abril: -2052204, mayo: -546108 } },
  { codigo: '51057201', nombre: 'Aportes cajas de compensacion familiar', seccion: 'NOMINA_ADMIN', real: { enero: -644527, febrero: -641025, marzo: -648612, abril: -778516, mayo: -177367 } },
  { codigo: '51058401', nombre: 'Gastos medicos y drogas', seccion: 'NOMINA_ADMIN', real: { enero: -110000, febrero: -217002, marzo: -293000, abril: -814300, mayo: -641300 } },
  { codigo: '51059501', nombre: 'Bienestar y atencion a empleados', seccion: 'NOMINA_ADMIN', real: { enero: 0, febrero: -10487, marzo: -1197000, abril: -31600, mayo: 0 } },
  { codigo: '51059597', nombre: 'D. fiscal bienestar y atencion a empleados', seccion: 'NOMINA_ADMIN', real: { enero: 0, febrero: 0, marzo: 0, abril: -22950, mayo: 0 } },
  // ── Personal · Operacion ──
  { codigo: '72053001', nombre: 'Cesantias (Operacion)', seccion: 'NOMINA_OPER', real: { enero: -5788119, febrero: -5212227, marzo: -5429969, abril: -5331179, mayo: -5110373 } },
  { codigo: '72053301', nombre: 'Intereses sobre cesantias (Op)', seccion: 'NOMINA_OPER', real: { enero: -694574, febrero: -625467, marzo: -651596, abril: -639741, mayo: -613244 } },
  { codigo: '72053601', nombre: 'Prima de servicios (Op)', seccion: 'NOMINA_OPER', real: { enero: -5788119, febrero: -5212227, marzo: -5429969, abril: -5331179, mayo: -5110373 } },
  { codigo: '72053901', nombre: 'Vacaciones (Op)', seccion: 'NOMINA_OPER', real: { enero: -2609836, febrero: -2363894, marzo: -2458320, abril: -2325624, mayo: -2258947 } },
  { codigo: '72056001', nombre: 'Indemnizaciones laborales', seccion: 'NOMINA_OPER', real: { enero: 0, febrero: -3677777, marzo: -2560092, abril: -2054814, mayo: 0 } },
  { codigo: '72056801', nombre: 'Aportes ARL (Op)', seccion: 'NOMINA_OPER', real: { enero: -877911, febrero: -736906, marzo: -752072, abril: -628339, mayo: -543508 } },
  { codigo: '72056901', nombre: 'Aportes EPS (Op)', seccion: 'NOMINA_OPER', real: { enero: 0, febrero: -43752, marzo: -31813, abril: -7277, mayo: -2334 } },
  { codigo: '72057001', nombre: 'Aporte a fondos de pension (Op)', seccion: 'NOMINA_OPER', real: { enero: -7612789, febrero: -7391796, marzo: -7600831, abril: -7279171, mayo: -6192221 } },
  { codigo: '72057201', nombre: 'Aportes cajas de compensacion (Op)', seccion: 'NOMINA_OPER', real: { enero: -2555868, febrero: -2499586, marzo: -2535149, abril: -2434517, mayo: -2284448 } },
  // ── Personal · Comercial ──
  { codigo: '52050601', nombre: 'Sueldos (Comercial)', seccion: 'NOMINA_COMERCIAL', real: { enero: -10115050, febrero: -7232695, marzo: -12319437, abril: -7224391, mayo: -3783600 } },
  { codigo: '52053301', nombre: 'Intereses sobre cesantias (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -96756, febrero: -72298, marzo: -123145, abril: -72215, mayo: -37820 } },
  { codigo: '52053397', nombre: 'D. fiscal intereses sobre cesantias (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: 96756, febrero: 72298, marzo: 123145, abril: 72215, mayo: 37820 } },
  { codigo: '52053601', nombre: 'Prima de servicios (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -806304, febrero: -602483, marzo: -1026209, abril: -601791, mayo: -315173 } },
  { codigo: '52053697', nombre: 'D. fiscal prima de servicios (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: 806304, febrero: 602483, marzo: 1026209, abril: 601791, mayo: 315173 } },
  { codigo: '52053901', nombre: 'Vacaciones (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -394633, febrero: -291216, marzo: -503333, abril: -291216, mayo: -157776 } },
  { codigo: '52053997', nombre: 'D. fiscal vacaciones (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: 394633, febrero: 291216, marzo: 503333, abril: 291216, mayo: 157776 } },
  { codigo: '52055101', nombre: 'Dotacion y suministro (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -1447000, febrero: 0, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '52056801', nombre: 'Aportes ARL (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -53977, febrero: -56204, marzo: -56204, abril: -55647, mayo: -21067 } },
  { codigo: '52057001', nombre: 'Aporte a fondos de pension (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -1135637, febrero: -838032, marzo: -1448441, abril: -858378, mayo: -454032 } },
  { codigo: '52057201', nombre: 'Aportes cajas de compensacion (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -378545, febrero: -279344, marzo: -482813, abril: -309924, mayo: -151344 } },
  { codigo: '52058401', nombre: 'Gastos medicos y drogas (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -535700, febrero: -590700, marzo: -600700, abril: 0, mayo: 0 } },
  { codigo: '52059501', nombre: 'Bienestar y atencion a empleados (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -840000, febrero: 0, marzo: -56672, abril: -325600, mayo: -234800 } },
  { codigo: '52351001', nombre: 'Temporales (Com)', seccion: 'NOMINA_COMERCIAL', real: { enero: -677150, febrero: 0, marzo: 0, abril: 0, mayo: 0 } },
  // ── Honorarios y asesorias ──
  { codigo: '51102501', nombre: 'Honorarios - Asesoria juridica', seccion: 'HONORARIOS', real: { enero: -7420905, febrero: -3670000, marzo: -3670000, abril: -8922715, mayo: -1750905 } },
  { codigo: '51103502', nombre: 'Asesoria comercial', seccion: 'HONORARIOS', real: { enero: 0, febrero: 0, marzo: -1375000, abril: 0, mayo: -3208333 } },
  { codigo: '51103503', nombre: 'Asesoria SSGT y RRHH', seccion: 'HONORARIOS', real: { enero: -2600000, febrero: -2600000, marzo: -2600000, abril: -2600000, mayo: -2860000 } },
  { codigo: '51103504', nombre: 'Asesoria Spa', seccion: 'HONORARIOS', real: { enero: -3905796, febrero: -5137564, marzo: -3679712, abril: -4404740, mayo: -3040440 } },
  // ── Comisiones OTAs y canales ──
  { codigo: '51950501', nombre: 'Comisiones OTAS', seccion: 'CANALES_OTAS', real: { enero: -31903901, febrero: -37879145, marzo: -32719905, abril: -24407437, mayo: -21146560 } },
  // ── Marketing y comercial ──
  { codigo: '52356004', nombre: 'Marketing corporativo', seccion: 'MARKETING', real: { enero: -17031383, febrero: -16327008, marzo: -17341177, abril: -17251756, mayo: -16962483 } },
  { codigo: '52356007', nombre: 'Marketing relaciones e influenciadores', seccion: 'MARKETING', real: { enero: -2618000, febrero: -400000, marzo: -1968000, abril: -834000, mayo: -2984000 } },
  { codigo: '52953001', nombre: 'Utiles papeleria y fotocopias (Com)', seccion: 'MARKETING', real: { enero: -83806, febrero: 0, marzo: -23000, abril: -15042, mayo: 0 } },
  { codigo: '52959501', nombre: 'Atencion al cliente', seccion: 'MARKETING', real: { enero: -604022, febrero: -285883, marzo: -490150, abril: -129000, mayo: -39800 } },
  { codigo: '52959502', nombre: 'Alimentacion personal', seccion: 'MARKETING', real: { enero: 0, febrero: 0, marzo: 0, abril: -132000, mayo: 0 } },
  // ── Servicios publicos y generales ──
  { codigo: '51350501', nombre: 'Servicios de aseo y vigilancia', seccion: 'SERVICIOS', real: { enero: -471115, febrero: -506038, marzo: -181700, abril: -211700, mayo: -181700 } },
  { codigo: '51350502', nombre: 'Fumigacion', seccion: 'SERVICIOS', real: { enero: -579100, febrero: -665965, marzo: -665965, abril: 0, mayo: 0 } },
  { codigo: '51351001', nombre: 'Temporales', seccion: 'SERVICIOS', real: { enero: -290000, febrero: -380000, marzo: -300000, abril: -3206736, mayo: -2154042 } },
  { codigo: '51352001', nombre: 'Servicios - Procesamiento electronico de datos', seccion: 'SERVICIOS', real: { enero: -4439315, febrero: -6223382, marzo: -5107671, abril: -4626783, mayo: -8008562 } },
  { codigo: '51352002', nombre: 'Licencia programa contable (Siigo)', seccion: 'SERVICIOS', real: { enero: 0, febrero: 0, marzo: -1869900, abril: 0, mayo: 0 } },
  { codigo: '51352501', nombre: 'Servicios publicos - Acueducto', seccion: 'SERVICIOS', real: { enero: -4372888, febrero: -3797540, marzo: -3991379, abril: -3941553, mayo: -3536145 } },
  { codigo: '51352503', nombre: 'Servicios publicos - Tasa de aseo', seccion: 'SERVICIOS', real: { enero: -163783, febrero: -164412, marzo: -179897, abril: -182219, mayo: -183866 } },
  { codigo: '51353001', nombre: 'Servicios publicos - Energia electrica', seccion: 'SERVICIOS', real: { enero: -20463590, febrero: -19407938, marzo: -18368701, abril: -16403533, mayo: -14696499 } },
  { codigo: '51353002', nombre: 'Servicios publicos - Alumbrado publico', seccion: 'SERVICIOS', real: { enero: -603715, febrero: -604768, marzo: -635127, abril: -635380, mayo: -637930 } },
  { codigo: '51353003', nombre: 'Servicios publicos - Gas', seccion: 'SERVICIOS', real: { enero: -4473474, febrero: -3827010, marzo: 0, abril: -4463630, mayo: -3830736 } },
  { codigo: '51353503', nombre: 'Internet', seccion: 'SERVICIOS', real: { enero: -1270864, febrero: -1269102, marzo: -1270674, abril: -2871617, mayo: -2921463 } },
  { codigo: '51355001', nombre: 'Transporte fletes y acarreos', seccion: 'SERVICIOS', real: { enero: -25000, febrero: -44000, marzo: -263708, abril: -24000, mayo: -14000 } },
  { codigo: '51355501', nombre: 'Servicios publicos - Gas (II)', seccion: 'SERVICIOS', real: { enero: 0, febrero: 0, marzo: -4838884, abril: 0, mayo: 0 } },
  // ── Mantenimiento y adecuaciones ──
  { codigo: '51450101', nombre: 'Mantenimiento piscinas', seccion: 'MANTENIMIENTO', real: { enero: -6883258, febrero: -579723, marzo: -1719723, abril: -579723, mayo: -579723 } },
  { codigo: '51450102', nombre: 'Mantenimiento ascensores', seccion: 'MANTENIMIENTO', real: { enero: -554484, febrero: -554484, marzo: -554484, abril: -554484, mayo: -554484 } },
  { codigo: '51450103', nombre: 'Mantenimiento aire acondicionado', seccion: 'MANTENIMIENTO', real: { enero: -3787700, febrero: -1398000, marzo: -305000, abril: -884800, mayo: -345700 } },
  { codigo: '51450104', nombre: 'Mantenimiento motobombas', seccion: 'MANTENIMIENTO', real: { enero: -1614910, febrero: -514904, marzo: 0, abril: -4825000, mayo: -2300000 } },
  { codigo: '51450105', nombre: 'Mantenimiento cerraduras electronicas', seccion: 'MANTENIMIENTO', real: { enero: 0, febrero: 0, marzo: -140000, abril: -920800, mayo: 0 } },
  { codigo: '51451001', nombre: 'Mantenimientos - Construcciones y edificaciones', seccion: 'MANTENIMIENTO', real: { enero: -663065, febrero: -949621, marzo: 0, abril: -579245, mayo: -252016 } },
  { codigo: '51452001', nombre: 'Equipo de oficina', seccion: 'MANTENIMIENTO', real: { enero: -184873, febrero: -1046966, marzo: -378151, abril: -375294, mayo: 0 } },
  { codigo: '51452501', nombre: 'Mtto - Equipo de computacion y comunicacion', seccion: 'MANTENIMIENTO', real: { enero: -160000, febrero: -403363, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '51452502', nombre: 'Mtto cerraduras electronicas (II)', seccion: 'MANTENIMIENTO', real: { enero: -500000, febrero: 0, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '51454501', nombre: 'Gastos de ferreteria', seccion: 'MANTENIMIENTO', real: { enero: -466470, febrero: -628991, marzo: -379283, abril: -98571, mayo: -83431 } },
  { codigo: '51501001', nombre: 'Arreglos ornamentales', seccion: 'MANTENIMIENTO', real: { enero: -2558897, febrero: -1675898, marzo: -2950000, abril: 0, mayo: -240000 } },
  { codigo: '51501501', nombre: 'Reparaciones locativas', seccion: 'MANTENIMIENTO', real: { enero: 0, febrero: -21008, marzo: -390244, abril: 0, mayo: 0 } },
  // ── Impuestos, contribuciones y legales ──
  { codigo: '51150501', nombre: 'Industria y comercio (ICA)', seccion: 'IMPUESTOS', real: { enero: -2617245, febrero: -2438184, marzo: -2265016, abril: -1626164, mayo: -1386451 } },
  { codigo: '51151501', nombre: 'Impuesto predial', seccion: 'IMPUESTOS', real: { enero: 0, febrero: 0, marzo: -1478703, abril: -1478703, mayo: -1478703 } },
  { codigo: '51159506', nombre: 'Impuesto al consumo', seccion: 'IMPUESTOS', real: { enero: 0, febrero: -11703, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '51159508', nombre: 'AIU', seccion: 'IMPUESTOS', real: { enero: -43715, febrero: 0, marzo: 0, abril: -320673, mayo: -192404 } },
  { codigo: '512505', nombre: 'Contribuciones (Barrio Manila / Fontur)', seccion: 'IMPUESTOS', real: { enero: -1063730, febrero: -999780, marzo: -937934, abril: -838773, mayo: -624161 } },
  { codigo: '51251001', nombre: 'Afiliaciones y sostenimiento (Sayco Acinpro)', seccion: 'IMPUESTOS', real: { enero: 0, febrero: 0, marzo: 0, abril: -6360600, mayo: 0 } },
  { codigo: '51401001', nombre: 'Registro mercantil', seccion: 'IMPUESTOS', real: { enero: -12100, febrero: 0, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '51401501', nombre: 'Tramites y licencias', seccion: 'IMPUESTOS', real: { enero: 0, febrero: 0, marzo: 0, abril: 0, mayo: -12100 } },
  // ── Seguros ──
  { codigo: '51302501', nombre: 'Seguro todo riesgo', seccion: 'SEGUROS', real: { enero: 0, febrero: -3526258, marzo: -3526258, abril: -3526258, mayo: -3526258 } },
  // ── Otros gastos operativos ──
  { codigo: '51950502', nombre: 'Comisiones (Fiducia)', seccion: 'OTROS_OPS', real: { enero: -1750905, febrero: -1750905, marzo: -1750905, abril: -1750905, mayo: -1750905 } },
  { codigo: '5195100101', nombre: 'TV por suscripcion', seccion: 'OTROS_OPS', real: { enero: 0, febrero: 0, marzo: -99800, abril: 0, mayo: 0 } },
  { codigo: '51952001', nombre: 'Gastos de representacion y relaciones publicas', seccion: 'OTROS_OPS', real: { enero: -366450, febrero: -570227, marzo: -317060, abril: -495670, mayo: -236790 } },
  { codigo: '51952501', nombre: 'Elementos de aseo y cafeteria', seccion: 'OTROS_OPS', real: { enero: -1692820, febrero: -741433, marzo: -2480761, abril: -2049716, mayo: -2271756 } },
  { codigo: '51953001', nombre: 'Utiles papeleria', seccion: 'OTROS_OPS', real: { enero: -363798, febrero: -1257295, marzo: -592348, abril: -141763, mayo: -314031 } },
  { codigo: '51954501', nombre: 'Taxis y buses', seccion: 'OTROS_OPS', real: { enero: -377946, febrero: -228554, marzo: -84990, abril: -406502, mayo: -57100 } },
  { codigo: '51957001', nombre: 'Vajilla y cristaleria', seccion: 'OTROS_OPS', real: { enero: 0, febrero: 0, marzo: 0, abril: 0, mayo: -1957064 } },
  { codigo: '51959501', nombre: 'Interes de mora', seccion: 'OTROS_OPS', real: { enero: 185262, febrero: -48252, marzo: 0, abril: -11242, mayo: 0 } },
  { codigo: '51959502', nombre: 'Propinas', seccion: 'OTROS_OPS', real: { enero: 0, febrero: -5539, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '51959503', nombre: 'Interes corrientes', seccion: 'OTROS_OPS', real: { enero: -89374, febrero: -196847, marzo: -714659, abril: 278237, mayo: -205442 } },
  // ── Viajes ──
  { codigo: '51550501', nombre: 'Gastos de viaje - Alojamiento y manutencion', seccion: 'VIAJES', real: { enero: 0, febrero: -1648896, marzo: -475200, abril: 0, mayo: 0 } },
  { codigo: '51551501', nombre: 'Gastos de viaje - Pasajes aereos', seccion: 'VIAJES', real: { enero: 0, febrero: -396020, marzo: 0, abril: 0, mayo: 0 } },
  // ── Gastos financieros y no operacionales ──
  { codigo: '53051501', nombre: 'Comisiones bancarias', seccion: 'FINANCIEROS', real: { enero: -8291432, febrero: -7327177, marzo: -8943050, abril: -6352331, mayo: -5076246 } },
  { codigo: '53051502', nombre: 'Impuesto 4x1.000', seccion: 'FINANCIEROS', real: { enero: -697925, febrero: -3557, marzo: -767352, abril: -767352, mayo: -394953 } },
  { codigo: '53051503', nombre: 'Cuota de manejo', seccion: 'FINANCIEROS', real: { enero: -115072, febrero: -14900, marzo: -100343, abril: -89080, mayo: -89080 } },
  { codigo: '53051504', nombre: 'Impuesto 4x1.000 no deducible', seccion: 'FINANCIEROS', real: { enero: -692710, febrero: 0, marzo: -767352, abril: -499352, mayo: -394953 } },
  { codigo: '53052001', nombre: 'Intereses corrientes', seccion: 'FINANCIEROS', real: { enero: 0, febrero: -630921, marzo: 0, abril: -655251, mayo: 0 } },
  { codigo: '53052002', nombre: 'Intereses de mora', seccion: 'FINANCIEROS', real: { enero: 0, febrero: 291921, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '53052501', nombre: 'Diferencia en cambio', seccion: 'FINANCIEROS', real: { enero: -16962, febrero: 0, marzo: -54947, abril: -9049, mayo: 0 } },
  { codigo: '53053501', nombre: 'Descuentos comerciales condicionados', seccion: 'FINANCIEROS', real: { enero: -6982807, febrero: -654621, marzo: -1547167, abril: 0, mayo: 0 } },
  { codigo: '53152002', nombre: 'Otros impuestos asumidos', seccion: 'FINANCIEROS', real: { enero: 0, febrero: 0, marzo: -660000, abril: -18625, mayo: -120000 } },
  { codigo: '53952001', nombre: 'Multas sanciones y litigios', seccion: 'FINANCIEROS', real: { enero: 0, febrero: -1048000, marzo: -524000, abril: 0, mayo: 0 } },
  { codigo: '53958101', nombre: 'Ajuste al peso', seccion: 'FINANCIEROS', real: { enero: -10719, febrero: 185, marzo: 344, abril: -555, mayo: -15141 } },
  { codigo: '53958102', nombre: 'Ajuste al peso retencion en la fuente', seccion: 'FINANCIEROS', real: { enero: 0, febrero: -139, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '53959502', nombre: 'Gastos no deducibles', seccion: 'FINANCIEROS', real: { enero: 0, febrero: 0, marzo: -4008586, abril: 0, mayo: 0 } },
  // ── Costos directos · Habitaciones y experiencias ──
  { codigo: '61400501', nombre: 'Desayuno invitados', seccion: 'COSTOS_HAB', real: { enero: -12617636, febrero: -10265060, marzo: -6043680, abril: -4783494, mayo: -7548776 } },
  { codigo: '61400502', nombre: 'Alimentos y bebidas (transferencia OWS)', seccion: 'COSTOS_HAB', real: { enero: 19905780, febrero: 18982257, marzo: 25720101, abril: 19527676, mayo: 14438257 } },
  { codigo: '61400503', nombre: 'Experiencias Hotel', seccion: 'COSTOS_HAB', real: { enero: -150442, febrero: -108121, marzo: -332855, abril: -52873, mayo: 0 } },
  { codigo: '61703001', nombre: 'Servicio de musicalizacion - Brandtrack', seccion: 'COSTOS_HAB', real: { enero: -309510, febrero: -659510, marzo: -309510, abril: -309510, mayo: -309510 } },
  { codigo: '61703501', nombre: 'PMS', seccion: 'COSTOS_HAB', real: { enero: -976718, febrero: -713254, marzo: 0, abril: -293296, mayo: -736428 } },
  { codigo: '61705001', nombre: 'Lavanderia y similares', seccion: 'COSTOS_HAB', real: { enero: -9339154, febrero: -9320139, marzo: -8158500, abril: -3481200, mayo: -8713017 } },
  { codigo: '61705005', nombre: 'Lavado de alfombras y muebles', seccion: 'COSTOS_HAB', real: { enero: 0, febrero: 0, marzo: 0, abril: 0, mayo: -105000 } },
  { codigo: '61709505', nombre: 'Fumigacion (operacion)', seccion: 'COSTOS_HAB', real: { enero: 0, febrero: 0, marzo: 0, abril: -446407, mayo: -446407 } },
  // ── Costos directos · Insumos de operacion ──
  { codigo: '62050501', nombre: 'Lenceria y decoracion', seccion: 'COSTOS_OPER', real: { enero: 0, febrero: -1479779, marzo: -1551094, abril: -1729779, mayo: -2584181 } },
  { codigo: '62050502', nombre: 'Elementos aseo y cafeteria (Op)', seccion: 'COSTOS_OPER', real: { enero: -29159, febrero: 0, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '62050505', nombre: 'Muebles y enseres', seccion: 'COSTOS_OPER', real: { enero: 0, febrero: 0, marzo: 0, abril: -251933, mayo: 0 } },
  { codigo: '62050506', nombre: 'Amenities', seccion: 'COSTOS_OPER', real: { enero: -1256051, febrero: -124447, marzo: -6115463, abril: -260756, mayo: -29510 } },
  { codigo: '62050508', nombre: 'Elementos cafeteria', seccion: 'COSTOS_OPER', real: { enero: 0, febrero: -6000, marzo: 0, abril: 0, mayo: 0 } },
  { codigo: '62050509', nombre: 'Implementos de aseo', seccion: 'COSTOS_OPER', real: { enero: -760000, febrero: -561739, marzo: -58579, abril: 0, mayo: 0 } },
  { codigo: '62050510', nombre: 'Utiles, papeleria y fotocopias (Op)', seccion: 'COSTOS_OPER', real: { enero: -701700, febrero: 0, marzo: -279300, abril: -471900, mayo: 0 } },
  { codigo: '62050513', nombre: 'Minibar', seccion: 'COSTOS_OPER', real: { enero: 0, febrero: -3117075, marzo: 0, abril: -367152, mayo: 0 } },
  { codigo: '62451001', nombre: 'Mantenimiento y reparaciones (Op)', seccion: 'COSTOS_OPER', real: { enero: 0, febrero: -399159, marzo: -308539, abril: 0, mayo: 0 } },
];

// Cuentas del plan contable presentes en el informe pero SIN movimiento Ene–May.
// Se conservan para reflejar el catalogo completo (todos los apartados).
const CUENTAS_SIN_MOVIMIENTO = [
  { codigo: '5130300102', nombre: 'Seguros riesgo tecnologico' },
  { codigo: '513060', nombre: 'Equipo electronico' },
  { codigo: '51351501', nombre: 'Servicio tecnico' },
  { codigo: '51352502', nombre: 'Servicios publicos - Alcantarillado' },
  { codigo: '51353501', nombre: 'Servicios publicos - Telefono fijo' },
  { codigo: '51353502', nombre: 'Servicios publicos - Celular' },
  { codigo: '51359501', nombre: 'Otros' },
  { codigo: '51400501', nombre: 'Notariales' },
  { codigo: '51451501', nombre: 'Mantenimiento equipo de cocina' },
  { codigo: '51451503', nombre: 'Recarga de extintores' },
  { codigo: '51459905', nombre: 'Gastos Mtto y reparaciones Activacion Hotel' },
  { codigo: '51500501', nombre: 'Instalaciones electricas' },
  { codigo: '51509905', nombre: 'Gastos Adecuacion e instalacion' },
  { codigo: '51956001', nombre: 'Casino y restaurante' },
  { codigo: '51956501', nombre: 'Parqueaderos' },
  { codigo: '51959905', nombre: 'Gastos diversos Activacion Hotel' },
  { codigo: '52054801', nombre: 'Bonificaciones (Com)' },
  { codigo: '52054802', nombre: 'Bonos alimenticios personal' },
  { codigo: '52251001', nombre: 'Afiliaciones y sostenimiento (Com)' },
  { codigo: '52551501', nombre: 'Pasajes aereos comercial' },
  { codigo: '52950501', nombre: 'Comisiones (Com)' },
  { codigo: '61409501', nombre: 'Decoraciones' },
  { codigo: '61409502', nombre: 'Convenios transportes eventos' },
  { codigo: '61810101', nombre: 'Utilidades socios' },
  { codigo: '62050503', nombre: 'Insumos alimenticios' },
  { codigo: '62050504', nombre: 'Alcohol y bebidas' },
  { codigo: '62050507', nombre: 'Insumos lavanderia' },
  { codigo: '62050514', nombre: 'Otros AA&BB' },
  { codigo: '72050601', nombre: 'Sueldos (Op)' },
  { codigo: '72051501', nombre: 'Horas extras y recargos (Op)' },
  { codigo: '72052401', nombre: 'Incapacidades (Op)' },
  { codigo: '72052701', nombre: 'Auxilio de transporte (Op)' },
  { codigo: '72054801', nombre: 'Bonificaciones (Op)' },
  { codigo: '99999999', nombre: 'Saldos iniciales por conciliar' },
];

// ── Mapeo PROPUESTO a las bolsas del presupuesto del board (USALI) ──
// El board solo presupuesta gastos a nivel agregado; Siigo llega a nivel cuenta.
// Esta correspondencia permite comparar Real (Siigo) vs Presupuesto (pnl2026.js)
// en la vista Ppto 360. Ajustable. 'departamental' = ya neteado en la utilidad
// departamental (no es gasto no distribuido); 'financiero' = bajo EBITDA.
const MAPEO_PRESUPUESTO = {
  NOMINA_ADMIN:    'nd_admon',
  HONORARIOS:      'nd_admon',
  IMPUESTOS:       'nd_admon',
  SEGUROS:         'nd_admon',
  OTROS_OPS:       'nd_admon',
  VIAJES:          'nd_admon',
  NOMINA_COMERCIAL:'nd_mercadeo',
  MARKETING:       'nd_mercadeo',
  MANTENIMIENTO:   'nd_mtto',
  SERVICIOS:       'nd_mtto',     // incluye agua-luz-fuerza del board
  NOMINA_OPER:     'departamental',
  CANALES_OTAS:    'departamental',
  COSTOS_HAB:      'departamental',
  COSTOS_OPER:     'departamental',
  FINANCIEROS:     'financiero',
};

// ───────────────────────── Helpers ─────────────────────────

function realMes(cuenta, mes) {
  return (cuenta && cuenta.real && cuenta.real[mes]) || 0;
}

function totalCuenta(cuenta) {
  return MESES_GASTOS.reduce((s, m) => s + realMes(cuenta, m), 0);
}

function gastosDeSeccion(seccionId) {
  return GASTOS.filter((c) => c.seccion === seccionId);
}

function totalSeccionMes(seccionId, mes) {
  return gastosDeSeccion(seccionId).reduce((s, c) => s + realMes(c, mes), 0);
}

function totalSeccion(seccionId) {
  return gastosDeSeccion(seccionId).reduce((s, c) => s + totalCuenta(c), 0);
}

function totalBloqueMes(bloqueId, mes) {
  return SECCIONES_GASTOS
    .filter((s) => s.bloque === bloqueId)
    .reduce((sum, s) => sum + totalSeccionMes(s.id, mes), 0);
}

function totalBloque(bloqueId) {
  return MESES_GASTOS.reduce((s, m) => s + totalBloqueMes(bloqueId, m), 0);
}

function totalGeneralMes(mes) {
  return GASTOS.reduce((s, c) => s + realMes(c, mes), 0);
}

function acumulado() {
  return GASTOS.reduce((s, c) => s + totalCuenta(c), 0);
}

// Resumen por bloque (para tarjetas). Devuelve [{ bloque, nombre, meses:{}, total }]
function resumenBloques() {
  return Object.keys(BLOQUES_GASTOS).map((b) => {
    const meses = {};
    MESES_GASTOS.forEach((m) => (meses[m] = totalBloqueMes(b, m)));
    return { bloque: b, nombre: BLOQUES_GASTOS[b], meses, total: totalBloque(b) };
  });
}

// Resumen por seccion (para la vista Gastos detallada).
function resumenSecciones() {
  return SECCIONES_GASTOS.map((s) => {
    const meses = {};
    MESES_GASTOS.forEach((m) => (meses[m] = totalSeccionMes(s.id, m)));
    return {
      id: s.id, nombre: s.nombre, bloque: s.bloque, meses,
      total: totalSeccion(s.id), cuentas: gastosDeSeccion(s.id),
    };
  });
}

// Real agregado por bolsa de presupuesto (para Ppto 360).
function realPorBolsaPresupuesto(mes) {
  const out = { nd_admon: 0, nd_mercadeo: 0, nd_mtto: 0, departamental: 0, financiero: 0 };
  SECCIONES_GASTOS.forEach((s) => {
    const bolsa = MAPEO_PRESUPUESTO[s.id];
    if (bolsa) out[bolsa] += totalSeccionMes(s.id, mes);
  });
  return out;
}

// Objeto unico para servir desde el endpoint / consumir en el front.
function getGastos() {
  return {
    meses: MESES_GASTOS,
    mesesCierre: MESES_CIERRE_GASTOS,
    secciones: resumenSecciones(),
    bloques: resumenBloques(),
    sinMovimiento: CUENTAS_SIN_MOVIMIENTO,
    totalesMes: MESES_GASTOS.reduce((o, m) => ((o[m] = totalGeneralMes(m)), o), {}),
    granTotal: acumulado(),
  };
}



function fmt(n) {
  if (!n) return '$0'
  return `$${Math.round(n / 1000)}K`
}

function fmtCOP(n) {
  return `COP ${Number(n || 0).toLocaleString('es-CO')}`
}

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'tarifas', label: '💰 Tarifas' },
  { id: 'competencia', label: '🏆 Competencia' },
  { id: 'eventos', label: '📅 Eventos' },
  { id: 'presupuesto', label: '📈 Ppto vs Real' },
  { id: 'ppto360', label: '💎 Ppto 360' },
  { id: 'gastos', label: '🧾 Gastos' },
  { id: 'copilot', label: '🤖 Copilot' },
]

const COMPETENCIA_LISTA = [
  'Botánica Casa Hotel Manila',
  'Celestino Boutique Hotel & Spa',
  'Golden Valley Hotel',
  'Landmark Hotel',
  'Moabi Hotel',
  'Nomada Hotel Origen',
  'Sloh Hotel & Bar Manila',
  'The Host Medellin Adults Only',
  'The Somos Bold',
]

export default function RevenueManager({ onBack }) {
  const [tab, setTab] = useState('dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [habSeleccionada, setHabSeleccionada] = useState('estandar')
  const [preciosComp, setPreciosComp] = useState({})
  const [savingComp, setSavingComp] = useState(false)
  const [savedComp, setSavedComp] = useState(false)
  const [copilotMsgs, setCopilotMsgs] = useState([{
    role: 'assistant',
    text: '📊 Hola, soy tu Revenue Manager IA.\n\nTengo acceso en tiempo real a tu ocupación, ADR real de Cloudbeds, tarifas, competencia, eventos y presupuesto de Medellín.\n\n¿Qué analizamos hoy?'
  }])
  const [copilotInput, setCopilotInput] = useState('')
  const [copilotLoading, setCopilotLoading] = useState(false)
  const bottomRef = useRef(null)

  // Estado del presupuesto (habitaciones)
  const [pptoData, setPptoData] = useState(null)
  const [pptoLoading, setPptoLoading] = useState(false)
  const [pptoMes, setPptoMes] = useState(new Date().toISOString().slice(0, 7))

  // Estado del Ppto 360 (3 líneas)
  const [p360Data, setP360Data] = useState(null)
  const [p360Loading, setP360Loading] = useState(false)
  const [p360Mes, setP360Mes] = useState(new Date().toISOString().slice(0, 7))

  // Estado de Gastos (datos estáticos Siigo Ene–May, importados de api/gastos)
  const [gastosPeriodo, setGastosPeriodo] = useState('acum')
  const [gastosOpen, setGastosOpen] = useState(null)

  useEffect(() => { cargar() }, [])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [copilotMsgs])

  useEffect(() => {
    if (tab === 'presupuesto') cargarPresupuesto()
  }, [tab, pptoMes])

  useEffect(() => {
    if (tab === 'ppto360') cargarP360()
  }, [tab, p360Mes])

  async function cargar() {
    setLoading(true)
    try {
      const res = await fetch('/api/revenue?accion=dashboard')
      const d = await res.json()
      setData(d)
      const compInit = {}
      COMPETENCIA_LISTA.forEach(hotel => {
        compInit[hotel] = {
          precio: d.competencia?.[hotel]?.precio || 0,
          actualizado: d.competencia?.[hotel]?.actualizado || null,
          esManual: d.competencia?.[hotel]?.esManual || false,
          notas: d.competencia?.[hotel]?.notas || ''
        }
      })
      setPreciosComp(compInit)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  async function cargarPresupuesto() {
    setPptoLoading(true)
    try {
      const res = await fetch(`/api/revenue?accion=presupuesto&mes=${pptoMes}`)
      const d = await res.json()
      setPptoData(d)
    } catch (e) {
      console.error(e)
    } finally {
      setPptoLoading(false)
    }
  }

  async function cargarP360() {
    setP360Loading(true)
    try {
      const res = await fetch(`/api/revenue?accion=presupuesto_lineas&mes=${p360Mes}`)
      const d = await res.json()
      setP360Data(d)
    } catch (e) {
      console.error(e)
    } finally {
      setP360Loading(false)
    }
  }

  async function guardarCompetencia() {
    setSavingComp(true)
    try {
      await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'actualizar_competencia', precios: preciosComp })
      })
      setSavedComp(true)
      setTimeout(() => setSavedComp(false), 2000)
      await cargar()
    } finally {
      setSavingComp(false)
    }
  }

  async function enviarCopilot() {
    if (!copilotInput.trim() || copilotLoading) return
    const pregunta = copilotInput.trim()
    setCopilotMsgs(prev => [...prev, { role: 'user', text: pregunta }])
    setCopilotInput('')
    setCopilotLoading(true)
    try {
      const res = await fetch('/api/revenue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion: 'copilot', pregunta })
      })
      const d = await res.json()
      setCopilotMsgs(prev => [...prev, { role: 'assistant', text: d.respuesta }])
    } catch {
      setCopilotMsgs(prev => [...prev, { role: 'assistant', text: 'Error de conexión.' }])
    } finally {
      setCopilotLoading(false)
    }
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', color: 'var(--color-text-light)' }}>Cargando Revenue Manager...</div>
    </div>
  )

  const recHoy = data?.recomendaciones?.[habSeleccionada]?.[0]
  const hab = data?.habitaciones?.[habSeleccionada]
  const mediaComp = Object.values(data?.competencia || {}).reduce((sum, h) => sum + (h.precio || 0), 0) / Object.keys(data?.competencia || {}).length

  const fmtPct = (v) => `${Math.round((v || 0) * 100)}%`
  const colorCumplimiento = (pct) => pct >= 95 ? '#27ae60' : pct >= 80 ? '#e67e22' : '#e74c3c'
  const MESES_CORTO = ['', 'Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

  // ── Helpers Gastos ──
  const fmtGasto = (n) => {
    const abs = Math.abs(n || 0)
    const s = abs >= 1e6 ? `$${(abs / 1e6).toFixed(1).replace('.', ',')}M` : `$${Math.round(abs / 1000)}K`
    return (n || 0) > 0 ? `+${s}` : s
  }
  const gValSeccion = (id) => gastosPeriodo === 'acum' ? totalSeccion(id) : totalSeccionMes(id, gastosPeriodo)
  const gValBloque = (b) => gastosPeriodo === 'acum' ? totalBloque(b) : totalBloqueMes(b, gastosPeriodo)
  const gValCuenta = (c) => gastosPeriodo === 'acum' ? totalCuenta(c) : realMes(c, gastosPeriodo)
  const gTotalGen = gastosPeriodo === 'acum' ? acumulado() : totalGeneralMes(gastosPeriodo)
  const gBloques = Object.keys(BLOQUES_GASTOS)
    .map(b => ({ id: b, nombre: BLOQUES_GASTOS[b], val: gValBloque(b) }))
    .sort((a, b) => a.val - b.val)
  const gMaxAbs = Math.max(...gBloques.map(b => Math.abs(b.val)), 1)
  const GASTOS_PERIODOS = [
    { id: 'acum', label: 'Acum.' },
    { id: 'enero', label: 'Ene' },
    { id: 'febrero', label: 'Feb' },
    { id: 'marzo', label: 'Mar' },
    { id: 'abril', label: 'Abr' },
    { id: 'mayo', label: 'May' },
  ]

  return (
    <div style={{ minHeight: '100vh', background: 'var(--color-bg)', display: 'flex', flexDirection: 'column' }}>

      {/* Header */}
      <div style={{ background: 'var(--color-text)', color: 'white', padding: '1rem 1.5rem 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
          <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'white', fontSize: '1.2rem', cursor: 'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem', letterSpacing: '0.05em' }}>Revenue Manager</div>
            <div style={{ fontSize: '0.7rem', opacity: 0.6 }}>
              WELLCOMM · Occ. {data?.ocupacionActual}% · ADR {fmt(data?.adrReal)} · RevPAR {fmt(data?.revparReal)}
            </div>
          </div>
          <button onClick={cargar} style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: '20px', color: 'white', fontSize: '0.72rem', padding: '0.4rem 0.75rem', cursor: 'pointer' }}>↻</button>
        </div>
        <div style={{ display: 'flex', gap: '0.25rem', overflowX: 'auto', paddingBottom: '0' }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              background: tab === t.id ? 'white' : 'rgba(255,255,255,0.1)',
              color: tab === t.id ? 'var(--color-text)' : 'white',
              border: 'none', borderRadius: '8px 8px 0 0',
              padding: '0.5rem 0.75rem', fontSize: '0.68rem',
              cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
              fontWeight: tab === t.id ? 600 : 400
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <>
            {data?.alertas?.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {data.alertas.map((alerta, i) => (
                  <div key={i} style={{ background: `${alerta.color}15`, border: `1px solid ${alerta.color}`, borderRadius: 10, padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: 8, height: 8, borderRadius: '50%', background: alerta.color, flexShrink: 0 }} />
                    <div style={{ fontSize: '0.82rem', color: 'var(--color-text)', fontWeight: 500 }}>{alerta.mensaje}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
              {[
                { label: 'Ocupación', val: `${data?.ocupacionActual}%`, sub: `${data?.enCasa}/25 hab.`, color: data?.ocupacionActual >= 70 ? '#27ae60' : data?.ocupacionActual >= 50 ? '#e67e22' : '#e74c3c' },
                { label: 'ADR Real', val: fmt(data?.adrReal), sub: `Target $430K`, color: data?.adrReal >= 430000 ? '#27ae60' : '#e67e22' },
                { label: 'RevPAR', val: fmt(data?.revparReal), sub: `Target $301K`, color: data?.revparReal >= 301000 ? '#27ae60' : '#e67e22' },
                { label: 'On the Books', val: data?.reservasFuturas || 0, sub: 'Reservas futuras', color: 'var(--color-primary)' },
              ].map((k, i) => (
                <div key={i} style={{ background: 'white', borderRadius: 12, padding: '1rem', boxShadow: 'var(--shadow)', borderTop: `3px solid ${k.color}` }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', marginBottom: '0.25rem' }}>{k.label}</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 600, fontFamily: 'var(--font-display)', color: k.color }}>{k.val}</div>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{k.sub}</div>
                </div>
              ))}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>🏆 Posición vs Competencia</div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-text-light)' }}>Media mercado Manila</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 600 }}>{fmt(mediaComp)}</div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ fontSize: '0.78rem', color: 'var(--color-primary)', fontWeight: 600 }}>⭐ WELLcomm BAR Estándar</div>
                <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-primary)' }}>{fmt(480000)}</div>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-light)' }}>
                {mediaComp > 0 ? (
                  480000 > mediaComp
                    ? `▲ ${(((480000/mediaComp)-1)*100).toFixed(1)}% sobre la media — bien posicionado`
                    : `▼ ${(((mediaComp/480000)-1)*100).toFixed(1)}% bajo la media — revisar estrategia`
                ) : 'Actualiza precios de competencia para ver posición'}
              </div>
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>📊 Recomendaciones de hoy</div>
              {Object.entries(data?.recomendaciones || {}).map(([tipo, fechas]) => {
                const hoy = fechas[0]
                return (
                  <div key={tipo} onClick={() => { setHabSeleccionada(tipo); setTab('tarifas') }}
                    style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.6rem 0', borderBottom: '1px solid var(--color-border)', cursor: 'pointer' }}>
                    <div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{hoy.nombre}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)' }}>BAR actual: {fmt(hoy.barActual)}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: hoy.accionColor }}>{fmt(hoy.barRecomendado)}</div>
                      <div style={{ fontSize: '0.65rem', color: hoy.accionColor }}>{hoy.accionLabel}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            {data?.eventosProximos?.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>📅 Próximos eventos</div>
                {data.eventosProximos.slice(0, 3).map((ev, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 2 ? '1px solid var(--color-border)' : 'none' }}>
                    <div>
                      <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{ev.nombre}</div>
                      <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{ev.inicio} → {ev.fin}</div>
                    </div>
                    <div style={{ background: ev.tipo === 'mega' ? '#e74c3c' : ev.tipo === 'alto' ? '#e67e22' : '#f39c12', color: 'white', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.68rem', fontWeight: 600 }}>
                      +{Math.round((ev.factor - 1) * 100)}% demanda
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* TARIFAS */}
        {tab === 'tarifas' && (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
              {Object.entries(data?.habitaciones || {}).map(([tipo, h]) => {
                const rec = data?.recomendaciones?.[tipo]?.[0]
                return (
                  <button key={tipo} onClick={() => setHabSeleccionada(tipo)} style={{
                    background: habSeleccionada === tipo ? 'var(--color-text)' : 'white',
                    color: habSeleccionada === tipo ? 'white' : 'var(--color-text)',
                    border: `1px solid ${habSeleccionada === tipo ? 'var(--color-text)' : 'var(--color-border)'}`,
                    borderRadius: 10, padding: '0.75rem', cursor: 'pointer', textAlign: 'left'
                  }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 600 }}>{h.nombre}</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.7, marginTop: '0.15rem' }}>{h.cantidad} hab · {h.m2}m²</div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, marginTop: '0.25rem', color: habSeleccionada === tipo ? 'var(--color-primary)' : rec?.accionColor }}>
                      {fmt(rec?.barRecomendado)}
                    </div>
                  </button>
                )
              })}
            </div>

            {recHoy && hab && (
              <>
                <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.25rem' }}>BAR OBJETIVO</div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 300 }}>{hab.nombre}</div>
                  <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '1rem' }}>{hab.descripcion}</div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                    {[
                      { label: 'Mínimo', val: fmt(hab.minimo), color: '#e74c3c' },
                      { label: 'BAR Recomendado', val: fmt(recHoy.barRecomendado), color: 'var(--color-primary)' },
                      { label: 'Máximo', val: fmt(hab.maximo), color: '#27ae60' },
                    ].map((k, i) => (
                      <div key={i} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '1.1rem', fontWeight: 600, color: k.color }}>{k.val}</div>
                        <div style={{ fontSize: '0.62rem', color: '#888', marginTop: '0.15rem' }}>{k.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>🧠 Por qué esta tarifa</div>
                  {[
                    { label: 'Ocupación actual', val: recHoy.factores.ocupacion, desc: `${data?.ocupacionActual}%` },
                    { label: 'Fin de semana', val: recHoy.factores.finDeSemana, desc: recHoy.factores.finDeSemana > 0 ? 'Hoy es finde' : 'Día laboral' },
                    { label: 'Eventos', val: recHoy.factores.factorEvento, desc: recHoy.factores.eventos.length > 0 ? recHoy.factores.eventos.join(', ') : 'Sin eventos' },
                    { label: 'Competencia', val: recHoy.factores.competencia, desc: 'vs media mercado' },
                  ].map((f, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none' }}>
                      <div>
                        <div style={{ fontSize: '0.82rem' }}>{f.label}</div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)' }}>{f.desc}</div>
                      </div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600, color: f.val > 0 ? '#27ae60' : f.val < 0 ? '#e74c3c' : 'var(--color-text-light)' }}>
                        {f.val > 0 ? '+' : ''}{f.val}%
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>💡 Paridad — mismo precio, más valor según canal</div>
                  {Object.entries(recHoy.tarifasCanal).map(([key, canal], i) => (
                    <div key={key} style={{ padding: '0.75rem 0', borderBottom: i < Object.keys(recHoy.tarifasCanal).length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{canal.label}</div>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.25rem', marginTop: '0.3rem' }}>
                            {canal.beneficios.map((b, j) => (
                              <span key={j} style={{ fontSize: '0.62rem', background: 'var(--color-bg)', color: 'var(--color-text-light)', padding: '0.1rem 0.4rem', borderRadius: 10 }}>{b}</span>
                            ))}
                          </div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--color-text)', flexShrink: 0 }}>
                          {fmtCOP(canal.precio)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.9rem', marginBottom: '0.75rem' }}>📅 Próximos 7 días — {hab.nombre}</div>
                  {(data?.recomendaciones?.[habSeleccionada] || []).map((dia, i) => {
                    const d = new Date(dia.fecha + 'T12:00:00')
                    const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
                    return (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: i < 6 ? '1px solid var(--color-border)' : 'none' }}>
                        <div style={{ width: 60 }}>
                          <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{dias[d.getDay()]}</div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 500 }}>{d.getDate()}/{d.getMonth() + 1}</div>
                        </div>
                        <div style={{ flex: 1, margin: '0 0.75rem' }}>
                          {dia.factores.eventos.length > 0 && (
                            <div style={{ fontSize: '0.65rem', color: '#e67e22' }}>📅 {dia.factores.eventos[0]}</div>
                          )}
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '0.88rem', fontWeight: 600, color: dia.accionColor }}>{fmt(dia.barRecomendado)}</div>
                          <div style={{ fontSize: '0.62rem', color: dia.accionColor }}>{dia.diferencia > 0 ? '+' : ''}{dia.diferencia}%</div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </>
            )}
          </>
        )}

        {/* COMPETENCIA */}
        {tab === 'competencia' && (
          <>
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>📊 WELLcomm vs Competencia</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                Última actualización: {data?.ultimaActualizacion
                  ? new Date(data.ultimaActualizacion).toLocaleDateString('es-CO')
                  : 'Usando precios base investigados'}
              </div>

              {[
                { nombre: '⭐ WELLcomm', precio: 480000, esNosotros: true },
                ...COMPETENCIA_LISTA
                  .filter(h => preciosComp[h]?.precio > 0)
                  .map(h => ({ nombre: h.replace(' Hotel', '').replace(' Boutique', ''), precio: preciosComp[h].precio, esManual: preciosComp[h].esManual }))
                  .sort((a, b) => b.precio - a.precio)
              ].map((hotel, i) => {
                const maxP = Math.max(480000, ...COMPETENCIA_LISTA.map(h => preciosComp[h]?.precio || 0))
                const pct = Math.round((hotel.precio / maxP) * 100)
                return (
                  <div key={i} style={{ marginBottom: '0.75rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: hotel.esNosotros ? 700 : 400, color: hotel.esNosotros ? 'var(--color-primary)' : 'var(--color-text)' }}>
                        {hotel.nombre} {hotel.esManual ? '✏️' : ''}
                      </span>
                      <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>{fmt(hotel.precio)}</span>
                    </div>
                    <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 6 }}>
                      <div style={{ width: `${pct}%`, background: hotel.esNosotros ? 'var(--color-primary)' : '#cbd5e1', height: 6, borderRadius: 4 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>✏️ Actualizar precios</div>
              <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                Introduce los precios que ves en Booking.com hoy. El ✏️ indica precio actualizado manualmente.
              </div>

              {COMPETENCIA_LISTA.map((hotel, i) => (
                <div key={i} style={{ marginBottom: '0.75rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <div style={{ fontSize: '0.78rem', fontWeight: 500 }}>{hotel}</div>
                    {preciosComp[hotel]?.notas && (
                      <div style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>{preciosComp[hotel].notas}</div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', border: '1px solid var(--color-border)', borderRadius: 8, overflow: 'hidden' }}>
                    <span style={{ padding: '0.5rem 0.6rem', fontSize: '0.72rem', color: 'var(--color-text-light)', borderRight: '1px solid var(--color-border)', background: 'var(--color-bg)', whiteSpace: 'nowrap' }}>COP</span>
                    <input
                      type="number"
                      value={preciosComp[hotel]?.precio || ''}
                      onChange={e => setPreciosComp(prev => ({ ...prev, [hotel]: { ...prev[hotel], precio: Number(e.target.value), esManual: true, actualizado: new Date().toISOString() } }))}
                      placeholder={`Base: ${(data?.competencia?.[hotel]?.precio_base || 0).toLocaleString('es-CO')}`}
                      style={{ flex: 1, padding: '0.5rem 0.75rem', border: 'none', outline: 'none', fontSize: '0.88rem' }}
                    />
                  </div>
                </div>
              ))}

              <button onClick={guardarCompetencia} disabled={savingComp} style={{
                width: '100%', background: savedComp ? 'var(--color-primary)' : 'var(--color-text)',
                color: 'white', border: 'none', borderRadius: 10, padding: '0.875rem',
                fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', marginTop: '0.5rem'
              }}>
                {savingComp ? 'Guardando...' : savedComp ? '✅ Guardado' : 'Guardar precios competencia'}
              </button>
            </div>
          </>
        )}

        {/* EVENTOS */}
        {tab === 'eventos' && (
          <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>📅 Calendario de Demanda — Medellín 2026</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>Eventos que impactan la demanda hotelera</div>
            {[
              { nombre: 'Semana Santa', fechas: '29 Mar – 5 Abr', factor: 30, tipo: 'alto', accion: 'Activar BAR máximo. Mínimo 2 noches. Cerrar No Reembolsable.' },
              { nombre: 'Día de la Madre', fechas: '10–11 May', factor: 20, tipo: 'medio', accion: 'Subir 15–20% en finde. Activar paquetes románticos.' },
              { nombre: 'Festival Tango', fechas: '5–15 Jun', factor: 15, tipo: 'medio', accion: 'Subir 12% durante el evento. Apertura anticipada.' },
              { nombre: 'Colombiamoda', fechas: '22–24 Jul', factor: 25, tipo: 'alto', accion: 'BAR máximo. Mínimo 2 noches. Corporate disponible.' },
              { nombre: 'Feria de las Flores', fechas: '1–10 Ago', factor: 35, tipo: 'mega', accion: '🚨 BAR máximo TODOS. Mínimo 3 noches. Cerrar descuentos.' },
              { nombre: 'Festival Jazz', fechas: '25–30 Sep', factor: 20, tipo: 'alto', accion: 'BAR máximo finde. Paquetes culturales.' },
              { nombre: 'Navidad Medellín', fechas: '1–31 Dic', factor: 40, tipo: 'mega', accion: '🚨 Temporada alta. Estrategia de yield completa.' },
              { nombre: 'Año Nuevo', fechas: '30 Dic – 2 Ene', factor: 50, tipo: 'mega', accion: '🚨 Precio máximo absoluto. Mínimo 3 noches. Sin descuentos.' },
            ].map((ev, i) => {
              const colorTipo = ev.tipo === 'mega' ? '#e74c3c' : ev.tipo === 'alto' ? '#e67e22' : '#f39c12'
              return (
                <div key={i} style={{ padding: '0.875rem 0', borderBottom: i < 7 ? '1px solid var(--color-border)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.4rem' }}>
                    <div>
                      <div style={{ fontSize: '0.88rem', fontWeight: 600 }}>{ev.nombre}</div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>{ev.fechas}</div>
                    </div>
                    <div style={{ background: colorTipo, color: 'white', borderRadius: 20, padding: '0.2rem 0.6rem', fontSize: '0.7rem', fontWeight: 700, flexShrink: 0 }}>
                      +{ev.factor}% demanda
                    </div>
                  </div>
                  <div style={{ background: `${colorTipo}12`, borderRadius: 8, padding: '0.5rem 0.75rem', fontSize: '0.72rem', color: colorTipo, borderLeft: `3px solid ${colorTipo}` }}>
                    💡 {ev.accion}
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* PRESUPUESTO vs REAL (habitaciones) */}
        {tab === 'presupuesto' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Presupuesto vs Real · Habitaciones</div>
              <input type="month" value={pptoMes} onChange={e => setPptoMes(e.target.value)}
                style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
            </div>

            {!pptoLoading && pptoData?.cumplimiento && (
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => exportarPDFPresupuesto(pptoData, pptoMes)} style={{ flex: 1, background: 'var(--color-text)', color: 'white', border: 'none', borderRadius: 10, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar PDF</button>
                <button onClick={() => exportarExcelPresupuesto(pptoData, pptoMes)} style={{ flex: 1, background: 'white', color: 'var(--color-text)', border: '1px solid var(--color-border)', borderRadius: 10, padding: '0.6rem', fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer' }}>⬇ Exportar Excel</button>
              </div>
            )}

            {pptoLoading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>Calculando real desde Cloudbeds...</div>
            )}

            {!pptoLoading && pptoData?.cumplimiento && (
              <>
                <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    CUMPLIMIENTO · {pptoData.cumplimiento.mes.toUpperCase()} 2026
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 300, color: colorCumplimiento(pptoData.cumplimiento.cumplimientoVentas) }}>
                      {pptoData.cumplimiento.cumplimientoVentas}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>del presupuesto en ventas</div>
                  </div>
                  <div style={{ fontSize: '0.75rem', color: pptoData.cumplimiento.difVentas >= 0 ? 'var(--color-primary)' : '#e74c3c' }}>
                    {pptoData.cumplimiento.difVentas >= 0 ? '▲' : '▼'} {fmtCOP(Math.abs(pptoData.cumplimiento.difVentas))} {pptoData.cumplimiento.difVentas >= 0 ? 'sobre' : 'bajo'} lo presupuestado
                  </div>
                </div>

                <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: '0.5rem', fontSize: '0.7rem', color: 'var(--color-text-light)', fontWeight: 600, paddingBottom: '0.5rem', borderBottom: '2px solid var(--color-border)' }}>
                    <div>Métrica</div>
                    <div style={{ textAlign: 'right' }}>Presupuesto</div>
                    <div style={{ textAlign: 'right' }}>Real</div>
                    <div style={{ textAlign: 'right' }}>%</div>
                  </div>
                  {[
                    { label: 'Ventas alojamiento', ppto: fmtCOP(pptoData.cumplimiento.ppto.ventas), real: fmtCOP(pptoData.cumplimiento.real.ventas), pct: pptoData.cumplimiento.cumplimientoVentas },
                    { label: 'Habitaciones-noche', ppto: pptoData.cumplimiento.ppto.habVendidas, real: pptoData.cumplimiento.real.habVendidas, pct: pptoData.cumplimiento.cumplimientoHab },
                    { label: 'Tarifa media (ADR)', ppto: fmtCOP(pptoData.cumplimiento.ppto.tarifa), real: fmtCOP(pptoData.cumplimiento.real.tarifa), pct: pptoData.cumplimiento.cumplimientoTarifa },
                    { label: 'Ocupación', ppto: fmtPct(pptoData.cumplimiento.ppto.ocupacion), real: fmtPct(pptoData.cumplimiento.real.ocupacion), pct: pptoData.cumplimiento.ppto.ocupacion > 0 ? Math.round((pptoData.cumplimiento.real.ocupacion / pptoData.cumplimiento.ppto.ocupacion) * 100) : 0 },
                  ].map((row, i) => (
                    <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr 0.8fr', gap: '0.5rem', fontSize: '0.78rem', padding: '0.6rem 0', borderBottom: i < 3 ? '1px solid var(--color-border)' : 'none', alignItems: 'center' }}>
                      <div style={{ fontWeight: 500 }}>{row.label}</div>
                      <div style={{ textAlign: 'right', color: 'var(--color-text-light)' }}>{row.ppto}</div>
                      <div style={{ textAlign: 'right', fontWeight: 600 }}>{row.real}</div>
                      <div style={{ textAlign: 'right', fontWeight: 700, color: colorCumplimiento(row.pct) }}>{row.pct}%</div>
                    </div>
                  ))}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
                  El "real" se calcula en vivo desde Cloudbeds noche por noche. Puede tardar unos segundos.
                </div>
              </>
            )}

            {!pptoLoading && pptoData?.meses?.length > 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Presupuesto anual 2026</div>
                <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                  Total año: {fmtCOP(pptoData.totalPptoAnio)} · toca un mes para ver su detalle
                </div>
                {pptoData.meses.map((m, i) => {
                  const maxVentas = Math.max(...pptoData.meses.map(x => x.pptoVentas))
                  const pct = maxVentas > 0 ? Math.round((m.pptoVentas / maxVentas) * 100) : 0
                  const mesStr = `2026-${String(m.mesNumero).padStart(2, '0')}`
                  return (
                    <div key={i} onClick={() => setPptoMes(mesStr)} style={{ marginBottom: '0.6rem', cursor: 'pointer', opacity: m.esMesActual ? 1 : 0.85 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                        <span style={{ fontSize: '0.74rem', fontWeight: m.esMesActual ? 700 : 400, color: m.esMesActual ? 'var(--color-primary)' : 'var(--color-text)' }}>
                          {MESES_CORTO[m.mesNumero]} {m.esMesActual ? '←' : ''}
                        </span>
                        <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{fmt(m.pptoVentas)} · {fmtPct(m.pptoOcupacion)}</span>
                      </div>
                      <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 6 }}>
                        <div style={{ width: `${pct}%`, background: m.esMesActual ? 'var(--color-primary)' : '#cbd5e1', height: 6, borderRadius: 4 }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {!pptoLoading && !pptoData?.cumplimiento && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: 'var(--shadow)', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.82rem' }}>
                No hay presupuesto cargado para este mes. Verifica que la base de Notion esté conectada a la integración WELLcomm App.
              </div>
            )}
          </>
        )}

        {/* PPTO 360 — 3 líneas */}
        {tab === 'ppto360' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.1rem' }}>Ppto 360 · Líneas de negocio</div>
              <input type="month" value={p360Mes} onChange={e => setP360Mes(e.target.value)}
                style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: '0.4rem 0.6rem', fontSize: '0.8rem', fontFamily: 'var(--font-body)' }} />
            </div>

            {p360Loading && (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--color-text-light)' }}>Calculando ingresos del mes...</div>
            )}

            {!p360Loading && p360Data && (
              <>
                {/* Tarjeta total consolidado */}
                <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    INGRESOS TOTALES · {(p360Data.mes || '').toUpperCase()} 2026
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.4rem', fontWeight: 300, color: colorCumplimiento(p360Data.cumplimientoTotal) }}>
                      {p360Data.cumplimientoTotal}%
                    </div>
                    <div style={{ fontSize: '0.8rem', color: '#aaa' }}>del presupuesto consolidado</div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem' }}>
                    <span style={{ color: '#aaa' }}>Real: <strong style={{ color: 'white' }}>{fmtCOP(p360Data.totalReal)}</strong></span>
                    <span style={{ color: '#aaa' }}>Ppto: <strong style={{ color: 'white' }}>{fmtCOP(p360Data.totalPpto)}</strong></span>
                  </div>
                </div>

                {/* Tarjetas por línea */}
                {p360Data.lineas?.map((l, i) => {
                  const dif = l.real - l.ppto
                  return (
                    <div key={i} style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)', borderLeft: `4px solid ${colorCumplimiento(l.cumplimiento)}` }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                        <div>
                          <div style={{ fontSize: '0.92rem', fontWeight: 600 }}>{l.label}</div>
                          <div style={{ fontSize: '0.65rem', color: 'var(--color-text-light)' }}>{l.fuente}</div>
                        </div>
                        <div style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 600, color: colorCumplimiento(l.cumplimiento) }}>
                          {l.cumplimiento}%
                        </div>
                      </div>
                      <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 8, marginBottom: '0.75rem', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(l.cumplimiento, 100)}%`, background: colorCumplimiento(l.cumplimiento), height: 8, borderRadius: 4 }} />
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', fontSize: '0.72rem' }}>
                        <div>
                          <div style={{ color: 'var(--color-text-light)' }}>Presupuesto</div>
                          <div style={{ fontWeight: 600 }}>{fmt(l.ppto)}</div>
                        </div>
                        <div>
                          <div style={{ color: 'var(--color-text-light)' }}>Real</div>
                          <div style={{ fontWeight: 600 }}>{fmt(l.real)}</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ color: 'var(--color-text-light)' }}>Diferencia</div>
                          <div style={{ fontWeight: 700, color: dif >= 0 ? '#27ae60' : '#e74c3c' }}>{dif >= 0 ? '+' : '−'}{fmt(Math.abs(dif))}</div>
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Resumen anual consolidado */}
                {p360Data.anual?.length > 0 && (
                  <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Presupuesto anual consolidado 2026</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '1rem' }}>
                      Total año: {fmtCOP(p360Data.totalesAnio?.total)} · Hab {fmt(p360Data.totalesAnio?.habitaciones)} · A&B {fmt(p360Data.totalesAnio?.ab)} · Spa {fmt(p360Data.totalesAnio?.spa)}
                    </div>
                    {p360Data.anual.map((m, i) => {
                      const maxTotal = Math.max(...p360Data.anual.map(x => x.total))
                      const wH = maxTotal > 0 ? (m.habitaciones / maxTotal) * 100 : 0
                      const wA = maxTotal > 0 ? (m.ab / maxTotal) * 100 : 0
                      const wS = maxTotal > 0 ? (m.spa / maxTotal) * 100 : 0
                      const mesStr = `2026-${String(m.mesNumero).padStart(2, '0')}`
                      return (
                        <div key={i} onClick={() => setP360Mes(mesStr)} style={{ marginBottom: '0.6rem', cursor: 'pointer', opacity: m.esMesActual ? 1 : 0.9 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                            <span style={{ fontSize: '0.74rem', fontWeight: m.esMesActual ? 700 : 400, color: m.esMesActual ? 'var(--color-primary)' : 'var(--color-text)' }}>
                              {MESES_CORTO[m.mesNumero]} {m.esMesActual ? '←' : ''}
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: 600 }}>{fmt(m.total)}</span>
                          </div>
                          <div style={{ display: 'flex', background: 'var(--color-bg)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                            <div style={{ width: `${wH}%`, background: '#3498db', height: 8 }} title="Habitaciones" />
                            <div style={{ width: `${wA}%`, background: '#e67e22', height: 8 }} title="A&B" />
                            <div style={{ width: `${wS}%`, background: '#9b59b6', height: 8 }} title="Spa" />
                          </div>
                        </div>
                      )
                    })}
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.75rem', fontSize: '0.65rem', color: 'var(--color-text-light)' }}>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#3498db', borderRadius: 2, marginRight: 4 }} />Habitaciones</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#e67e22', borderRadius: 2, marginRight: 4 }} />A&B</span>
                      <span><span style={{ display: 'inline-block', width: 8, height: 8, background: '#9b59b6', borderRadius: 2, marginRight: 4 }} />Spa</span>
                    </div>
                  </div>
                )}

                <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
                  Habitaciones en vivo desde Cloudbeds · A&B y Spa desde los ingresos manuales del Portal del Propietario.
                </div>
              </>
            )}

            {!p360Loading && p360Data && p360Data.totalPpto === 0 && (
              <div style={{ background: 'white', borderRadius: 12, padding: '1.5rem', boxShadow: 'var(--shadow)', textAlign: 'center', color: 'var(--color-text-light)', fontSize: '0.82rem' }}>
                No hay presupuesto cargado. Verifica que las bases de A&B y Spa en Notion estén conectadas a la integración WELLcomm App.
              </div>
            )}
          </>
        )}

        {/* GASTOS */}
        {tab === 'gastos' && (
          <>
            {/* Selector de periodo */}
            <div style={{ display: 'flex', gap: '0.35rem', overflowX: 'auto', paddingBottom: '0.15rem' }}>
              {GASTOS_PERIODOS.map(p => (
                <button key={p.id} onClick={() => setGastosPeriodo(p.id)} style={{
                  background: gastosPeriodo === p.id ? 'var(--color-text)' : 'white',
                  color: gastosPeriodo === p.id ? 'white' : 'var(--color-text)',
                  border: `1px solid ${gastosPeriodo === p.id ? 'var(--color-text)' : 'var(--color-border)'}`,
                  borderRadius: 20, padding: '0.4rem 0.9rem', fontSize: '0.74rem',
                  cursor: 'pointer', whiteSpace: 'nowrap', flexShrink: 0,
                  fontWeight: gastosPeriodo === p.id ? 600 : 400
                }}>{p.label}</button>
              ))}
            </div>

            {/* Total del periodo */}
            <div style={{ background: 'var(--color-text)', borderRadius: 12, padding: '1.25rem', color: 'white' }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--color-primary)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                GASTOS TOTALES · {gastosPeriodo === 'acum' ? 'ENE–MAY 2026' : `${gastosPeriodo.toUpperCase()} 2026`}
              </div>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '2.2rem', fontWeight: 300 }}>{fmtGasto(gTotalGen)}</div>
              <div style={{ fontSize: '0.72rem', color: '#aaa', marginTop: '0.25rem' }}>
                {GASTOS.length} rubros contables · cierre real Siigo
              </div>
            </div>

            {/* Composición por bloque */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.75rem' }}>Composición del gasto</div>
              {gBloques.map(b => {
                const pct = Math.round((Math.abs(b.val) / Math.abs(gTotalGen || 1)) * 100)
                const w = Math.round((Math.abs(b.val) / gMaxAbs) * 100)
                return (
                  <div key={b.id} style={{ marginBottom: '0.85rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                      <span style={{ fontSize: '0.76rem', fontWeight: 500 }}>{b.nombre}</span>
                      <span style={{ fontSize: '0.74rem', fontWeight: 600, color: b.val > 0 ? '#27ae60' : 'var(--color-text)' }}>{fmtGasto(b.val)} · {pct}%</span>
                    </div>
                    <div style={{ background: 'var(--color-bg)', borderRadius: 4, height: 7 }}>
                      <div style={{ width: `${w}%`, background: b.val > 0 ? '#27ae60' : 'var(--color-primary)', height: 7, borderRadius: 4 }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* Detalle por rubro (apartados Siigo) */}
            <div style={{ background: 'white', borderRadius: 12, padding: '1.25rem', boxShadow: 'var(--shadow)' }}>
              <div style={{ fontFamily: 'var(--font-display)', fontSize: '0.95rem', marginBottom: '0.25rem' }}>Detalle por rubro</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', marginBottom: '0.5rem' }}>Toca un apartado para ver sus cuentas</div>
              {SECCIONES_GASTOS.map(s => {
                const abierto = gastosOpen === s.id
                const cuentas = gastosDeSeccion(s.id)
                const v = gValSeccion(s.id)
                return (
                  <div key={s.id} style={{ borderBottom: '1px solid var(--color-border)' }}>
                    <div onClick={() => setGastosOpen(abierto ? null : s.id)} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', cursor: 'pointer' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontSize: '0.6rem', color: 'var(--color-text-light)', display: 'inline-block', transform: abierto ? 'rotate(90deg)' : 'none', transition: 'transform .15s' }}>▶</span>
                        <span style={{ fontSize: '0.8rem', fontWeight: 500 }}>{s.nombre}</span>
                        <span style={{ fontSize: '0.62rem', color: 'var(--color-text-light)' }}>({cuentas.length})</span>
                      </div>
                      <span style={{ fontSize: '0.8rem', fontWeight: 600, color: v > 0 ? '#27ae60' : 'var(--color-text)' }}>{fmtGasto(v)}</span>
                    </div>
                    {abierto && (
                      <div style={{ paddingBottom: '0.5rem' }}>
                        {cuentas.map(c => {
                          const cv = gValCuenta(c)
                          return (
                            <div key={c.codigo} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.35rem 0 0.35rem 1.4rem', gap: '0.75rem' }}>
                              <span style={{ fontSize: '0.72rem', color: 'var(--color-text-light)' }}>
                                <span style={{ color: '#c4c4c4', marginRight: '0.4rem' }}>{c.codigo}</span>{c.nombre}
                              </span>
                              <span style={{ fontSize: '0.72rem', fontWeight: 500, flexShrink: 0, color: cv > 0 ? '#27ae60' : cv < 0 ? 'var(--color-text)' : '#ccc' }}>{cv === 0 ? '—' : fmtGasto(cv)}</span>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            <div style={{ fontSize: '0.68rem', color: 'var(--color-text-light)', textAlign: 'center' }}>
              Cierre real Siigo Ene–May 2026 · cuadra peso por peso con el informe contable. {CUENTAS_SIN_MOVIMIENTO.length} cuentas adicionales sin movimiento en el periodo.
            </div>
          </>
        )}

        {/* COPILOT */}
        {tab === 'copilot' && (
          <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
            <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.75rem', paddingBottom: '1rem' }}>
              {copilotMsgs.length === 1 && (
                <div>
                  <div style={{ fontSize: '0.7rem', color: 'var(--color-text-light)', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>PREGUNTAS FRECUENTES</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                    {[
                      '¿Cuál debería ser mi tarifa este fin de semana?',
                      '¿Voy bien respecto al presupuesto del mes?',
                      '¿Cuándo activar el BAR máximo?',
                      '¿Cómo mejorar el RevPAR este mes?',
                      'Analiza mi posición vs la competencia',
                      '¿Qué estrategia para la Feria de las Flores?',
                    ].map((q, i) => (
                      <button key={i} onClick={() => setCopilotInput(q)} style={{ background: 'white', border: '1px solid var(--color-border)', borderRadius: '20px', padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: 'var(--color-text)', cursor: 'pointer' }}>{q}</button>
                    ))}
                  </div>
                </div>
              )}

              {copilotMsgs.map((msg, i) => (
                <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
                  {msg.role === 'assistant' && (
                    <div style={{ width: 28, height: 28, background: 'var(--color-text)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', marginRight: '0.5rem', flexShrink: 0, marginTop: 2 }}>📊</div>
                  )}
                  <div style={{ maxWidth: '82%', background: msg.role === 'user' ? 'var(--color-text)' : 'white', color: msg.role === 'user' ? 'white' : 'var(--color-text)', borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', padding: '0.75rem 1rem', fontSize: '0.85rem', lineHeight: 1.6, boxShadow: 'var(--shadow)', whiteSpace: 'pre-wrap' }}>
                    {msg.text}
                  </div>
                </div>
              ))}

              {copilotLoading && (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, background: 'var(--color-text)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>📊</div>
                  <div style={{ background: 'white', borderRadius: '16px 16px 16px 4px', padding: '0.75rem 1rem', boxShadow: 'var(--shadow)', display: 'flex', gap: '4px', alignItems: 'center' }}>
                    {[0,1,2].map(i => <div key={i} style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-primary)', animation: `bounce 1s ${i * 0.2}s infinite` }} />)}
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div style={{ background: 'white', borderTop: '1px solid var(--color-border)', padding: '0.75rem', display: 'flex', gap: '0.5rem' }}>
              <input
                value={copilotInput}
                onChange={e => setCopilotInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarCopilot()}
                placeholder="Pregunta al Revenue Manager IA..."
                style={{ flex: 1, border: '1px solid var(--color-border)', borderRadius: '24px', padding: '0.75rem 1.25rem', fontSize: '0.85rem', outline: 'none', background: 'var(--color-bg)' }}
              />
              <button onClick={enviarCopilot} disabled={copilotLoading || !copilotInput.trim()} style={{ background: copilotInput.trim() ? 'var(--color-text)' : 'var(--color-border)', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: '1rem', flexShrink: 0 }}>→</button>
            </div>
          </div>
        )}

      </div>
      <style>{`@keyframes bounce { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-4px); } }`}</style>
    </div>
  )
}
