────────────────────────────────────────────────────────────────────────
📑  DOCUMENT — FanTwin **統合ロードマップ v3.0**
（Hybrid L0‑α Speed‑&‑Cash ➜ Altman‑Lite Core ➜ World‑Quest ➜ Mass‑Scale & IPO）
────────────────────────────────────────────────────────────────────────

### 0. 10 秒ピッチ
> **「最速 DM＋即日 1 % 送金でキャッシュを掴み、  
>  データと AI を多層ターボで回して“世界 1 M クリエイター OS”へ爆速拡張する」**

---

## 1. フェーズ全体像（0‑72 M）

| Step | 期間 | 主リリース | ゴール指標 | 想定 EV |
|------|------|-----------|-----------|---------|
| **L0‑α** Speed‑&‑Cash | 0‑2 M | Chrome Ext + Embedded Payouts | GMV ¥3 M / 粗利 40 % | **¥0.8‑1.1 B** |
| **STEP 1** Altman‑Lite Core | 2‑30 M | Speed‑Wedge / SDK / Autopilot Lite | ARR ¥1 B | **¥6 B** |
| **STEP 2** World‑Quest Expansion | 30‑54 M | 多言語 LLM・Dev Campus・Guardian AI・Wallet β | ARR ¥50‑80 B | **¥0.8‑1 T** |
| **STEP 3** Mass‑Scale & IPO | 54‑72 M | Self‑Learning GA・Green Cloud DC・IPO準備 | ARR ¥250‑300 B | **¥2‑3 T** |

---

## 2. ステージ詳細 & 資金調達

| Stage | 主要 Deliverable | Key Metric | 資金調達 |
|-------|-----------------|-----------|---------|
| **L0‑α** (0‑2 M) | Speed < 0.5 s + 送金 1 % β | GMV ¥3 M | Angel SAFE ¥20 M |
| **L1‑MVP** (2‑5 M) | Post‑MVP Hardening | ARR Run‑rate ¥0.3 B | Pre‑seed ¥50 M |
| **L1‑GA** (5‑9 M) | Autopilot Lite GA | ARR ¥1 B / NPS 65 | Seed ¥150‑200 M |
| **W‑Lang AI** (30‑36 M) | 10 言語 LLM | BLEU ≥ 0.75 | — |
| **Dev Campus** (36‑42 M) | SDK + RevShare | Dev MAU 5 k | — |
| **Guardian AI** (42‑46 M) | URL + Toxicity | 有害率 < 0.1 % | — |
| **Fan Wallet β** (46‑52 M) | 3 秒送金 / RTP | TPV ¥20 B/年 | Series B 前準備 |
| **Self‑Learn AI β** (52‑54 M) | Engagement RL | 自動化率 80 % | — |
| **Green DC** (54‑62 M) | 再エネ GPU クラスタ | PUE < 1.1 | Series B ¥5‑7 B |
| **IPO Readiness** (66‑72 M) | Big‑4 監査 / SOX | 黒字 & SOC‑2 | 公開市場 / M&A |

---

## 3. 技術マイルストーン

1. p50 Latency < 0.5 s — 2 M  
2. Embedded‑Payouts β（JPY→JPY）— 2 M  
3. Autopilot Lite GA — 9 M  
4. 多言語 LoRA (10×) — 36 M  
5. Guardian AI α (URL) — 44 M  
6. Wallet RTP 3 s — 50 M  
7. Self‑Learning GA — 60 M  
8. Green DC 完成 — 62 M  

---

## 4. リスク & 先回り対策

| リスク | 先回り対策 |
|--------|-----------|
| 送金詐欺 / AML | Stripe Treasury + 2FA + 上限 ¥50 k/日 |
| LLM コスト高騰 | LoRA Distill + INT8 + Cache |
| API 規約変更 | SNS 抽象 Puller + Feature Flags |
| EU AI Act GPAI | 入力暗号化 + Opt‑out API |
| 再エネ確保 | 地熱長期契約 + オフセット購入 |

---

## 5. 資金戦略サマリ

| ラウンド | 時期 | 調達額 | 主用途 |
|----------|------|--------|--------|
| Seed (完了) | 2025‑Q3 | ¥150‑200 M | Autopilot Lite GA |
| Series A | 2026‑Q2 | ¥500‑600 M | 多言語 LLM + Wallet β |
| Series B | 2027‑Q2 | ¥5‑7 B | Green DC + Self‑Learning GA |
| IPO / M&A | 2028‑Q3 | TBD | GTM 拡大 & 買収 |

---

## 6. クォーター別ロードマップ（抜粋）

| Q | ハイライト |
|---|-----------|
| 25‑Q1/Q2 | **L0‑α Speed & Cash** 完了、Chrome 公開 |
| 25‑Q3/Q4 | Autopilot Lite GA、ARR ¥1 B、Series A |
| 26‑Q1/Q2 | World‑Lang LLM、Dev Campus LP |
| 26‑Q3/Q4 | Guardian AI α、Wallet β |
| 27‑Q1/Q2 | Wallet GA、Self‑Learning β |
| 27‑Q3/Q4 | Green DC 完成、ARR ¥80 B |
| 28‑Q1/Q2 | ARR ¥250 B、IPO フィリング |
| 28‑Q3/Q4 | 上場 or 大型 M&A |

---

## 7. ガントチャート (Mermaid)

```mermaid
gantt
    dateFormat  YYYY-MM
    title FanTwin Master Timeline v3.0

    section L0‑α Speed & Cash
    MVP Freeze               :a1, 2025-07-01, 2w
    Embedded Payouts β       :a2, after a1, 4w
    Chrome Unlisted Review   :a3, after a2, 2w
    Beta & Metrics           :a4, after a3, 4w

    section Step1 Altman‑Lite Core
    Post-MVP Hardening       :b1, 2025-09-01, 3M
    Autopilot Lite GA        :b2, after b1, 6M

    section Step2 World Quest
    World‑Lang LLM           :c1, 2026-07-01, 6M
    Dev Campus               :c2, after c1, 6M
    Guardian AI              :c3, after c1, 4M
    Fan Wallet β             :c4, after c3, 6M
    Self‑Learning β          :c5, after c4, 2M

    section Step3 Mass‑Scale
    Green Cloud DC           :d1, 2027-07-01, 8M
    Self‑Learning GA         :d2, after d1, 4M
    IPO Window               :d3, after d1, 12M

    TL;DR
	1.	0‑2 M (L0‑α)：最速返信 & 1 % 送金でキャッシュと決済ログを掴む → EV ¥0.8‑1.1 B。
	2.	2‑30 M：Altman‑Lite Core で ARR ¥1 B／EV ¥6 B。
	3.	30‑54 M：多言語・Guardian・Wallet で ARR ¥80 B／EV ¥1 T。
	4.	54‑72 M：Self‑Learning × Green DC で ARR ¥250 B／EV ¥2‑3 T、IPO へ。

Speed = Moat, Cash = Oxygen, Data = Rocket Fuel.
この 4 段ロケットで “ポスト Rakuten” 級の規模を狙います。
Go ship, measure, iterate! 🚀