# Demo Script — Aforo (3 minutos total)

## Pre-demo setup (antes de subir al escenario)

- [ ] Dos wallets listas en MetaMask/Rabby:
  - **Wallet A (Dealer — Trébol):** `0xd0472d09eFf85ac1C9d48B889Ac718Ad83f16704` o una fresca
  - **Wallet B (Lender):** cualquier segunda wallet
- [ ] Ambas conectadas a **Monad Testnet** (chain 10143)
- [ ] Wallet B con algo de MON para gas (vía faucet)
- [ ] Frontend abierto en el navegador: `http://localhost:5173/`
- [ ] Tab 2 abierto con la terminal donde corre el agente
- [ ] Tab 3 abierto con el board de Monday de Trébol (para el "reveal" al principio)
- [ ] Tab 4 abierto con el explorer del contrato: https://testnet.monadexplorer.com/address/0xB895065C8948a52040019B40276C7beB5f112189

## Beats cronometrados

### 0:00 — 0:30 · Hook con Trébol real

Arranco proyectando el tab de Monday de Trébol Motors.

> *"Esto que ven aquí es el CRM real de un lote de autos en Monterrey. Se llama Trébol. Miren — hace tres semanas vendieron un Audi Q5 por 1 millón 80 mil pesos. El cliente ya firmó, el banco ya aprobó. Pero Trébol todavía no ha cobrado. Y no va a cobrar hasta que la financiera libere — normalmente 3 a 4 semanas después."*

> *"Mientras tanto su capital está congelado. No puede comprar el siguiente auto. Su negocio se frena."*

### 0:30 — 1:00 · El problema es grande

> *"Esto no le pasa solo a Trébol. Hay 12 mil lotes de autos en México con el mismo problema. Le pasa al dentista, al que vende maquinaria, al que vende motos. En México hay un hueco de 5 billones de pesos en crédito para pequeñas empresas, porque a los bancos no les conviene hacer préstamos chicos — el papeleo les cuesta más de lo que les deja."*

### 1:00 — 2:00 · Demo en vivo

Cambio a la terminal con el agente.

> *"Nosotros conectamos con su sistema real y detectamos qué ventas están esperando cobro."*

Corro: `MONDAY_API_TOKEN=xxx node agent/score.js`

Lee las 2 ventas reales. Le muestro la sugerencia del agente.

> *"El agente sugiere un descuento de 2.15% para la venta del Audi Q5 — porque es cliente recomendado, financiamiento aprobado con BBVA, cierre rápido. Eso se traduce en que Trébol recibiría un millón 51 mil pesos HOY en vez de esperar tres semanas."*

Cambio al frontend. Conecto wallet del Dealer.

> *"Así se ve para el dueño del negocio."*

- Lleno el formulario: Nombre "Audi Q5", Monto 1,080,000, Institución BBVA, Cliente recurrente ✓, Plazo 28 días
- Click "Registrar venta por cobrar" → tx → aparece en "Mis ventas registradas"

Cambio a wallet del Lender (disconnect + connect de la otra wallet).

> *"Del otro lado, hay gente con ahorros que quiere ganar prestando. Aquí ven la venta que acabamos de registrar."*

- Click "(Demo) Acuñar 2M mUSDC" → wallet se fondea
- En el marketplace: click "Prestar" con el monto completo → approve + fund → tx
- Muestra: la venta se marca como **Fondeado** (status 2)

Cambio de vuelta a wallet del Dealer.

> *"Ahora la venta está totalmente fondeada. Trébol puede recibir su lana instantáneamente."*

- Click "Recibir adelanto ahora" → tx
- Muestra: estado cambia a **Desembolsado**, el saldo del dealer se incrementa en ~1,047,240 mUSDC

> *"Listo. Trébol acaba de recibir en 30 segundos lo que iba a esperar 3 semanas."*

### 2:00 — 2:30 · ¿Por qué Monad?

> *"¿Por qué esto funciona en Monad y no en otras redes? Tres razones — en simple:"*

> *"Uno: mover dinero cuesta casi nada, entonces podemos hacer préstamos hasta de 5 mil pesos y todavía nos sale la cuenta. En otras redes la comisión se come el margen."*

> *"Dos: el dinero de los prestamistas no se duerme — entre un préstamo y otro está generando rendimiento en otros lugares de la misma red. Se compone."*

> *"Tres: muchos préstamos al mismo tiempo sin tráfico. Cuando crezcamos de 1 lote a 20 a 200, la red los procesa en paralelo. No se atora."*

### 2:30 — 3:00 · Cierre + roadmap

> *"Trébol es nuestro primer cliente — desde hoy. El producto ya está desplegado y verificado en testnet de Monad. Link al contrato y al código, abierto, en GitHub. En tres meses: 10 lotes de autos en Monterrey. En un año: motos, maquinaria, equipo médico. En dos años: cualquier PyME mexicana que hoy no tiene acceso a crédito."*

> *"Se llama Aforo. Le adelantamos la lana a tu negocio. Gracias."*

## Fallbacks (por si algo truena en vivo)

- **Si el faucet no responde:** las wallets ya tienen MON pre-fondeado (menciono que lo hicimos antes del evento).
- **Si MetaMask no cambia de red:** uso Rabby como backup.
- **Si falla la tx al registrar receivable:** recurro al video pre-grabado que tengo en loop en el tab 5.
- **Si se cae el dev server:** tengo el build de producción en `dist/` listo para servir con `python3 -m http.server`.
- **Si no jala la pluma del laptop en el escenario:** proyecto desde móvil con Tailscale.

## Cosas que NO debo decir en el pitch

- ❌ "Factoraje"
- ❌ "Receivable" / "tokenización"
- ❌ "On-chain" / "smart contract" (solo en Q&A técnico si preguntan)
- ❌ "DeFi" / "DAO"
- ❌ "Disruption"
- ❌ "We're like Uber for X"
- ❌ Hablar en dólares (audiencia mexicana, va todo en pesos)

## Cosas que SÍ debo decir

- ✅ "Le adelantamos la lana"
- ✅ "Un lote de autos en Monterrey / un dentista que vende equipo a plazos / cualquier negocio que vende y espera"
- ✅ "5 mil pesos / un millón de pesos" (nunca USD)
- ✅ "Programa de computadora que guarda el dinero" (explicando smart contracts)
- ✅ "Lo que le van a pagar en tres semanas" (en vez de "receivable")
- ✅ "Trébol Motors es nuestro primer cliente" (beta real)
- ✅ "Se llama Aforo" (el nombre, no la descripción técnica)
