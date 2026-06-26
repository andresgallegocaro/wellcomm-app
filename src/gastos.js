// src/gastos.js
// ─────────────────────────────────────────────────────────────────────────
// GASTOS REALES · WELLcomm Spa & Hotel  (Operacion Wllmm SAS)
// Fuente: export contable Siigo · Enero–Mayo 2026 (cierre real)
// 127 cuentas con movimiento. Cuadre validado peso por peso:
//   ENE -291.074.276 · FEB -270.262.857 · MAR -277.576.289
//   ABR -267.637.287 · MAY -214.377.154 · TOTAL -1.320.927.865
// Valores en pesos (centavos truncados). Negativo = egreso; positivo = contra/ajuste.
// NOTA: Siigo es la fuente de COSTOS. Para INGRESOS rige Cloudbeds/Poster, no Siigo.
// ─────────────────────────────────────────────────────────────────────────

export const MESES_GASTOS = ['enero', 'febrero', 'marzo', 'abril', 'mayo'];
export const MESES_CIERRE_GASTOS = 5; // Ene–May reales cargados

// Secciones (apartados) tal cual el informe, en orden de lectura de direccion.
export const SECCIONES_GASTOS = [
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
export const BLOQUES_GASTOS = {
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
export const GASTOS = [
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
