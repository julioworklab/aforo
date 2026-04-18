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

## ¿Por qué en Monad y no en otra red?

Monad es una red de computadoras donde mover dinero cuesta casi nada. Eso nos permite atender préstamos hasta de **cinco mil pesos** — cosa que los bancos jamás harían, y que en otras redes tampoco sería rentable.

Tres razones técnicas, en simple:

1. **Cobrar poco por tx** — si mover el dinero cuesta 5 pesos en vez de 50, podemos hacer préstamos chicos y aún así ganar.
2. **El dinero de los prestamistas no se queda dormido** — entre un préstamo y otro, está generando rendimiento automático en otros lugares de la misma red.
3. **Muchos préstamos al mismo tiempo sin tráfico** — la red procesa préstamos en paralelo, no en fila. Aguanta al crecer.

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
