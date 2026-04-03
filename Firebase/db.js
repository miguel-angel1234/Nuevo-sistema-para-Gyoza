/* ═══════════════════════════════════════════════
   GYOZA HOUSE — firebase/db.js
   Placeholder para la integración con Firebase.

   Cuando llegue el momento de migrar, este archivo
   reemplaza las funciones save(), saveInsumos(),
   saveCaja() y saveEgresos() de state.js.

   PASOS PARA MIGRAR:
   1. Instalar Firebase: npm install firebase
   2. Crear proyecto en https://console.firebase.google.com
   3. Activar Firestore Database en modo producción
   4. Copiar la config de tu proyecto aquí abajo
   5. Reemplazar las funciones de persistencia

   ─────────────────────────────────────────────
   EJEMPLO DE INTEGRACIÓN FUTURA:
   ─────────────────────────────────────────────

   import { initializeApp } from "firebase/app";
   import { getFirestore, doc, setDoc, getDoc, collection, getDocs } from "firebase/firestore";

   const firebaseConfig = {
     apiKey:            "TU_API_KEY",
     authDomain:        "tu-proyecto.firebaseapp.com",
     projectId:         "tu-proyecto",
     storageBucket:     "tu-proyecto.appspot.com",
     messagingSenderId: "TU_SENDER_ID",
     appId:             "TU_APP_ID"
   };

   const app = initializeApp(firebaseConfig);
   const db  = getFirestore(app);

   // Reemplazar save() de state.js:
   async function save() {
     await setDoc(doc(db, "tienda", "prods"),  { data: prods  });
     await setDoc(doc(db, "tienda", "ventas"), { data: ventas });
   }

   // Reemplazar saveInsumos() de state.js:
   async function saveInsumos() {
     await setDoc(doc(db, "tienda", "insumos"),  { data: insumos    });
     await setDoc(doc(db, "tienda", "recetas"),  { data: recetas    });
     await setDoc(doc(db, "tienda", "consumo"),  { data: consumoLog });
   }

   // Reemplazar saveCaja() de state.js:
   async function saveCaja() {
     await setDoc(doc(db, "caja", "actual"),    { data: cajaActual    });
     await setDoc(doc(db, "caja", "historial"), { data: cajaHistorial });
   }

   // Reemplazar saveEgresos() de state.js:
   async function saveEgresos() {
     await setDoc(doc(db, "caja", "egresos"), { data: egresos });
   }

   ═══════════════════════════════════════════════ */

// Este archivo está vacío intencionalmente.
// La persistencia actual vive en js/state.js usando localStorage.
