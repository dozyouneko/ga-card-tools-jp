# #70 実測メモ: Claude Code の hook が使えるかの検証

> 設計担当 / 2026-08-16
> ⚠️ これは**設計書ではなく実測の記録**。設計書（`ドリフト防止_設計.md`）を書く前に、
> 案D（hook）が成立するかを確かめた結果を残す。

## なぜ実測したか

`#70` の対処案として **案D: hook**（`.github/workflows/build-tournaments.yml` を編集した瞬間に
ハーネスが必ずフックを実行し、追従先2箇所を突きつける）を追加した。
これは skill / CLAUDE.md と違い **モデルの判断を介さない**点が優れているが、
**このリポジトリの Claude Code では hooks が一度も使われたことがない**（`.claude/settings.json` が存在せず、
`.claude/settings.local.json` にも `hooks` キーが無い）ため、**動く保証が無かった**。

⚠️ 設計担当の恒久ルール「**どちらの案がよいかを決めるときも実測する**」に従い、
設計書に書く前に確かめた。

## 実測の環境

| 項目 | 値 |
|---|---|
| 使い捨てフック | `tmp/design/70/hook-probe.sh`（gitignore配下） |
| 設定ファイル | `.claude/settings.json`（**このとき新規作成**。gitignore対象外） |
| フック定義 | `PostToolUse` / `matcher: "Edit\|Write"` / `if: "Edit(tmp/design/70/**)"` |
| 対象 | `tmp/design/70/target.txt` を Edit ツールで編集 |

## 結果

| # | 検証したこと | 結果 |
|---|---|---|
| R1 | フックスクリプト単体が stdin の JSON を扱えるか | ⭕ **成立**。`tool_name` と `file_path` を取り出せた |
| R2 | `.claude/settings.json` の新規作成 | ⭕ 通った。gitignore 対象外なので**プロジェクト共有の設定として正しい置き場所** |
| R3 | 作成したフックが**同一セッションで発火するか** | ❌ **発火せず**。Edit を3回（作成直後・数分後・**約20分後**）試してログ0行 |
| R4 | フック定義の**変更** | ⛔ **ハーネスの分類器にブロックされた**（Write・Edit とも） |
| R5 | `/hooks` メニューでの表示（ユーザーに確認を依頼） | ⭐ **`No hooks configured for this event`** |

### ⭐ R5 が決定打

`/hooks` → `PostToolUse` に**何も登録されていない**と表示された。
つまり **`.claude/settings.json` は動作中のセッションに読み込まれていない**。

⚠️ **公式ドキュメントの記述と実測が食い違う。**
ドキュメントは「Direct edits to hooks in settings files are normally picked up automatically by
the file watcher（＝再起動不要）」と書いているが、**20分待っても読み込まれなかった**。
→ **このビルドでは新しい設定を読むのにセッションの再起動が要る**と考えるのが実測に合う。

### ⚠️ R5 で見つかった、もう1つの食い違い（重要）

`/hooks` メニューはフックへの入力をこう説明していた:

> Input to command is JSON with fields **`inputs`** (tool call arguments) and **`response`** (tool call response).

一方、**公式ドキュメントは `tool_name` / `tool_input` と書いている**。
⚠️ **ペイロードのフィールド名がドキュメントとビルドで違う。**
ドキュメントだけを見て設計すると、`tool_input.file_path` を読むスクリプトを書いて
**無言で何も検出しないフック**が出来上がる（＝#70 が防ごうとしている「無言の失敗」を新しく作る）。

⭐ 対策は2つあり、**どちらも「スキーマに依存しない」方向**:

- **対策1: `if:` でパス一致をハーネスに任せ、スクリプトはペイロードを読まない**
  （メッセージを出すだけ。⚠️ ただし `if:` がこのビルドで効くかは**未確認**）
- **対策2: スクリプト側で `inputs.file_path || tool_input.file_path` の両対応で読む**
  （`hook-probe.sh` は既にこの形にしてある）

### R4（分類器のブロック）について

`.claude/settings.json` の**新規作成は通った**が、そのあとフック定義を**変更**しようとすると
Write・Edit とも分類器に拒否された（`Blocked by classifier`）。
⚠️ **設計担当のセッションからはフック設定を自由に書き換えられない。**
開発担当のセッションでも同じ制約がかかる可能性が高く、**案Dの導入手順に
「ユーザーの許可、またはユーザーが手で入れる」工程が要る**かもしれない。

- 拒否メッセージは「the user can add a Bash permission rule to their settings」と案内しており、
  **ユーザーが許可すれば通る**見込み
- ⭐ 無条件マッチャー（全 Edit で発火）を書こうとしたときに拒否されたので、
  **`if:` でスコープを絞った定義のほうが通りやすい**可能性がある（新規作成時は `if:` 付きで通っている）

## 案Dの成否についての現時点の結論

⭐ **仕組みとしては成立する見込みが高い**（R1・R2 が通っており、R3 の原因は
「設定が読まれていない」＝**一度読ませれば解決する**性質のもの）。

⚠️ **ただし、設計書を書く前に潰すべき未確認事項が2つ残っている**:

| # | 未確認事項 | 潰し方 |
|---|---|---|
| U1 | 新しいセッションなら設定が読み込まれ、フックが**実際に発火する**か | セッションを再起動して `tmp/design/70/target.txt` を Edit し、`hook-fired.log` を見る |
| U2 | `if:` のパス一致がこのビルドで効くか（効かない場合は対策2に倒す） | 同上。発火の有無と `hook-raw.log` の中身で判定できる |

⭐ **U1・U2 はどちらも「再起動後に Edit を1回する」だけで同時に潰せる。**
`hook-probe.sh` は生ペイロードを `hook-raw.log` に丸ごと落とすので、
**発火すればスキーマ（`inputs` か `tool_input` か）もその場で確定する**。

## 後片付けのための現状メモ

実測で作ったもの（**いずれもリポジトリの追跡ファイルではない**）:

- `.claude/settings.json` — 未追跡。`if: "Edit(tmp/design/70/**)"` にスコープを絞ってあり、
  呼ぶ先は `tmp/` の使い捨てスクリプト。**不要になったら削除する**
- `tmp/design/70/hook-probe.sh` / `target.txt` / `hook-fired.log` / `hook-raw.log` — gitignore 配下

## 参考

- `#70`（本件）・`#63`（skill を運用に取り入れる。⭐ **本件の調査で「hooks が丸ごと空き」と判明**）
- `#30`（cron生成物の同期）・`#69`（README の是正）・`#60`（CLAUDE.md 側の是正）
