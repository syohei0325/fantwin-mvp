# FanTwin **Hybrid Tech‑Stack v3.0**  
_Speed‑&‑Cash L0‑α ➜ Altman‑Lite Core ➜ World‑Quest ➜ Mass‑Scale & IPO_

---

## 🎯 ステージ概要

| レイヤ           | **L0‑α**<br>(0‑2 M)<br>Speed‑&‑Cash | **L1**<br>(2‑30 M)<br>Altman‑Lite Core | **L2**<br>(30‑54 M)<br>World‑Quest | **L3**<br>(54‑72 M)<br>Mass‑Scale |
|------------------|-------------------------------------|----------------------------------------|------------------------------------|-----------------------------------|
| UI / Frontend    | Chrome Ext<br>Reply + Payout        | + Creator Console v1                  | + Dev Campus Web<br>+ Wallet Web   | + PWAs / Native Apps             |
| API / Gateway    | `/sendDM`, `/payout` (Edge)         | + SDK `/translate`, `/moderate`       | + Guardian RPC<br>+ Wallet GraphQL | + Self‑Learning gRPC             |
| LLM / AI         | GPT‑4o mini (ja/en)                 | Creator‑LLM v1 (LoRA)                 | Multi‑Lang LoRA 10×               | RL‑Fine‑Tune (RLE)               |
| Fin / Wallet     | Stripe Treasury (JPY→JPY)           | Treasury Multi‑Currency β             | Airwallex RTP / UPI β             | Green DC Settlement              |
| Micro‑services   | —                                   | + Autopilot‑lite (Node)               | + Guardian AI (Rust)<br>+ Lang10 (Go)<br>+ Wallet‑core (Node) | + RL‑trainer (PyTorch)           |
| Data / DB        | Supabase (Postgres)                 | + PlanetScale (MySQL)                 | + Snowflake Feature Store         | + GPU Fleet Logs (S3 Lake)       |
| Infra / Hosting  | Cloudflare Workers + Upstash KV     | + Vercel Edge                         | + AWS EKS + Rust MCP              | + Green DC (H100×512)            |
| Compliance / Sec | Stripe KYC / p50 < 0.5 s SLA        | EU AI Act Opt‑out UI                  | GDPR Residency / AML MSB          | SOC 2 / SOX / Big‑4 Audit        |

---

## 1. フロントエンド詳細

### 1‑A. **Chrome Extension (L0‑α)**
- **Framework** : WXT (MV3)  
- **UI** : React 18 + TypeScript + Vite + Tailwind (shadcn/ui)  
- **State** : Zustand / React Query  
- **Payout Panel** : Stripe Elements (JPY)  

### 1‑B. **Creator Console (L1)**
- Next.js 14 (App Router)  
- Recharts / Chart.js ・ Supabase Realtime  

### 1‑C. **Dev Campus & Wallet (L2)**
- Next.js ＋ MDX (Nextra)  
- Sandpack Playground ・ Mux Video  
- Stripe Connect / Airwallex Widget  

---

## 2. バックエンド & AI

| サブ系統 | L0‑α | L1 | L2 | L3 |
|----------|------|----|----|----|
| **Core API** | Next.js Edge (Node 18) | tRPC / OpenAPI Stitcher | Scale‑out to Micro Frontends | gRPC Gateway |
| **LLM Hub** | `gpt-4o-mini` | Creator‑LoRA v1 | LoRA x10 languages | RL Actor‑Critic |
| **Guardian AI** | — | URL Reputation α | Toxicity BERT β (< 0.9 F1) | Vision + Audio Moderation |
| **Translate‑Svc** | — | — | Edge‑Translate (Go + INT8) | Distilled Self‑Learn |
| **Wallet‑Core** | Stripe Treasury API | Multi‑currency β | Airwallex RTP / UPI | DC settlement ledger |

---

## 3. データストア

- **Operational**  
  - Supabase → PlanetScale (Vitess)  
  - Upstash Redis (KV cache)  

- **Analytical**  
  - GA4 → BigQuery Streaming (200 ms flush)  
  - Feature Store → Snowflake / Cortex (L2)  
  - Data Lake → S3 + Iceberg (GPU logs, L3)  

---

## 4. インフラ & DevOps

- **IaC** : Pulumi (TypeScript) + Terraform modules  
- **CI/CD** : GitHub Actions + Turborepo cache + Nx affected  
- **Observability** : Sentry APM / Grafana + Loki  
- **Workflow Orchestration** : Temporal Cloud (L1〜)  
- **Green DC** : 自社 EKS, 再エネ 100 %, PUE < 1.1  

---

## 5. セキュリティ / コンプライアンス

| 項目 | L0‑α | L1 | L2 | L3 |
|------|------|----|----|----|
| **KYC/AML** | Stripe Identity | 2FA 必須 | Persona + Chainalysis | Continuous |  
| **EU AI Act** | Opt‑out UI | AES‑256 | GPAI Register | Annual Audit |  
| **GDPR** | Data‑Mask + SCC | Residency (Tokyo/FRA) | ― | ― |  
| **SOC 2 / SOX** | — | — | 準備 | 実監査 |

---

## 6. 開発フロー（抜粋）

```mermaid
graph TD
    subgraph Monorepo
      A0(extension) --> A1(api)
      A0 --> A2(payout)
      A1 --> A3(guardian-ai)
      A3 --> A4(wallet-core)
    end
    CI(GitHub Actions) -->|Nx affected| Build
    Build --> Deploy(Vercel / CF Workers)
    Deploy --> Canary(1%)
    Canary --> Prod(100%)


    7. Week‑0〜2 優先タスク
	1.	Treasury API PoC（送金成功 3 件）
	2.	LoRA v1 Fine‑Tune（BLEU ≥ 0.65）
	3.	Guardian URL Reputation α（Recall ≥ 95 %）
	4.	Chrome Unlisted ZIP（最小権限 + Flag OFF）
	5.	Monorepo CI 初期セット（Nx affected + cache）

8. 技術リスク & 対策
| リスク                         | 対策                                            |
|--------------------------------|-------------------------------------------------|
| Treasury 契約遅延             | Wise Backup ON ＋ 送金上限 ¥50 k/日             |
| 多言語モデル遅延 > 1.2 s      | INT8 量子化 ＋ Edge Cache ＋ 英語フォールバック |
| Guardian 誤検知               | 人手レビュー 5 % 抜き取り ＋ Restore Queue      |
| LLM コスト暴騰                | Token Cache ＋ mini→nano モデル切替            |
| Chrome Policy 変更            | PWA fallback ブランチを常時メンテ              |



    TL;DR
	•	L0‑α Stackは Chrome Ext + Treasury API + CF Workers の極小構成で Speed & Cash を実証。
	•	そのまま monorepo に積み増し、L1〜L3 へレイヤー追加する 段階的スケール設計。
	•	Speed = Moat, Cash = Oxygen, Data = Rocket Fuel — すべてがこの技術スタックで繋がる。 🚀