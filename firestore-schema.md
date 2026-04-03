# Gyoza House — Firestore Schema (v2)
## Plano de base de datos en la nube

---

## Autenticación

- Firebase Authentication con email y contraseña.
- Usuario permitido en frontend: `gyozahouseadmin@gmail.com`
- La contraseña se administra directamente desde Firebase Console.
- No se almacena la contraseña dentro del proyecto.

---

## Estructura general implementada

```text
gyoza-house/                        ← Proyecto Firebase
├── firestore/
│   └── app_state/
│       ├── products               ← catálogo y stock de productos
│       ├── sales                  ← ventas históricas
│       ├── supplies               ← insumos
│       ├── recipes                ← recetas por producto
│       ├── inventory_movements    ← consumo / entradas / ajustes
│       ├── cash_current           ← caja abierta actual
│       ├── cash_history           ← cierres históricos de caja
│       ├── expenses               ← egresos / gastos
│       ├── suppliers              ← proveedores
│       ├── supplier_purchases     ← compras a proveedores
│       ├── supplier_payments      ← pagos / abonos / adelantos
│       └── metadata               ← versión, seed inicial y referencia de esquema