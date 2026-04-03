# Gyoza House — Firestore Schema
## Plano de base de datos en la nube

---

## Estructura general

```
gyoza-house/                        ← Proyecto Firebase
├── firestore/
│   ├── negocio/                    ← Configuración del local
│   ├── usuarios/                   ← Cuentas y roles
│   ├── productos/                  ← Menú e inventario
│   ├── ventas/                     ← Registro de ventas
│   ├── caja/                       ← Turnos de caja
│   ├── egresos/                    ← Gastos del turno
│   ├── insumos/                    ← Almacén
│   ├── recetas/                    ← Recetas por producto
│   ├── consumo/                    ← Log de movimientos de insumos
│   └── archivos/                   ← Históricos de temporadas cerradas
```

---

## Colecciones y documentos

---

### 1. `negocio` — Configuración del local
**Ruta:** `negocio/config`
Documento único. Guarda la configuración global del restaurante.

```json
{
  "nombre":    "Gyoza House",
  "tagline":   "Ramen · Gyozas · Comida Asiática",
  "ciudad":    "Medellín",
  "moneda":    "COP",
  "creadoEn":  "2024-01-01T00:00:00Z",
  "version":   1
}
```

**Quién puede leer:** todos los roles
**Quién puede escribir:** solo Admin/Programador

---

### 2. `usuarios` — Cuentas y roles
**Ruta:** `usuarios/{uid}`
Un documento por usuario. El `uid` lo genera Firebase Auth automáticamente.

```json
{
  "uid":       "abc123",
  "nombre":    "Miguel",
  "email":     "miguel@gyozahouse.com",
  "rol":       "admin",
  "activo":    true,
  "creadoEn":  "2024-01-01T00:00:00Z",
  "ultimoAcceso": "2024-03-15T14:30:00Z"
}
```

**Roles disponibles:**
| Rol | Descripción | Acceso |
|-----|-------------|--------|
| `dev` | Programador | Todo, incluyendo borrar datos y ver logs |
| `admin` | Administrador | Todo excepto borrar datos permanentemente |
| `cajero` | Trabajador | Ventas, insumos. Sin historial financiero |

**Quién puede leer:** cada usuario solo su propio documento. Admin y Dev pueden leer todos.
**Quién puede escribir:** solo Dev puede cambiar roles.

---

### 3. `productos` — Menú e inventario
**Ruta:** `productos/{productoId}`
Un documento por producto.

```json
{
  "id":        "prod_001",
  "nombre":    "Ramen Cerdo",
  "precio":    36000,
  "stock":     50,
  "cat":       "Ramen",
  "activo":    true,
  "creadoEn":  "2024-01-01T00:00:00Z",
  "editadoEn": "2024-03-15T10:00:00Z",
  "editadoPor":"uid_del_usuario"
}
```

**Quién puede leer:** todos los roles
**Quién puede escribir:** admin y dev

---

### 4. `ventas` — Registro de ventas
**Ruta:** `ventas/{ventaId}`
Un documento por venta. Es la colección más activa del sistema.

```json
{
  "id":       "v1710512345678",
  "fecha":    "2024-03-15",
  "hora":     "14:32",
  "items": [
    {
      "id":     1,
      "nombre": "Ramen Cerdo",
      "precio": 36000,
      "qty":    2
    }
  ],
  "total":    72000,
  "pago":     80000,
  "cambio":   8000,
  "cajeroId": "uid_del_cajero",
  "cajeroNombre": "Ana",
  "cajaId":   "cj1710500000000",
  "mesaNombre": "Mesa 1",
  "creadoEn": "2024-03-15T14:32:00Z"
}
```

**Quién puede leer:** admin y dev completo. Cajero solo puede leer las del turno actual.
**Quién puede escribir:** cajero (crear), admin y dev (editar/eliminar)

---

### 5. `caja` — Turnos de caja
**Ruta:** `caja/{cajaId}`
Un documento por turno (apertura → cierre).

```json
{
  "id":              "cj1710500000000",
  "cajero":          "Ana",
  "cajeroId":        "uid_del_cajero",
  "nota":            "Turno del sábado",
  "montoApertura":   100000,
  "fechaApertura":   "2024-03-15",
  "horaApertura":    "10:00",
  "estado":          "abierta",

  "fechaCierre":     null,
  "horaCierre":      null,
  "totalVentas":     null,
  "totalEgresos":    null,
  "transacciones":   null,
  "efectivoEsperado":null,
  "efectivoContado": null,
  "diferencia":      null,
  "notaCierre":      null,

  "creadoEn":        "2024-03-15T10:00:00Z",
  "cerradoEn":       null
}
```

> El campo `estado` puede ser `"abierta"` o `"cerrada"`.
> Esto reemplaza la variable `cajaAbierta` que antes vivía en memoria
> y se perdía al recargar. Ahora siempre está en la nube.

**Quién puede leer:** todos los roles
**Quién puede escribir:** cajero (abrir), admin y dev (cerrar/editar)

---

### 6. `egresos` — Gastos del turno
**Ruta:** `egresos/{egresoId}`
Un documento por egreso registrado.

```json
{
  "id":       "eg1710512000000",
  "cajaId":   "cj1710500000000",
  "fecha":    "2024-03-15",
  "hora":     "12:00",
  "monto":    15000,
  "cat":      "insumos",
  "desc":     "Compra caldo de cerdo",
  "cajero":   "Ana",
  "cajeroId": "uid_del_cajero",
  "creadoEn": "2024-03-15T12:00:00Z"
}
```

**Quién puede leer:** todos los roles
**Quién puede escribir:** cajero (crear), admin y dev (eliminar)

---

### 7. `insumos` — Almacén
**Ruta:** `insumos/{insumoId}`
Un documento por insumo.

```json
{
  "id":       "ins_001",
  "nombre":   "Caldo de cerdo",
  "unidad":   "L",
  "cat":      "Caldos",
  "stock":    12.5,
  "minimo":   3,
  "activo":   true,
  "creadoEn": "2024-01-01T00:00:00Z",
  "editadoEn":"2024-03-15T10:00:00Z"
}
```

**Quién puede leer:** todos los roles
**Quién puede escribir:** cajero y admin (ajustar stock), admin y dev (crear/eliminar)

---

### 8. `recetas` — Recetas por producto
**Ruta:** `recetas/{recetaId}`
Un documento por receta. Relaciona un producto con sus insumos.

```json
{
  "id":      "rec_001",
  "prodId":  "prod_001",
  "ingredientes": [
    { "insumoId": "ins_001", "cantidad": 0.5 },
    { "insumoId": "ins_002", "cantidad": 100 }
  ],
  "creadoEn":  "2024-01-01T00:00:00Z",
  "editadoEn": "2024-03-15T10:00:00Z"
}
```

**Quién puede leer:** todos los roles
**Quién puede escribir:** admin y dev

---

### 9. `consumo` — Log de movimientos de insumos
**Ruta:** `consumo/{logId}`
Un documento por movimiento. Es el historial de trazabilidad.

```json
{
  "id":       "log_001",
  "tipo":     "consumo",
  "fecha":    "2024-03-15",
  "hora":     "14:32",
  "desc":     "-0.5 L de Caldo de cerdo por 1× Ramen Cerdo",
  "insumoId": "ins_001",
  "ventaId":  "v1710512345678",
  "creadoEn": "2024-03-15T14:32:00Z"
}
```

> `tipo` puede ser `"consumo"`, `"entrada"` o `"ajuste"`

**Quién puede leer:** admin y dev
**Quién puede escribir:** sistema automático al registrar ventas

---

### 10. `archivos` — Históricos de temporadas
**Ruta:** `archivos/{archivoId}`
Se crea cuando un admin hace un "Reinicio de temporada".
Guarda un resumen compacto antes de limpiar los datos operativos.

```json
{
  "id":            "arch_001",
  "fechaInicio":   "2024-01-01",
  "fechaCierre":   "2024-03-31",
  "totalVentas":   45800000,
  "totalEgresos":  12300000,
  "transacciones": 847,
  "productosTop": [
    { "nombre": "Ramen Cerdo", "qty": 312, "total": 11232000 }
  ],
  "turnosTotal":   62,
  "creadoPor":     "uid_del_admin",
  "creadoEn":      "2024-03-31T23:59:00Z",
  "nota":          "Cierre Q1 2024"
}
```

**Quién puede leer:** admin y dev
**Quién puede escribir:** solo admin y dev

---

## Reglas de seguridad (resumen)

```
dev    → lee y escribe todo
admin  → lee todo, escribe todo excepto borrar archivos y cambiar roles
cajero → lee productos/insumos/recetas
         escribe ventas (crear) y egresos (crear)
         lee caja (solo turno actual)
```

---

## Decisiones de diseño importantes

**¿Por qué un documento por venta y no arrays?**
Firestore cobra por lectura de documento. Si las ventas vivieran en un array dentro de un documento, cada vez que se lee ese documento se leen TODAS las ventas. Con un documento por venta, solo se lee lo necesario. Más barato y más rápido.

**¿Por qué `estado` en la caja en lugar de `cajaAbierta` en memoria?**
Porque en memoria se pierde al recargar. En Firestore siempre está disponible desde cualquier dispositivo. Esto resuelve definitivamente el bug de la caja que hablamos.

**¿Por qué `archivos` en lugar de borrar todo?**
Para no perder el historial real. El reinicio de temporada deja un resumen permanente e irrecuperable antes de limpiar, para que siempre haya un registro contable.

---

## Próximo paso

Con este schema aprobado, el siguiente archivo a crear es:

**`firebase/config.js`** — Inicialización de Firebase y conexión a Firestore.
Luego **`firebase/auth.js`** — Login y manejo de roles.
Luego **`firebase/db.js`** — Las funciones que reemplazan `save()`, `saveInsumos()`, `saveCaja()` y `saveEgresos()` de `state.js`.
