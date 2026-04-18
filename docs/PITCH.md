# Aforo — Pitch (3 min)

> Monad Blitz Monterrey · 18 de abril 2026

---

## Slide 1 — Hook (~30 seg)

# Aforo
## Le adelantamos la lana a tu negocio.

---

**Imagínate a tu tío.**

Tiene un lote de autos en Monterrey. Esta mañana vendió un Audi Q5 en **un millón y tanto de pesos**. El cliente lo va a pagar con préstamo del banco. El carro ya salió del lote.

Pero tu tío **no tiene el millón todavía** — y no lo va a tener hasta dentro de **tres o cuatro semanas**, cuando el banco por fin suelte la lana.

Mientras tanto, no puede comprar el siguiente carro. Su propio dinero está atorado.

---

## Slide 2 — El problema es grande (~30 seg)

# El dolor es de cualquier negocio que vende a plazos

- Lotes de autos
- Dentistas que venden equipo a plazos
- Maquinaria agrícola
- Motos
- Contratos de servicio mensual

**7 de cada 10 negocios chicos en México no tienen crédito rápido.**

No porque no lo merezcan — sino porque a los bancos no les conviene hacer préstamos de $50,000 pesos. El papeleo les cuesta más de lo que les deja.

> **Hay un hueco de $5 billones de pesos** en crédito para pequeñas y medianas empresas en México. (Fuente: Banco Mundial)

---

## Slide 3 — La solución (~60 seg)

# Nosotros le damos su dinero hoy

### Cómo funciona, en 4 pasos:

1. **El negocio** registra su venta ya cerrada (el derecho a cobrar lo que le van a pagar).
2. **Un grupo de prestamistas** compra ese derecho a cobrar, con un pequeño descuento (ej. 3%).
3. **El negocio recibe su dinero al instante** — menos el descuento.
4. **Cuando el banco paga** en tres semanas, los prestamistas recuperan su dinero con ganancia.

### Todo lo hace un programa de computadora (en Monad) que:
- Guarda el dinero hasta que se cumplen las reglas pactadas.
- No deja que nadie se quede con lana que no le toca.
- Está a la vista de todos — auditable, transparente.

---

## Slide 4 — ¿Cómo hacemos dinero? (~15 seg)

**0.5% de fee sobre cada operación.**

Los prestamistas ganan el descuento (2–4% típico). El negocio gana tiempo y liquidez. Nosotros cobramos medio punto por hacer que todo cuadre.

---

## Slide 5 — ¿Por qué Monad y no otra red? (~30 seg)

### En otras redes, hacer un préstamo de $5,000 pesos no sale caro la ganancia. En Monad sí.

**Tres razones estructurales:**

1. **Mover dinero cuesta casi nada** → préstamos chicos cierran la cuenta
2. **El dinero de los prestamistas no se duerme** → entre préstamos está generando rendimiento automático
3. **Muchos préstamos al mismo tiempo sin tráfico** → la red los procesa en paralelo, aguanta al crecer

> En otra red, el producto se rompe al escalar. En Monad sigue funcionando con 20 lotes, con 200, con 2,000.

---

## Slide 6 — Prueba (~30 seg)

# No es una idea — ya está en producción en testnet

### Cliente beta: **Trébol Motors** (Monterrey)

Conectamos con su sistema real (Monday.com). Encontramos 2 ventas vivas esperando cobro:
- **Alan V. — $1,080,000 MXN** — aprobado por financiera, esperando desembolso
- **Jose d. — $530,000 MXN** — en proceso

**Si usaran Aforo hoy**, recibirían **$1,560,000 MXN** en este instante en vez de esperar 3–4 semanas.

### Demo en vivo → 

---

## Slide 7 — Roadmap (~15 seg)

| Fase | Qué | Cuándo |
|------|-----|--------|
| 1 | Piloto con Trébol | Hoy → 3 meses |
| 2 | 10–20 lotes en Nuevo León | 3–9 meses |
| 3 | Motos, maquinaria, equipo médico | 9–18 meses |
| 4 | Multi-país LATAM + capital institucional | 18–36 meses |

**Hoy:** lotes de autos (nuestro wedge).
**Mañana:** cualquier PyME mexicana que vende a plazos.

---

## Slide 8 — Cierre (~10 seg)

# Aforo
## Le adelantamos la lana a tu negocio.

**github.com/julioworklab/aforo**
**Contrato verificado en Monad Testnet:** `0xB895065C8948a52040019B40276C7beB5f112189`

---

## Guía para preguntas hostiles (Q&A)

**¿Esto no es asesoría financiera? ¿Necesitan licencia?**
No. Esto es factoraje B2B — figura ya regulada en México como SOFOM ENR o Institución de Financiamiento Colectivo bajo la Ley Fintech 2018. Existe marco legal, no lo estamos inventando.

**¿Qué pasa si el banco nunca paga?**
El contrato marca la operación en default después del plazo. El negocio tiene responsabilidad legal off-chain de regresar a los prestamistas. En el MVP los prestamistas absorben el riesgo — en Fase 2 integramos un pool de garantía + seguro privado.

**¿Cómo sé que el negocio realmente vendió?**
En el MVP lo validamos leyendo su sistema de ventas (Monday.com en el caso de Trébol, o cualquier DMS/ERP equivalente). En Fase 2 se agrega firma de la financiera como oráculo.

**¿Cómo es diferente de Konfío o Creze?**
Ellos arrancan arriba de $100,000 MXN por ticket por unit economics. Nosotros atendemos sub-$100K — el 70% del mercado que ellos no pueden servir.

**¿Por qué no en Ethereum / Base / Arbitrum?**
Funciona, pero a escala no. Con 20 lotes generando 300+ receivables/mes cada uno con pagos, liquidaciones y rebalanceos — en EVM secuencial ves contention, MEV, UX degrada. Parallel EVM de Monad lo aguanta. Además, gas bajo es el que habilita tickets de $5K.

**¿Cuándo mainnet?**
3 meses. Necesitamos cerrar estructura legal (SOFOM ENR establecida o partner con una existente), pool inicial de prestamistas, y 2 dealers más además de Trébol.
