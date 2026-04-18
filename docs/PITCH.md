# Aforo — Pitch (3 min)

> Monad Blitz Monterrey · 18 de abril 2026

---

## Slide 1 — Hook (~30 seg)

# Aforo
## Le adelantamos la lana a tu negocio.

---

**Un lote de autos en Monterrey.**

Esta mañana vendió un Audi Q5 en **un millón y tanto de pesos**. El cliente lo va a pagar con préstamo del banco. El carro ya salió del lote.

Pero el lote **no tiene el millón todavía** — y no lo va a tener hasta dentro de **tres o cuatro semanas**, cuando el banco por fin suelte la lana.

Mientras tanto, no puede comprar el siguiente carro para revender. Su propio dinero está atorado.

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
- **Audi Q5 — $1,080,000 MXN** — aprobado por financiera, esperando desembolso
- **Segundo vehículo — $530,000 MXN** — en proceso

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

**Cheat sheet rápida para Q&A en vivo.** Para respuestas completas y más preguntas, ver [`docs/QA.md`](./QA.md).

**¿Cómo blindan a los lenders que el dealer no invente una venta?**
El sistema **precia el riesgo** — dealer sin colateral + sin historial + sin docs = descuento 12-15% (similar a factoring tradicional); con los 3 blindajes = 1.5-2%. En producción: verificación al origen (CRM + atestación bancaria), skin in the game (stake del dealer), capa legal (contrato + seguro mutualista + KYB). Ver QA.md sección 2.

**¿Esto no es DeFi?**
Usa infra DeFi pero es **RWA private credit** — categoría existente (Centrifuge, Goldfinch, Maple). Dealers KYB'd, colateral parcial, conexión al mundo real. Diferencia: LATAM-first, vertical autos/PyME, integración con CRM del dealer.

**¿Esto no es asesoría financiera? ¿Necesitan licencia?**
No. Es **factoraje B2B** — figura regulada en México vía SOFOM ENR o IFC bajo Ley Fintech 2018. El certificado de factoraje es título de crédito ejecutivo (LGTOC).

**¿Qué pasa si el banco nunca paga?**
El contrato marca default. Responsabilidad legal off-chain del dealer (contrato de factoraje firmado). Fase 2: slashing del stake + pool de seguro mutualista.

**¿Cómo sé que el negocio realmente vendió?**
MVP: validamos contra el CRM del dealer (Monday en Trébol, DMS equivalente en otros). Fase 2: firma on-chain de la financiera como oráculo.

**¿Cómo es diferente de Konfío / Creze?**
Ellos arrancan arriba de $100K MXN/ticket por unit economics. Nosotros atendemos sub-$100K — el 70% del mercado que ellos no pueden servir rentablemente.

**¿Por qué no en Ethereum / Base / Arbitrum?**
Gas floor + composability con DeFi nativo + parallel EVM sin contention al escalar. No "TPS bruto" — nuestro volumen no lo necesita todavía. Ver QA.md sección 3.

**¿Cuándo mainnet?**
3 meses. Pre-requisitos: estructura legal cerrada + pool inicial ($500K-2M MXN) + 2-3 dealers adicionales + auditoría de contratos.
