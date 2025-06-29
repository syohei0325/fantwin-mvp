# 🚀 FanTwin ― Hybrid Roadmap “Speed‑&‑Cash L0‑α ➜ Altman‑Lite ➜ World Quest ➜ Mass‑Scale” v3.0

---

## 📍 0. アーキテクチャ全体像

| レイヤ      | L0‑α (Chrome‑Only)               | L1 Altman‑Lite Core            | L2 World‑Quest                 | L3 Mass‑Scale                |
|-------------|----------------------------------|--------------------------------|--------------------------------|------------------------------|
| **UI**      | Chrome Ext (Reply + Payout)      | Creator Console v1             | Dev Campus, Wallet Web        | PWAs / Native               |
| **API**     | `/sendDM`, `/payout`             | SDK `/translate`, `/moderate`  | Guardian RPC, Wallet GraphQL  | Self‑Learning gRPC          |
| **LLM**     | GPT‑4o mini (ja/en)              | Creator‑LLM v1 (LoRA)          | Multi‑Lang LLM 10×            | RL‑Fine‑Tune (RLE)          |
| **Fin**     | Stripe Treasury (JPY→JPY)        | Treasury Multi‑Currency β      | Airwallex RTP / UPI           | Green DC Settlement          |
| **Infra**   | CF Workers + Upstash KV          | Vercel Edge + Supabase         | AWS EKS + Rust MCP            | Green DC (H100×512)          |
| **Ops**     | Grafana / Sentry                 | Temporal Cloud, Loki           | SOC2, GDPR Residency          | SOX / Big‑4 Audit           |

---

## 🏗️ 1. フェーズ別マイルストーン & 期間

| Phase | 期間 | 主 Deliverable | ゴール指標 | 企業価値 (EV) |
|-------|------|----------------|------------|---------------|
| **L0‑α** Speed‑&‑Cash | 0‑2 M | Chrome Ext + Embedded Payouts | GMV ¥3 M / 粗利 40 % | ¥0.8‑1.1 B |
| **STEP 1** Altman‑Lite Core | 2‑30 M | Speed‑Wedge / SDK / Autopilot Lite | ARR ¥1 B | ¥6 B |
| **STEP 2** World‑Quest | 30‑54 M | Multi‑Lang LLM / Dev Campus / Guardian AI / Wallet β | ARR ¥80 B | ¥1 T |
| **STEP 3** Mass‑Scale & IPO | 54‑72 M | Self‑Learning GA / Green DC / IPO readiness | ARR ¥250‑300 B | ¥2‑3 T |

---

## ⏱️ 2. L0‑α ― Speed × Payout (0‑2 M)

> **目的**：最速返信 + 即日 1 % 送金でキャッシュフローと決済ログを掴む

| 週 | 主要タスク | 完了基準 |
|----|-----------|---------|
| W0 | Treasury API PoC (JPY only) | 送金成功 3 件 |
| W1 | p50 Latency < 0.6 s チューニング | Sentry p50/p95 < 0.6 / 1.0 |
| W2 | 1‑Click LP + 自動ドラフト | Wow 完了率 95 % |
| W3 | Unlisted Chrome 申請 | 合格 & URL 取得 |
| W4 | βユーザー 30 名 / NPS 50 | GA4 Survey 回収 |
| W5‑6 | Referral +200Replies / Speed Board 公開 | GMV ¥3 M・粗利 40 % |
| W7‑8 | Team Seat β + Pricing A/B | CVR > 3 %, 粗利維持 |

---

## 🔧 3. Altman‑Lite Core (2‑30 M)

### 3‑1. Post‑MVP Hardening (2‑5 M)
- Error Rate < 0.05 %
- EU AI Act Opt‑out UI 本番
- ARR Run‑rate ¥0.3 B

### 3‑2. Autopilot Lite GA (5‑9 M)
| Task | 完了条件 |
|------|---------|
| 投稿予約 API | 成功率 99 % |
| コメント返信 v1 | BLEU > 0.75 |
| シリーズ A DD | ARR ¥1 B |

---

## 🌍 4. World‑Quest Expansion (30‑54 M)

| モジュール | 期間 | KPI |
|-----------|------|-----|
| Multi‑Lang LoRA | 30‑36 M | BLEU 0.75 / Lat < 0.9 s |
| Dev Campus | 36‑42 M | Dev MAU 5 k |
| Guardian AI | 42‑46 M | 有害率 < 0.1 % |
| Wallet β | 46‑52 M | TPV ¥20 B/年 |
| Self‑Learning β | 52‑54 M | 自動返信率 80 % |

---

## 🏢 5. Mass‑Scale & IPO (54‑72 M)

- **Green DC**：再エネ 100 %、PUE < 1.1  
- **Self‑Learning GA**：自動返信率 95 %  
- **IPO Readiness**：Big‑4 監査 / SOX / SOC2 / ESG IR  

---

## 💰 6. 投資・資金計画

| ラウンド | 時期 | 調達額 | バリュエーション Post |
|---------|------|--------|-----------------------|
| Seed (完) | 2025‑Q3 | ¥150‑200 M | ¥1 B |
| Series A | 2026‑Q2 | ¥500‑600 M | ¥6 B |
| Series B | 2027‑Q2 | ¥5‑7 B | ¥1 T |
| Series C / IPO | 2028‑Q1 | TBD | ¥2‑3 T |

---

## 📊 7. KPI チェックポイント

| フェーズ | GMV/ARR | 粗利 | NDR | Creator 数 |
|----------|---------|------|-----|-----------|
| L0‑α 60d | GMV ¥3 M | 40 % | — | 200 |
| Step 1 30M | ARR ¥1 B | 50 % | 120 % | 10 k |
| Step 2 54M | ARR ¥80 B | 55 % | 130 % | 200 k |
| Step 3 72M | ARR ¥250 B | 60 % | 140 % | 1 M |

---

## 🛡️ 8. 法務 & 安全ゲート

| フェーズ | 規制チェック | 実装 |
|----------|-------------|------|
| L0‑α | 資金移動 (JP) | Stripe Treasury / Wise Backup |
| Step 1 | EU AI Act α | Opt‑out & AES‑256 |
| Step 2 | GDPR + 多国籍資金移動 | Airwallex MSB / SCC |
| Step 3 | SOX / SOC2 / ISMS | Big‑4 + Vanta |

---

## ⚙️ 9. リスク & ガードレール

1. **送金詐欺**：1 日 ¥50 k 上限 + 2FA  
2. **LoRA 遅延**：INT8 量子化 + Edge Cache  
3. **コスト暴走**：OpenAI + Treasury ≦ MRR×0.25  
4. **Chrome ポリシー変更**：PWA fallback branch 常時維持

---

## ✅ 10. “Do Next” TODAY

1. **branch `l0-alpha-payout`** を切り Treasury API を実装  
2. **Chrome Unlisted 用 manifest.min.json** を生成  
3. **Speed Scoreboard** ダッシュボード公開（p50/p95）  
4. **Lang10 コーパス収集タスク** をデータチームに割当  
5. Slack #general で **「Hybrid L0‑α → Altman‑Lite」** ロードマップを全社展開

> **Speed = Moat, Cash = Oxygen, Data = Rocket Fuel.**  
> まずは 60 日で Speed & Cash を掴み、そこから 72 か月で空まで跳ぶ。 🚀