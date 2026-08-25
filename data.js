const STAGES = [
 {n:1,from:'Saint-Jean-Pied-de-Port',to:'Roncesvalles',km:24.2,h:'6–7 h',difficulty:'Alta',gain:1250},
 {n:2,from:'Roncesvalles',to:'Zubiri',km:21.4,h:'5–6 h',difficulty:'Media',gain:510},
 {n:3,from:'Zubiri',to:'Pamplona',km:20.4,h:'5 h',difficulty:'Media',gain:340},
 {n:4,from:'Pamplona',to:'Puente la Reina',km:24.0,h:'6 h',difficulty:'Media',gain:530},
 {n:5,from:'Puente la Reina',to:'Estella',km:22.0,h:'5–6 h',difficulty:'Media',gain:460},
 {n:6,from:'Estella',to:'Los Arcos',km:21.3,h:'5 h',difficulty:'Media',gain:420},
 {n:7,from:'Los Arcos',to:'Logroño',km:27.6,h:'6–7 h',difficulty:'Media',gain:360},
 {n:8,from:'Logroño',to:'Nájera',km:29.0,h:'7 h',difficulty:'Media',gain:470},
 {n:9,from:'Nájera',to:'Santo Domingo de la Calzada',km:21.0,h:'5 h',difficulty:'Baja',gain:310},
 {n:10,from:'Santo Domingo de la Calzada',to:'Belorado',km:22.7,h:'5–6 h',difficulty:'Baja',gain:280},
 {n:11,from:'Belorado',to:'San Juan de Ortega',km:24.0,h:'6 h',difficulty:'Media',gain:720},
 {n:12,from:'San Juan de Ortega',to:'Burgos',km:25.8,h:'6 h',difficulty:'Media',gain:250},
 {n:13,from:'Burgos',to:'Hornillos del Camino',km:21.0,h:'5 h',difficulty:'Baja',gain:260},
 {n:14,from:'Hornillos del Camino',to:'Castrojeriz',km:20.0,h:'5 h',difficulty:'Baja',gain:230},
 {n:15,from:'Castrojeriz',to:'Frómista',km:25.0,h:'6 h',difficulty:'Media',gain:360},
 {n:16,from:'Frómista',to:'Carrión de los Condes',km:19.0,h:'4–5 h',difficulty:'Baja',gain:120},
 {n:17,from:'Carrión de los Condes',to:'Terradillos de los Templarios',km:26.0,h:'6 h',difficulty:'Baja',gain:170},
 {n:18,from:'Terradillos de los Templarios',to:'El Burgo Ranero',km:30.0,h:'7 h',difficulty:'Media',gain:190},
 {n:19,from:'El Burgo Ranero',to:'Mansilla de las Mulas',km:19.0,h:'4–5 h',difficulty:'Baja',gain:100},
 {n:20,from:'Mansilla de las Mulas',to:'León',km:18.5,h:'4–5 h',difficulty:'Baja',gain:120},
 {n:21,from:'León',to:'San Martín del Camino',km:25.0,h:'6 h',difficulty:'Baja',gain:200},
 {n:22,from:'San Martín del Camino',to:'Astorga',km:24.0,h:'6 h',difficulty:'Media',gain:320},
 {n:23,from:'Astorga',to:'Foncebadón',km:25.8,h:'6–7 h',difficulty:'Media',gain:760},
 {n:24,from:'Foncebadón',to:'Ponferrada',km:26.8,h:'6–7 h',difficulty:'Alta',gain:290},
 {n:25,from:'Ponferrada',to:'Villafranca del Bierzo',km:24.0,h:'6 h',difficulty:'Media',gain:260},
 {n:26,from:'Villafranca del Bierzo',to:'O Cebreiro',km:28.0,h:'7–8 h',difficulty:'Alta',gain:1050},
 {n:27,from:'O Cebreiro',to:'Triacastela',km:21.0,h:'5–6 h',difficulty:'Media',gain:330},
 {n:28,from:'Triacastela',to:'Sarria',km:18.3,h:'4–5 h',difficulty:'Media',gain:430},
 {n:29,from:'Sarria',to:'Portomarín',km:22.0,h:'5–6 h',difficulty:'Media',gain:460},
 {n:30,from:'Portomarín',to:'Palas de Rei',km:25.0,h:'6 h',difficulty:'Media',gain:760, towns:['Portomarín','Gonzar','Ventas de Narón','Ligonde','Palas de Rei']},
 {n:31,from:'Palas de Rei',to:'Arzúa',km:29.0,h:'7 h',difficulty:'Media',gain:540},
 {n:32,from:'Arzúa',to:'O Pedrouzo',km:19.0,h:'4–5 h',difficulty:'Baja',gain:320},
 {n:33,from:'O Pedrouzo',to:'Santiago de Compostela',km:20.0,h:'5 h',difficulty:'Media',gain:390}
];

const STAGE30_SERVICES = [
 {id:'a1',type:'alojamiento',name:'Albergue público — ficha de ejemplo',sub:'Palas de Rei · Verificar disponibilidad',price:'€',phone:'',note:'Datos demostrativos: se sustituirán por fuentes oficiales/verificadas.'},
 {id:'a2',type:'alojamiento',name:'Pensión — ficha de ejemplo',sub:'Palas de Rei · Habitación',price:'€€',phone:'',note:'Precio orientativo, no precio en tiempo real.'},
 {id:'f1',type:'farmacia',name:'Farmacias cercanas',sub:'Búsqueda mediante OpenStreetMap al activar ubicación',price:'',phone:'',note:'Sin API de pago.'},
 {id:'s1',type:'salud',name:'Servicios sanitarios',sub:'Centro de salud / urgencias cercanas',price:'',phone:'112',note:'En una emergencia real, utiliza el 112.'},
 {id:'t1',type:'taxi',name:'Taxis locales',sub:'Directorio local pendiente de verificación',price:'',phone:'',note:'La base definitiva incluirá teléfonos verificados.'},
 {id:'p1',type:'policia',name:'Policía / Guardia Civil',sub:'Directorio oficial pendiente de carga',price:'',phone:'112',note:'Emergencias: 112.'},
 {id:'m1',type:'ayuntamiento',name:'Ayuntamiento',sub:'Palas de Rei · ficha institucional',price:'',phone:'',note:'Se enlazará a fuente municipal oficial.'}
];

const STAGE_COORDS = {
 30: {center:[42.925,-7.82], zoom:10, route:[[42.806,-7.616],[42.826,-7.670],[42.878,-7.772],[42.900,-7.837],[42.874,-7.868],[42.873,-7.868]]},
};
