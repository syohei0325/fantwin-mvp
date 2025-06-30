# FanTwin **Hybrid Tech‑Stack v3.1**  
_Speed‑&‑Cash L0‑α ➜ 🆕 L0‑β Style‑LoRA ➜ Altman‑Lite Core ➜ World‑Quest ➜ Mass‑Scale & IPO_

> **v3.0 → v3.1 差分**  
> 1. **🆕 L0‑β** レイヤーを追加し *Style‑LoRA α*（Personalization）を正式反映  
> 2. **Trust 強化**：GDPR Data‑Delete API・Guardian URL β・LoRA Storage Policy  
> 3. Micro‑services / Data / Compliance セクションに上記の実装を追記

---

## 🎯 ステージ概要

| レイヤ            | **L0‑α**<br>(0‑2 M)<br>Speed‑&‑Cash | **🆕 L0‑β**<br>(2‑3 M)<br>Style‑LoRA α | **L1**<br>(3‑30 M)<br>Altman‑Lite Core | **L2**<br>(30‑54 M)<br>World‑Quest | **L3**<br>(54‑72 M)<br>Mass‑Scale |
|-------------------|--------------------------------------|----------------------------------------|----------------------------------------|------------------------------------|-----------------------------------|
| **UI / FE**       | Chrome Ext<br>Reply + Payout         | + **“My Voice” ON/OFF** toggle         | + Creator Console v1                  | + Dev Campus Web<br>+ Wallet Web   | + PWAs / Native Apps             |
| **API / Gateway** | `/sendDM`, `/payout` (Edge)          | + `/style‑ingest`, `/delete‑data`      | + SDK `/translate`, `/moderate`       | + Guardian RPC<br>+ Wallet GraphQL | + Self‑Learning gRPC             |
| **LLM / AI**      | GPT‑4o mini (ja/en)                  | + **LoRA Adapter Rank 8 (8‑16 MB)**    | Creator‑LLM v1 (LoRA)                 | Multi‑Lang LoRA 10×               | RL‑Fine‑Tune (RLE)               |
| **Fin / Wallet**  | Stripe Treasury (JPY→JPY)            | unchanged                               | Treasury Multi‑Currency β             | Airwallex RTP / UPI β             | Green DC Settlement              |
| **Micro‑services**| —                                    | + **lora‑trainer / lora‑infer** (Py)   | + Autopilot‑lite (Node)               | + Guardian AI (Rust)<br>+ Lang10 (Go)<br>+ Wallet‑core (Node) | + RL‑trainer (PyTorch)           |
| **Data / DB**     | Supabase (Postgres)                  | + **Supabase Storage “/lora‑adapters”** | + PlanetScale (MySQL)                 | + Snowflake Feature Store         | + S3 Data Lake (GPU logs)        |
| **Infra / Hosting**| CF Workers + Upstash KV             | + Vercel Edge (LoRA Router)            | + Vercel Edge                         | + AWS EKS + Rust MCP              | + Green DC (H100×512)            |
| **Compliance / Sec**| Stripe KYC / p50 < 0.5 s SLA       | **GDPR Delete API & LoRA Sign Hash**   | EU AI Act Opt‑out UI                  | GDPR Residency / AML MSB          | SOC 2 / SOX / Big‑4 Audit        |

---

## 1. フロントエンド詳細

### 1‑A. **Chrome Extension (L0‑α)**
- **Framework** : WXT (MV3)  
- **UI** : React 18 + TypeScript + Vite + shadcn/ui  
- **State** : Zustand / React Query  
- **Payout Panel** : Stripe Elements (JPY)  

### 1‑B. **“My Voice” Toggle (L0‑β)**
- React Floating‑UI Popover  
- Feature Flag default **OFF** → β Cohort **ON**  
- Tooltip に Style‑Match スコアを表示  

### 1‑C. **Creator Console (L1)**
- Next.js 14 (App Router)  
- Recharts / Tailwind UI  

### 1‑D. **Dev Campus & Wallet (L2)**
- Next.js ＋ MDX (Nextra)  
- Sandpack Playground ・ Mux Video  
- Stripe Connect / Airwallex Widget  

---

## 2. バックエンド & AI

| サブ系統       | L0‑α                         | 🆕 L0‑β                              | L1                              | L2                               | L3 |
|----------------|------------------------------|--------------------------------------|---------------------------------|-----------------------------------|----|
| **Core API**   | Next.js Edge (Node 18)       | + `/style‑ingest`, `/delete‑data`    | tRPC / OpenAPI Stitcher         | Scale‑out to Micro Frontends      | gRPC Gateway |
| **LLM Hub**    | GPT‑4o mini                  | + **LoRA Adapter Rank 8**            | Creator‑LoRA v1                 | LoRA x10 languages                | RL Actor‑Critic |
| **lora‑trainer** | —                          | Python PEFT on A100; 25 min / model  | Fine‑Tune Scheduler (Temporal)  | Batch LoRA Distill                | Continuous RL |
| **Guardian AI**| URL Reputation α (WAF)       | URL β Recall ≥ 95 %                  | Toxicity BERT β (F1 0.9)        | Vision / Audio Moderation         | Multi‑modal RL |
| **Translate‑Svc**| —                          | —                                    | Edge‑Translate (Go INT8)        | Distilled Self‑Learn              | — |
| **Wallet‑Core**| Stripe Treasury             | unchanged                             | Multi‑currency β                | Airwallex RTP / UPI               | Ledger DC |

---

## 3. データストア

- **Operational**  
  - Supabase (Postgres)  
  - **Supabase Storage** — `lora‑adapters/*` 16 MB cap / creator  
  - Upstash Redis (KV cache)  

- **Analytical**  
  - GA4 → BigQuery Streaming (200 ms flush)  
  - Feature Store → Snowflake / Cortex  
  - Data Lake → S3 + Iceberg (GPU logs, L3)  

---

## 4. インフラ & DevOps

- **IaC** : Pulumi (TypeScript) + Terraform modules  
- **CI/CD** : GitHub Actions + Turborepo + Nx affected  
- **Observability** : Sentry APM / Grafana + Loki  
- **Workflow** : Temporal Cloud (LoRA training queue)  
- **Green DC** : 自社 EKS, 再エネ 100 %, PUE < 1.1  

---

## 5. セキュリティ / コンプライアンス

| 項目            | L0‑α                                  | 🆕 L0‑β                                 | L1                           | L2 | L3 |
|-----------------|---------------------------------------|-----------------------------------------|------------------------------|----|----|
| **KYC/AML**     | Stripe Identity                       | unchanged                                | 2FA required                 | Persona | Continuous |
| **GDPR Delete** | —                                     | **`DELETE /user‑data` 24 h purge**      | Residency (Tokyo/FRA)        | —  | — |
| **LoRA Sign**   | —                                     | SHA‑256 Sign & Verify on Adapter upload | —                            | —  | — |
| **EU AI Act**   | Opt‑out UI                            | AES‑256 💾                               | GPAI Register                | Audit | — |
| **SOC 2 / SOX** | —                                     | —                                       | 準備                         | —  | 実監査 |

---

## 6. 開発フロー（主要更新のみ）

```mermaid
graph TD
  subgraph Monorepo
    ext(extension) --> api(api)
    api --> payout(payout)
    ext --> ltrain(lora-trainer)
    ltrain --> linfer(lora-infer)
    api --> guardian(guardian-ai)
  end
  CI(GitHub Actions) -->|Nx affected| Build
  Build --> Deploy(Vercel / CF Workers)
  Deploy --> Canary
  Canary --> Prod

	•	lora‑trainer job: Temporal schedule → A100 single GPU → upload adapter
	•	lora‑infer Edge Router: adds lora=hash query param → GPT‑4o with adapter


  7. Week‑0〜2 優先タスク（変更）
	1.	Treasury API PoC — 送金成功 3 件
	2.	YouTube Caption Ingest α — ≥ 15 k 文 / Creator
	3.	LoRA v1 Fine‑Tune — BLEU ≥ 0.85, GPU ≤ $2
	4.	Data‑Delete API — /user‑data DELETE route + UI button
	5.	Guardian URL β — Recall ≥ 95 % on 20 % cohort

## 8. 技術リスク & 対策（追記行★）

| リスク                         | 対策                                                         |
|--------------------------------|--------------------------------------------------------------|
| Treasury 契約遅延             | Wise Backup ON + 送金上限 ¥50 k/日                           |
| 多言語モデル遅延 > 1.2 s      | INT8 量子化 + Edge Cache + 英語 Fallback                    |
| **LoRA Adapter 流出★**        | SHA‑256 Sign & Supabase Private Bucket                      |
| Guardian 誤検知               | 人手レビュー 5 % 抜き取り + Restore Queue                    |
| LLM コスト暴騰                | Token Cache + mini→nano Fallback                            |
| Chrome Policy 変更            | PWA fallback ブランチ常時メンテ                             |
| GDPR Delete 未実装★          | `/delete‑data` 完了まで Public Launch 凍結                  |


  TL;DR
	•	L0‑β 差分 = YouTube Caption Ingest α + LoRA Rank 8 + Data‑Delete API + LoRA Storage Guard
	•	追加工数 ≈ 4 週間・GPU $300 以内、既存 L0‑α スケジュールは変更なし
	•	Speed = Moat · Trust = Shield · Personalization = Glue — 3 本柱を L0 内で完成

Merge to main only after passing GPU cost & BLEU gate. 🚀