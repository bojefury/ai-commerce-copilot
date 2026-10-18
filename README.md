# AI Commerce Copilot — sanitized frontend & workflow showcase

An **offline runnable portfolio demo** of a real commercial automation case. The production system combined a Manifest V3 browser extension, Google Apps Script services, catalog/search logic and an LLM-assisted manager workflow. This public repository contains an **educational, sanitized reconstruction of the central interaction**, not the production source code or confidential integration endpoints.

> **Disclosure:** this version uses fictional product names and prices, a simulated LLM response and no network requests to any company or customer system. It is not evidence of production uptime, model accuracy, revenue or performance metrics. The original company is not a party to this demo.

## Try the demo

```bash
python3 -m http.server 8000
# open http://localhost:8000/demo/
```

Or run the code checks:

```bash
npm test
```

No dependencies, accounts, tokens or third-party services are required. `src/mock-llm.js` deliberately replaces the real LLM integration.

## What it demonstrates

- **AI-assisted intent extraction:** the simulated model proposes products and quantities. Its output is treated as untrusted.
- **Deterministic product/price selection:** final amounts are always computed using a trusted local catalog. Any model-provided price is ignored.
- **Human in the loop:** ambiguous matches, missing items and ambiguous budgets are highlighted for manager review. The demo never sends orders.
- **Clear budget semantics:** distinguishes *"3 games up to 3500 total"* from *"each game up to 3500"*, with uncertainty surfaced instead of guessed.
- **Offline validation:** self-contained unit tests cover disambiguation, regional price checks, safety invariants and partial fulfillment.
- **Responsive frontend:** a clean browser UI featuring sample requests, review states, regional prices, warnings and manual approval.

## Architecture

```text
User message
    │
    ▼
Mock LLM extraction  ─────► suggested games / quantity
    │                       (NEVER trusted prices)
    ▼
Catalog resolution + budget parser
    ▼
Deterministic price and selection engine
    ▼
Manager review and explicit local approval
```

### Key engineering decisions

1. **Separate interpretation from execution.** A language model may be good at interpreting an informal request but is not a source of monetary truth.
2. **Make uncertainty visible.** Insufficient evidence must not silently select a product or invent a price.
3. **Fail closed on invalid prices or regions.** An unrecognized price never becomes zero.
4. **Never allow automatic fulfillment.** A human must review final customer-facing communication and any action with financial consequences.
5. **Keep examples safe.** No actual PSN, customer, VK, Telegram, business or API credentials are contained in the repository.

## What's omitted and why

- Real customer messages, account details, access tokens, internal URLs and script properties
- Original sales prices, supplier prices, production catalog, internal API protocol and real analytics
- Production LLM prompts/model configuration and full Apps Script business integrations
- Original commercial UI components and proprietary order processing

## About AI-assisted development

This original workflow was developed with AI coding tools as part of the author's everyday development process. AI assistance was used for exploring frontend ideas, implementing components and reviewing changes; the developer owned the scope, decisions, integration and verification.

**Commit-history transparency:** this public demo is reconstructed from a working system. Repository commits reflect the actual publication and demo-development process, **not retrospectively fabricated historical commits**. The code and tests demonstrate technical competence; they are not proof of when specific production features were written.

## Quality / limitations

- No production API or infrastructure dependencies.
- A mocked extraction is not a real LLM accuracy evaluation.
- The simple demo selection algorithm is bounded for small catalogs. The source commercial project used a more involved ranking and budget strategy.
- Test outputs are local checks, not production performance measurements.

**Stack:** JavaScript (ES modules), Node.js built-in test runner, HTML, CSS, browser DOM APIs. **Original private project (technology categories):** browser extension (Manifest V3), JavaScript, Google Apps Script, LLM API and an external catalog integration.