────────────────────────────────────────────────────────────────────────
📑  DOCUMENT 1 – FanTwin **L0‑α / β Speed‑&‑Cash チェックリスト v3.1**  
（Reply‑Speed Wedge × Embedded‑Payouts〈先行〉＋🆕 Style‑LoRA α＋Trust 強化）
────────────────────────────────────────────────────────────────────────

### 0. ゴール（90 日）

- **p50 Latency < 0.5 s**（返信生成）  
- **Embedded‑Payouts β**：送金成功 5 件・手数料 1 %・粗利 ≥ 40 %  
- **Style‑LoRA α**：Style‑Match BLEU ≥ 0.85（YouTube 字幕ベース）  
- **β NPS > 60**（LoRA ON Cohort 30 名）  
- **Chrome Web Store “Unlisted” 合格**（Manifest V3 / Treasury 権限最小）  
- **GDPR Data‑Delete API** を公開ダッシュに記載  
- **GMV ¥3,000,000 / MRR 黒字化** で Altman‑Lite L1 へ移行

---

### 1. KPI 設計（🆕 追加指標 ★）

| 区分 | 目標 (Base / Stretch) | 計測イベント | 改善レバー |
|------|-----------------------|-------------|-----------|
| **T0 Wow 体験** | 95 % | Install → 下書き出現 | 下書き即挿入 & 速度ポップ |
| **D1 Activation** | 70 % / 80 % | Draft → 送信成功 | Enter 1 回送信＋遅延通知 |
| **p50 Latency** | < 0.5 s / < 0.4 s | Workers ログ | RAM キャッシュ＋リージョン最適 |
| **Style‑Match ★** | ≥ 0.85 / ≥ 0.90 | BLEU 自動計測 | LoRA Rank 8 / 量子化 |
| **β NPS** | 60 / 65 | GA4 Survey | Voice ON 勧誘 & Speed Board |
| **GMV→粗利** | ¥3 M / 粗利 40 % | Treasury 送金完了 | Payout CTA＋Referral 報酬 |

---

### 2. プライシング & ユニットエコノミクス

| プラン | 月次上限 | 料金 | LLM | 備考 |
|--------|---------|------|-----|------|
| Free | 300 返信 | ¥0 | 4o‑mini | — |
| Pro | 3,000 返信 | ¥2,980 | 4o‑blend (+LoRA) | — |
| Team | 3,000 × Seat | ¥15,400 / Seat | 4o‑blend (+LoRA) | 最大 50 Seat |
| Payouts | 送金額 × 1 % | – | – | Stripe Treasury / Wise |

> **Cost Guardrail**：`OpenAI + Treasury + LoRA GPU ≤ min(MRR×0.25, $150)`  
> 超過時は Slack Alert → 価格改定検討。

---

### 3. 12‑Week スプリント構成（🆕 W7‑10 追加）

| 週 | 主 Deliverable | 完了基準 |
|----|----------------|---------|
| **W0** | Workers Spike / heartbeat | p50 < 1.2 s |
| **W1** | 1‑Click LP + Wow Flow | Wow 95 % |
| **W2** | Latency チューニング | p50 < 0.5 s / p95 < 0.9 s |
| **W3** | Embedded‑Payout β (JPY) | 送金 5 件・粗利 40 % |
| **W4** | Speed Board 公開 + β NPS | NPS > 50 |
| **W5** | Referral +200 Replies | 招待 20 件・不正 < 1 % |
| **W6** | Team Seat β & billing | 3 チーム導入 |
| **W7** | **🆕 YouTube Caption Ingest α** | 15 k 文 / Creator |
| **W8** | **🆕 LoRA Fine‑Tune α** | Style‑Match ≥ 0.85・GPU ≤ \$2 |
| **W9** | **🆕 “My Voice” ON/OFF** (β flag) | ON Cohort Wow +3 pt |
| **W10** | **🆕 Guardian URL β 20 %** | 有害率 < 0.2 % |
| **W11‑12** | Pricing A/B & SLA バッジ | CVR > 3 % |

---

### 4. Tech / Infra チェックリスト （🆕 追加行★）

| リスク / 要件 | アクション |
|---------------|-----------|
| Manifest V3 keep‑alive | chrome.alarms + heartbeat fetch |
| Workers RateLimit | Region fail‑over & KV warm‑cache |
| Treasury API 更新 | バージョン Pin ＋ Webhook 監視 |
| LLM 価格変動 | mini→nano Fallback ＋ Top‑K キャッシュ |
| KV back‑pressure | write queue＋p95 > 1 s Slack Alert |
| Wise Backup 失敗 | Feature Flag ＋ Smoke Test |
| **LoRA Storage ★** | Supabase “/lora-adapters” 16 MB 上限 |
| **Data Delete API ★** | `DELETE /user-data` 24 h ログ保存 |
| **Style‑Match Eval ★** | BLEU/PPL < 0.85 → 再学習 |

---

### 5. Legal / Compliance（🆕 追加行★）

| 項目 | 60 日内アクション |
|------|----------------|
| 資金移動 (JP) | Treasury 条項を Terms に記載、送金ログ 7 年保存 |
| EU AI Act α | 入力 AES‑256 暗号化＋Opt‑out ON |
| CPRA / LGPD | 用途別チェックボックス＋削除 API |
| PII Mask | Sentry beforeSend で自動マスキング |
| **GDPR Delete ★** | `/user-data` API + UI ボタン |

---

### 6. Growth 施策

| 施策 | 内容 | 効果 |
|------|------|------|
| Speed Scoreboard | p50/p95 をリアルタイム公開 | SNS バイラル |
| Referral +200 Replies | 招待リンクで残量追加 | CAC ≒ 0 |
| SLA バッジ | LP にレイテンシ常時表示 | CVR↑ |
| **My Voice Teaser★** | Style‑Match スコアをツイート | ON 切替率↑ |

---

### 7. Monitoring & Docs

- **Grafana**：p50/p95 Latency・GMV・粗利・Style‑Match（15 min）  
- **Slack Bot**：09:00 JST 日次レポート  
- **Risk Playbook**：GitHub Issues  
- **Alert**：p50 > 0.6 s / 粗利 < 35 % / Style‑Match < 0.80

---

### 8. ブリッジ to Altman‑Lite L1（🆕 追加列★）

| データ | L1 での用途 | 新タスク |
|--------|------------|---------|
| Latency Logs | Speed PR | Edge AI Cache |
| GMV & Payout | Risk Engine Seed | Wallet β |
| NPS Feedback | Creator‑LLM Fine‑Tune | Persona Clusters |
| Referral Graph | Guardian 行動分析 | Dev Campus |
| **Style‑LoRA Adapter★** | Creator Style Continuity | Multi‑SNS Ingest |

---

### TL;DR
**「最速返信 < 0.5 s × 即日 1 % 送金 × パーソナライズ LoRA」** の三位一体を  
90 日で実証し、Speed（Moat）・Trust（Shield）・Personalization（Glue）を完成。  
実データ＋粗利を握ったまま Altman‑Lite L1 へ。Go ship, measure, iterate! 🚀