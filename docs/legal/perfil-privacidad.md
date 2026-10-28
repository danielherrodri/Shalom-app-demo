# Privacy & Data Protection Practice Profile

*Escrito por la configuración rápida de privacy-legal el 28 oct 2026 con valores genéricos. Los campos `[PENDIENTE]` los confirma la iglesia después. Copia de trabajo: `~/.claude/plugins/config/claude-for-legal/privacy-legal/CLAUDE.md` (se pierde al cerrar la sesión en la nube; esta copia en el repositorio es la de referencia).*

---

## Who we are

Shalom es una iglesia en México que opera una app para su comunidad (eventos, Shalom Kids, cafetería, avisos, opinión, acompañamiento). Es **responsable** (controller) de los datos de sus miembros, familias, menores, voluntarios y donantes, para sus propios fines. Encargados previstos: hosting, proveedor de correo, Mercado Pago (pagos). Ubicación de los datos: `[PENDIENTE — región del hosting]`. Equipo de privacidad: `[PENDIENTE]`. Persona o departamento de datos personales: `[PENDIENTE — la ley exige designarlo]`. Escalamiento: `[PENDIENTE — pastor / administración]`.

**Practice setting:** Interno de la iglesia `[DEFAULT — confirmar]`.

**Regulatory footprint:** México — Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP, publicada en el DOF el 20 mar 2025, vigente desde el 21 mar 2025, última reforma 14 nov 2025) y su reglamento de 2011, formalmente vigente pero con referencias desfasadas. Autoridad: Secretaría Anticorrupción y Buen Gobierno. Plazos en días hábiles. Sin exención para iglesias. Ver [investigación](investigacion-lfpdppp-2025.md) `[ChatGPT búsqueda web — verificar]`. No aplica GDPR salvo que haya titulares en la UE `[PENDIENTE — confirmar]`. Sin regímenes sectoriales (no es institución financiera ni de salud).

**Open regulatory matters:** ninguno conocido `[PENDIENTE — confirmar]`.

**Risk appetite:** Conservador `[DEFAULT — hay datos de menores y de creencias religiosas]`.

---

## Who's using this

**Role:** Non-lawyer with attorney access `[DEFAULT — confirmar]`
**Attorney contact:** `[PENDIENTE]`

---

## Available integrations

| Integration | Status | Fallback if unavailable |
|---|---|---|
| Document storage (Google Drive del plugin) | ⚪ configurado, no verificado | Resultados en `docs/legal/` del repositorio |
| Slack | ✗ no conectado | Avisos en el chat |
| Scheduled tasks | ⚪ disponible en la sesión, no verificado | policy-monitor a petición |

---

## DPA playbook

`[DEFAULT] [POSITIONS UNTESTED — la iglesia no ha negociado contratos de encargado. Tratar como punto de partida.]`

### Cuando somos responsables (contratos con encargados: hosting, correo, pagos)

| Term | We require | Acceptable | Never accept |
|---|---|---|---|
| Finalidad | Tratar solo para el servicio contratado | — | Uso para fines propios del proveedor |
| Seguridad | Medidas documentadas y cifrado | Certificación reconocida | Sin compromiso de seguridad |
| Vulneraciones | Aviso sin demora indebida | Plazo corto definido | Sin obligación de aviso |
| Subencargados | Aviso previo con derecho a objetar | Lista pública actualizada | Sin aviso |
| Borrado al terminar | Devolución o borrado con constancia | Borrado en plazo definido | Retención indefinida |

### The one thing

Que el proveedor use datos de la comunidad (sobre todo de menores) para sus propios fines.

---

## Privacy policy commitments

`[PENDIENTE]` No existe aviso de privacidad real. El de `docs/aviso-privacidad-DEMO.md` es de demostración y **no** genera compromisos. Hasta que haya aviso, toda actividad nueva se revisa contra la ley, no contra el aviso.

---

## PIA house style

**Trigger:** `[DEFAULT]` toda actividad que trate datos de menores, datos sensibles (incluidas creencias religiosas), identidad o acceso, pagos, o un proveedor nuevo.
**Format:** `[DEFAULT]` formato estándar del plugin.
**Depth:** `[DEFAULT]` breve (2–5 páginas).
**Sign-off:** `[PENDIENTE]`.

---

## DSAR process

Derechos ARCO (acceso, rectificación, cancelación, oposición) más revocación del consentimiento.
**Volume:** `[PENDIENTE]` · **Handler:** `[PENDIENTE — persona de datos personales]`
**Systems to check:** base de datos de la app, proveedor de correo, respaldos, pagos `[PENDIENTE — completar al lanzar]`.
**Response SLA:** 20 días hábiles para responder y 15 para ejecutar, ampliables una vez (Ley, art. 31) `[ChatGPT búsqueda web — verificar]`.

---

## Escalation

| Issue type | Handle at | Escalate to | When |
|---|---|---|---|
| Solicitud ARCO rutinaria | `[PENDIENTE]` | Abogado | Menores, disputa familiar, alcance inusual |
| Contrato con proveedor | `[PENDIENTE]` | Abogado | Fuera de las posiciones anteriores |
| Evaluación de alto riesgo | `[PENDIENTE]` | Abogado | Menores, datos sensibles, decisiones automatizadas |
| Contacto de autoridad | — | Pastor + abogado de inmediato | Siempre |
| Vulneración de seguridad | — | Administración + abogado de inmediato | Siempre |

---

## Outputs

**Outputs folder:** `docs/legal/` del repositorio.
**Naming convention:** `triage-<actividad>-v01.md`, `pia-<actividad>-v01.md`.
**Privacy policy document:** `[PENDIENTE]`.

**Work-product header:** `RESEARCH NOTES — NOT LEGAL ADVICE — REVIEW WITH A LICENSED ATTORNEY BEFORE ACTING` (en español: «NOTAS DE INVESTIGACIÓN — NO ES ASESORÍA LEGAL — REVISAR CON UN ABOGADO ANTES DE ACTUAR»).

---

*Re-run: `/privacy-legal:cold-start-interview --full`*
