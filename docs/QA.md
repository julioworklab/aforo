# Aforo — Q&A

Respuestas a las preguntas duras que un juez, un inversor o un lender en potencia va a hacer. Organizadas por categoría. Más directas que decoradas.

---

## 1. Modelo de negocio

### ¿Cómo hacen dinero?

Cobramos **0.5% de comisión de plataforma** sobre el monto adelantado. Con $100M MXN originados en un mes eso son $500K MXN de ingresos brutos. El resto del descuento (típicamente 1.5% a 15% según el perfil de riesgo) se queda con los prestamistas como rendimiento por poner el capital.

### ¿En qué se diferencian de Konfío, Creze, Actinver?

Esos players **arrancan arriba de $100,000 MXN por ticket** — debajo de ese monto las unit economics no les cierran porque su costo de originar es alto (papeleo, analistas, back office). Aforo atiende **desde $5,000 MXN** gracias a que el smart contract automatiza todo el flujo post-originación.

No estamos canibalizándolos. Estamos atendiendo el **70% del mercado PyME** que ellos no pueden servir rentablemente.

### ¿Cuál es el TAM real?

México tiene un **credit gap de ~$5 billones MXN para PyMEs** según Banco Mundial / CNBV. El 70% de los 4.9 millones de PyMEs mexicanas no tienen acceso a crédito bancario formal. Nuestro ICP (Ideal Customer Profile) inicial: **12,000–15,000 lotes de autos usados** con volumen combinado de $180B MXN anuales en ventas financiadas. Solo ese vertical es orden de magnitud mayor que lo que necesitamos para ser una empresa grande.

---

## 2. Riesgo y confianza (las preguntas del abogado del diablo)

### ¿Cómo blindan a los lenders que el dealer no invente una venta?

**La respuesta honesta: el MVP no lo resuelve. En producción se resuelve por capas.**

En el demo actual el contrato confía ciegamente en el dealer. Si Trébol inventa una venta de $1M, la tokeniza, y recibe $970K de un pool de lenders — ese riesgo lo absorben los lenders. Es el riesgo fundamental de cualquier factoraje, tradicional u on-chain.

El sistema se blinda en **tres capas complementarias:**

**Capa 1 — Verificación al origen (fase 1, técnica):**
- **Integración con el CRM del dealer** — exactamente lo que demostramos hoy con el Monday de Trébol. El agente solo acepta ventas con status "Aprobado por financiera". Si el dealer inventa, tendría que inventarla primero en su propio CRM, lo cual deja evidencia documental inmediata.
- **Atestación de la financiera** — el banco o SOFOM firma on-chain *"sí, debo $1.08M a Trébol, vence el 15 de mayo"*. Sin esa firma, la receivable no se lista. Es equivalente al **confirming bancario** que ya existe off-chain. BBVA, Santander tienen APIs de confirmación — hay que conectarlas.
- **Hash del contrato de compraventa** en IPFS referenciado on-chain. Disputa legal = documento inmutable disponible.

**Capa 2 — Skin in the game del dealer (fase 2, económica):**
- **Colateral stakeado** — para tokenizar $1M, el dealer stakea $100K (10%). Si defaulta, se slashea al pool. El unit economics del fraude se daña: el dealer pierde $100K antes de ganar $970K ilícitos.
- **Reputación on-chain acumulada** — cada settlement a tiempo sube el score. Un dealer nuevo tiene techo de $50K; uno con 100 settlements exitosos llega a $5M. Un fraude destruye reputación que tardó años en construir.
- **Límites tiered** — el dealer nuevo está contenido por diseño.

**Capa 3 — Legal y seguro (fase 3, regulatoria):**
- **Contrato de factoraje off-chain** firmado digitalmente, espejo de la receivable on-chain. El certificado de factoraje es título de crédito ejecutivo en México (LGTOC). Demanda civil inmediata + penal si se prueba dolo.
- **Pool de seguro mutualista** — 10-20% de nuestros fees se apartan en un fondo que cubre pérdidas de lenders hasta cierto techo. Como IPAB pero para factoraje on-chain.
- **KYB obligatorio** — cada dealer está identificado con RFC, constancia fiscal, estados auditados. La wallet queda atada a una persona moral. Defraudar = cárcel, no ghost en Discord.

**Contexto importante:** esto es exactamente lo que el factoraje tradicional cobra 25-40% CAT por hacer. Nosotros cobramos 10-15% CAT porque la tecnología automatiza ~60% del proceso — pero **no skipeamos la verificación**, solo la hacemos más barata y más transparente.

### ¿Y si el perfil del dealer es malo? ¿Los lenders pierden?

El sistema **precia el riesgo** en vivo. Un dealer sin colateral, sin historial, sin documentos subidos y con pagador poco confiable recibe un descuento sugerido de **12-15%** — equivalente en CAT anualizado a lo que cobra el factoraje tradicional.

El lender ve el **perfil de riesgo del dealer** en cada tarjeta del marketplace (score 0-100 + breakdown: colateral / historial / documentos) y decide si el descuento compensa la exposición. Si el score es bajo y el descuento alto, se llama libre mercado: si no hay lenders dispuestos, el dealer ajusta o no cierra el deal.

### ¿Qué pasa si el banco nunca paga?

El contrato marca la operación en **default** después del plazo (`settlementDeadline`). El dealer sigue teniendo responsabilidad legal off-chain de regresar el dinero a los prestamistas (el contrato de factoraje firmado).

En el MVP los prestamistas absorben el riesgo. En Fase 2 se activa:
1. Slashing del colateral stakeado del dealer
2. Pool de seguro mutualista
3. Proceso legal automático (demanda civil bajo Ley Fintech / LGTOC)

---

## 3. Técnico / Blockchain

### ¿Esto no es DeFi?

**Usa infraestructura DeFi, pero no es DeFi en sentido clásico.** La categoría correcta es **RWA private credit** (Real-World Asset).

DeFi puro (Aave, Compound, Morpho):
- Permissionless anónimo
- Sobrecolateralizado con cripto (pones $150 ETH, pides $100 USDC)
- Tasas algorítmicas por utilización
- Sin conexión al mundo real

Aforo:
- Dealers KYB'd (en producción)
- Subcolateralizado — confiamos en legal + reputación + stake parcial, no en cripto colateral
- Descuento priced por riesgo real del operador, no por curvas de utilización
- Anclado al mundo real: CRM del dealer, banco atestando, factura, contrato firmado

Categoría con precedentes claros: **Centrifuge** (~$600M TVL), **Goldfinch**, **Maple Finance** ($3B originado), **Huma Finance**. Nuestra diferenciación: LATAM-first, vertical autos/PyME, integración profunda con el CRM operativo del dealer.

### ¿Por qué Monad y no Ethereum, Base, Arbitrum?

Tres razones estructurales — no "porque es trendy":

**1. Gas floor que abre mercado nuevo.** Con gas bajo de Monad podemos atender receivables de $5,000 MXN con unit economics sanas. En L2 con fees de $0.50-2 por tx, todo lo menor a $20,000 MXN es antieconómico. Eso desbloquea **10x el TAM** porque incluye motos, equipo médico, maquinaria agrícola chica, contratos de servicio mensual.

**2. Composability con DeFi nativo.** Monad tiene Morpho, Curve, Uniswap desplegados desde el mainnet. El USDC del lender gana yield en Morpho mientras espera una subasta — no está ocioso. El yield efectivo sube sin subirle al dealer.

**3. Parallel EVM sin contention.** Al crecer a 20+ lotes + miles de receivables concurrentes, la infra es marketplace, no producto single-tenant. EVM secuencial tiene contention, MEV, front-running. Parallel execution lo aguanta.

**Lo que NO decimos:** "Necesitamos 10,000 TPS" — nuestro volumen no se acerca, se ve inflado. El argumento técnico real es gas floor + composability + parallel execution, no throughput bruto.

### ¿Cómo deciden el descuento? ¿Es un AI?

**No es AI caja negra.** Es un **scoring engine determinístico** que corre en el navegador y lee factores transparentes:

- **Monto** de la venta
- **Plazo** de cobro
- **Institución pagadora** (banco top vs SOFOM vs crédito directo)
- **Cliente recurrente** sí/no
- **Colateral stakeado** del dealer
- **Historial** del dealer en Aforo
- **Documentos subidos** (factura / contrato / carta bancaria)

Cada factor contribuye un delta en basis points. El dealer ve **en vivo** cómo cada input mueve el descuento. El razonamiento se muestra: *"Cliente recurrente: -25 bps. Sin colateral: +300 bps. ⚠️ Sin documentos: los lenders no pueden verificar."*

Tres actores priman el número final:
1. **Agente propone** (transparente, auditable)
2. **Dealer decide** (acepta o ajusta)
3. **Mercado valida** (si lenders no fondean al descuento elegido, el dealer ajusta)

### ¿Por qué el token es "mUSDC" y no un peso mexicano real?

En el MVP es un ERC-20 de prueba con `mint()` abierto para que el demo no requiera un stablecoin real. En producción se integra con:
- **MXNT** (Etherex / Centro) — peso mexicano colateralizado
- **USDC** — como unidad de cuenta universal, con conversión MXN en on/off ramps
- O un peso digital emitido por la CNBV si se materializa

La arquitectura es token-agnóstica: el contrato recibe cualquier ERC-20 configurado al deployment.

---

## 4. Regulatorio y legal

### ¿Esto es asesoría financiera? ¿Necesitan licencia?

**No.** Es **factoraje B2B** — figura ya regulada en México desde hace décadas.

Marcos legales aplicables:
- **SOFOM ENR** (Sociedad Financiera de Objeto Múltiple, Entidad No Regulada) — la figura clásica para factoraje
- **IFC** (Institución de Financiamiento Colectivo) bajo **Ley Fintech 2018** — para pools de capital distribuidos tipo marketplace
- **LGTOC** (Ley General de Títulos y Operaciones de Crédito) — el certificado de factoraje es título de crédito ejecutivo

No es asesoría de inversiones (LMV), no es ejecución discrecional, no es correduría. Es compra-venta de derechos de crédito — actividad mercantil regulada pero sin permisos de casa de bolsa.

### ¿Y los lenders? ¿Tienen que ser inversionistas acreditados?

Depende de la figura:
- **IFC** bajo Ley Fintech permite retail participar en deuda de PyMEs con límites (actualmente ~$750K MXN/año por persona). No requiere ser acreditado.
- **SOFOM** puede operar como vehículo de inversión con público calificado (institucional / acreditado).
- Diseño híbrido probable: SOFOM + IFC según segmentación.

### ¿Sus fundadores son sujetos regulatorios?

Sí, y preparados. Julio tiene background de banca patrimonial (ex-Santander), conoce el proceso CNBV. La estrategia es registrarse como SOFOM ENR o partner con una SOFOM existente que ya tenga registro, acelerando time-to-market.

---

## 5. Escalamiento y futuro

### ¿Cuándo mainnet?

3 meses post-hackathon. Pre-requisitos:
1. Estructura legal cerrada (SOFOM ENR establecida o partnership)
2. Pool inicial de prestamistas ($500K-2M MXN iniciales)
3. 2-3 dealers más confirmados además de Trébol
4. Auditoría de smart contracts (OpenZeppelin, Spearbit o similar)

### ¿Cuál es el roadmap de expansión?

| Fase | Timeline | Qué se construye | KPI |
|------|----------|------------------|-----|
| 1 Punto de entrada | Hoy → 3 meses | Mainnet · 1 lote (Trébol) · Pool $500K | 10 receivables settled, 0 defaults |
| 2 Densidad autos MTY | 3–9 meses | 10–20 lotes en NL | $2M MXN/mes originado |
| 3 Expansión vertical | 9–18 meses | Motos · maquinaria · equipo médico | $10M MXN/mes · 3 verticales |
| 4 Multi-país | 18–36 meses | Argentina · Colombia · capital institucional | $100M+ MXN/mes |

### ¿Qué los detiene?

- **Tiempo y ejecución** — el modelo existe (Centrifuge lo probó), la ejecución en LATAM tiene specifics que nadie ha atacado bien
- **Capital semilla para el pool inicial** — necesitamos que los primeros lenders sean cripto-nativos con apetito de riesgo + yield
- **Onboarding de financieras como oráculos** — ganar la primera atestación on-chain de BBVA o Santander es el mayor acelerador. Sin eso, Capa 1 se queda incompleta.

### ¿Por qué ustedes?

- **Founder-market fit extremo** — Julio tiene 15+ años en banca patrimonial mexicana y opera Trébol desde adentro (cuñado dueño). Doble domain authority: sabe cómo piensa un banquero Y sabe cómo piensa un dealer. Raro en LATAM crypto.
- **Infraestructura tech con socio IA (Claude)** — construido en un día, shippeable, iterable. No necesitamos un equipo de 10 para el MVP.
- **Trébol como beta desde día 0** — nadie más llega con un cliente operando.

---

## Quieres retarnos más

- **Repo público:** https://github.com/julioworklab/aforo
- **Contrato verificado:** https://testnet.monadexplorer.com/address/0xB895065C8948a52040019B40276C7beB5f112189
- **Contacto:** @julioafs
