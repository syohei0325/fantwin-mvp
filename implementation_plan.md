# 🚀 FanTwin ― Hybrid Roadmap  
**“Speed‑&‑Cash L0‑α ➜ L0‑β Style‑LoRA ➜ Altman‑Lite ➜ World Quest ➜ Mass‑Scale” v3.1**

> **v3.0 → v3.1 の主変更点**  
> 1. **🆕 Style‑LoRA α**（Personalization）フェーズを L0‑β として追加  
> 2. **🔒 Trust 強化**：Data‑Delete API／Guardian β／公開メトリクス  
> 3. 既存 L0‑α 時間軸・構成ファイルはそのまま。**差分のみパッチ**で反映  

---

## 📍 0. アーキテクチャ全体像

| レイヤ      | L0‑α (Chrome‑Only)                       | 🆕 L0‑β Style‑LoRA                     | L1 Altman‑Lite Core            | L2 World‑Quest                 | L3 Mass‑Scale                |
|-------------|------------------------------------------|----------------------------------------|--------------------------------|--------------------------------|------------------------------|
| **UI**      | Chrome Ext (Reply + Payout)              | + **“My Voice” ON/OFF** トグル         | Creator Console v1             | Dev Campus, Wallet Web        | PWAs / Native               |
| **API**     | `/sendDM`, `/payout`                     | + `/style‑ingest`, `/delete-data`      | SDK `/translate`, `/moderate`  | Guardian RPC, Wallet GraphQL  | Self‑Learning gRPC          |
| **LLM**     | GPT‑4o mini (ja/en)                      | + **LoRA‑Adapter** (Rank 8, 8‑16 MB)   | Creator‑LLM v1 (LoRA)          | Multi‑Lang LLM 10×            | RL‑Fine‑Tune (RLE)          |
| **Fin**     | Stripe Treasury (JPY→JPY)                | unchanged                               | Treasury Multi‑Currency β      | Airwallex RTP / UPI           | Green DC Settlement          |
| **Infra**   | CF Workers + Upstash KV                  | + Supabase Storage “/lora‑adapters”     | Vercel Edge + Supabase         | AWS EKS + Rust MCP            | Green DC (H100×512)          |
| **Ops**     | Grafana / Sentry                         | Temporal Cloud, Loki                   | Temporal Cloud, Loki           | SOC2, GDPR Residency          | SOX / Big‑4 Audit           |

---

## 🏗️ 1. フェーズ別マイルストーン & 期間

| Phase | 期間 | 主 Deliverable | ゴール指標 | 企業価値 (EV) |
|-------|------|----------------|------------|---------------|
| **L0‑α** Speed‑&‑Cash | 0‑2 M | Chrome Ext + 1 % Payouts | GMV ¥3 M / 粗利 40 % | ¥0.8‑1.1 B |
| **🆕 L0‑β** Style‑LoRA α | 2‑3 M | Caption Ingest + LoRA α | Style‑Match ≥ 0.85 | +¥0.3 B |
| **STEP 1** Altman‑Lite Core | 2‑30 M | Speed‑Wedge / SDK / Autopilot Lite | ARR ¥1 B | ¥6 B |
| **STEP 2** World‑Quest | 30‑54 M | Multi‑Lang LLM / Dev Campus / Guardian AI / Wallet β | ARR ¥80 B | ¥1 T |
| **STEP 3** Mass‑Scale & IPO | 54‑72 M | Self‑Learning GA / Green DC / IPO readiness | ARR ¥250‑300 B | ¥2‑3 T |

---

## ⏱️ 2. L0‑α & L0‑β スプリント詳細

| 週 | 主要タスク | 完了基準 |
|----|-----------|---------|
| W0 | Treasury API PoC (JPY only) | 送金成功 3 件 |
| W1 | p50 Latency < 0.6 s チューニング | Sentry p50/p95 < 0.6 / 1.0 |
| W2 | 1‑Click LP + 自動ドラフト | Wow 完了率 95 % |
| W3 | Unlisted Chrome 申請 | 合格 & URL 取得 |
| W4 | βユーザー 30 名 / NPS 50 | GA4 Survey 回収 |
| W5‑6 | Referral +200 Replies / Speed Board 公開 | GMV ¥3 M・粗利 40 % |
| **W7** | **YouTube Caption Ingest α** | ≥ 15 k 文 / Creator |
| **W8** | **LoRA Fine‑Tune α** | Style‑Match ≥ 0.85<br>GPU ≤ \$2 |
| **W9** | **“My Voice” ON/OFF** (β旗) | ON Cohort Wow +3 pt |
| **W10** | **Guardian URL β 20 %** | 有害率 < 0.2 % |
| W11‑12 | Team Seat β + Pricing A/B | CVR > 3 %, 粗利維持 |

---

## 🔧 3. Altman‑Lite Core (2‑30 M) ※変更なし

### 3‑1 Post‑MVP Hardening (2‑5 M)
- Error Rate < 0.05 %
- EU AI Act Opt‑out UI 本番
- ARR Run‑rate ¥0.3 B

### 3‑2 Autopilot Lite GA (5‑9 M)
| Task | 完了条件 |
|------|---------|
| 投稿予約 API | 成功率 99 % |
| コメント返信 v1 | BLEU > 0.75 |
| シリーズ A DD | ARR ¥1 B |

---

## 🌍 4. World‑Quest Expansion (30‑54 M) ※変更なし

| モジュール | 期間 | KPI |
|-----------|------|-----|
| Multi‑Lang LoRA | 30‑36 M | BLEU 0.75 / Lat < 0.9 s |
| Dev Campus | 36‑42 M | Dev MAU 5 k |
| Guardian AI | 42‑46 M | 有害率 < 0.1 % |
| Wallet β | 46‑52 M | TPV ¥20 B/年 |
| Self‑Learning β | 52‑54 M | 自動返信率 80 % |

---

## 🏢 5. Mass‑Scale & IPO (54‑72 M) ※変更なし

- **Green DC**：再エネ 100 %、PUE < 1.1  
- **Self‑Learning GA**：自動返信率 95 %  
- **IPO Readiness**：Big‑4 監査 / SOX / SOC2 / ESG IR  

---

## 💰 6. 投資・資金計画 ※変更なし

| ラウンド | 時期 | 調達額 | バリュエーション Post |
|---------|------|--------|-----------------------|
| Seed (完) | 2025‑Q3 | ¥150‑200 M | ¥1 B |
| Series A | 2026‑Q2 | ¥500‑600 M | ¥6 B |
| Series B | 2027‑Q2 | ¥5‑7 B | ¥1 T |
| Series C / IPO | 2028‑Q1 | TBD | ¥2‑3 T |

---

## 📊 7. KPI チェックポイント

| フェーズ | Wow Rate | NPS | Style‑Match | GMV/ARR | 粗利 |
|----------|---------|-----|-------------|---------|------|
| L0‑α 60d | 90 % | 50 | — | GMV ¥3 M | 40 % |
| 🆕 L0‑β +90d | 92 % | 60 | ≥ 0.90 | ARR Run‑rate ¥0.3 B | 42 % |
| Step 1 30M | — | — | ≥ 0.92 (Multi‑sns) | ARR ¥1 B | 50 % |
| Step 2 54M | — | — | — | ARR ¥80 B | 55 % |
| Step 3 72M | — | — | — | ARR ¥250 B | 60 % |

---

## 🛡️ 8. 法務 & 安全ゲート

| フェーズ | 規制チェック | 実装 |
|----------|-------------|------|
| L0‑α | 資金移動 (JP) | Stripe Treasury / Wise Backup |
| 🆕 L0‑β | GDPR Data Deletion | **`DELETE /user-data` API & UI** |
| Step 1 | EU AI Act Opt‑out | Opt‑out & AES‑256 |
| Step 2 | GDPR + 多国籍移動 | Airwallex MSB / SCC |
| Step 3 | SOX / SOC2 / ISMS | Big‑4 + Vanta |

---

## ⚙️ 9. リスク & ガードレール

| リスク | ガードレール |
|--------|-------------|
| 送金詐欺 | 1 日 ¥50 k 上限 + 2FA |
| LoRA 遅延 | INT8 量子化 + Edge Cache |
| コスト暴走 | OpenAI + Treasury ≦ MRR×0.25 |
| Chrome 政策変更 | PWA fallback branch |
| **LoRA 流出** | Adapter 署名 & Storage private |
| **API レート超過** | Caption DL 後 diff 更新 |
| **誤返信** | My Voice OFF fallback |

---

## ✅ 10. “Do Next” TODAY (v3.1 Kick‑off)

1. **branch `l0-beta-style-lora`** を切り Caption Ingest 実装  
2. Supabase “/lora‑adapters” バケット（16 MB 上限）を作成  
3. **`/style-ingest` & `/delete-data`** エンドポイント scaffold  
4. Guardian URL β を 20 % cohort でリリース  
5. Slack #general で **v3.1 パッチ公開** 🚀  

> **Speed = Moat · Trust = Shield · Personalization = Glue**  
> L0‑β で“三位一体” を完成させ、Altman‑Lite へ加速する。