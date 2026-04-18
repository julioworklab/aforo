# Aforo

**Le adelantamos la lana.** A los pequeños negocios que vendieron y están esperando cobrar.

---

## El problema con palabras simples

Un lote de autos seminuevos en Monterrey vende un carro en **un millón de pesos**. El cliente lo va a pagar con préstamo del banco. El carro ya salió del lote.

Pero el lote **no tiene el millón** — y no lo va a tener hasta dentro de **tres o cuatro semanas**, cuando el banco por fin le entregue el monto acordado.

Mientras tanto el negocio se frena. No puede comprar el siguiente carro para revender. Su propio dinero está atorado.

Y no es solo un lote de autos. Es **cualquier negocio que vende a plazos o con financiamiento** y tiene que esperar semanas para cobrar.

**7 de cada 10 negocios chicos en México no tienen acceso a crédito rápido.** No porque no lo merezcan — sino porque a los bancos no les conviene hacer préstamos de montos pequeños. El papeleo les cuesta más de lo que les deja.

---

## La solución con palabras simples

**Aforo le da su dinero al negocio hoy mismo.**

Un grupo de ahorradores le presta al negocio el dinero que está esperando. El negocio les paga un porcentaje acordado. Cuando el banco finalmente suelta el capital del negocio en tres semanas, esas personas recuperan su dinero con una ganancia.

- **El negocio:** cobra hoy en vez de esperar un mes.
- **Los que prestaron:** ganan más que dejar su dinero en el banco.
- **Nosotros:** cobramos un porcentaje por hacer que todo cuadre.

Todo lo hace un **programa de computadora** que guarda el dinero hasta que se cumplen las reglas que todos aceptaron. Nadie se puede quedar con el dinero que no le toca, porque está a la vista de todos.

---

## ¿Por qué en Monad y no en otra blockchain?

Monad es un L1 compatible con la EVM pero con **parallel execution**: en vez de ejecutar transacciones una tras otra (como Ethereum, Arbitrum u Optimism), ejecuta en paralelo todas las que no tocan el mismo estado. El resultado: ~10,000 TPS, bloques de **400ms**, finalidad en ~800ms, y gas fees una fracción del L1 de Ethereum — e incluso por debajo de la mayoría de L2s.

Eso desbloquea tres cosas que son estructurales para que Aforo funcione al escalar:

1. **Gas floor bajo habilita tickets chicos.** Originar un factoraje de $5,000 MXN en Ethereum L1 es imposible — el gas fee solo se come el spread. En Monad, el costo por transacción es suficientemente bajo para que receivables sub-$100K sean económicamente viables, abriendo el 70% del mercado PyME que ningún SOFOM ni fintech tradicional puede servir hoy.

2. **Composability con DeFi nativo del L1.** Morpho, Curve, Uniswap y Aave ya están desplegados en Monad mainnet desde day-1. El capital de los lenders no se queda ocioso esperando una receivable — stakeado en un money market genera yield base, y al momento de fondear una operación se redirige atómicamente. El TIR efectivo del lender sube y el costo del capital para el dealer baja.

3. **Parallel EVM = sin contention al escalar.** Al crecer a 20+ lotes con miles de receivables concurrentes, la infra deja de ser producto single-tenant y se vuelve un marketplace de alta concurrencia: múltiples dealers tokenizando, lenders pujando en varias subastas, settlements distribuyéndose y rebalanceos de yield sucediendo al mismo tiempo. En una EVM secuencial todas esas operaciones compiten por block space (contention, MEV, front-running en pujas). En Monad se ejecutan en paralelo porque optimistic concurrency control deja que las txs toquen storage disjunto sin bloquearse mutuamente.

**Lo que NO es:** "necesitamos 10,000 TPS" — nuestro volumen no se acerca todavía. El argumento real es **gas floor + composability + parallel execution = unit economics que no se rompen al escalar**.

---

## Estado actual

- 🏗️ **Construido en:** Monad Blitz Monterrey, 18 de abril 2026
- 🎯 **Primer cliente piloto:** Trébol Motors (Monterrey, NL)
- 🚀 **Producto:** smart contract desplegado en Monad testnet

---

## Roadmap

| Fase | Qué construimos | Cuándo |
|------|----------------|--------|
| 1 | Piloto con 1 lote de autos (Trébol Motors) | Hoy → 3 meses |
| 2 | 10–20 lotes de autos en Nuevo León | 3–9 meses |
| 3 | Expansión a motos, maquinaria, equipo médico | 9–18 meses |
| 4 | Multi-país (LATAM) + capital institucional | 18–36 meses |

---

## Estructura del repo

```
aforo/
├── src/                    # Smart contracts (Solidity)
├── script/                 # Deploy scripts (Foundry)
├── test/                   # Tests
├── agent/                  # Scoring agent (Node)
├── frontend/               # Next.js app (Dealer + Lender views)
└── docs/
    ├── PITCH.md            # Pitch 3-min estructura + slides
    ├── DEMO-SCRIPT.md      # Guión cronometrado de la demo
    └── QA.md               # Preguntas duras y respuestas (modelo · riesgo · tech · regulatorio · escalamiento)
```

---

## ¿Preguntas?

Lee **[docs/QA.md](docs/QA.md)** — respuestas directas a las preguntas del abogado del diablo:

- ¿Cómo blindan a los lenders que el dealer no invente una venta?
- ¿Esto no es DeFi?
- ¿Por qué Monad y no un L2?
- ¿Es asesoría financiera? ¿Necesitan licencia?
- ¿Cómo decide el descuento el agente?
- ¿En qué se diferencian de Konfío / Creze / Centrifuge?

---

## Licencia

MIT
