# 開発環境 再構築手順書(ディザスタリカバリ)

作成: 2026-07-11 / 改訂: 2026-08-08(issue #9 — コンテナ再構築シナリオの追加と自動復旧の導入)。

> ⚠️ この手順書にはシークレットの値は書かない(リポジトリが公開のため)。
> シークレットは「どこで再発行できるか」だけを記す。バックアップの取り方は末尾を参照。

## 📖 まず読む: あなたはどちらのシナリオか

| | シナリオ | 状況 | 頻度 | 失われる範囲 |
| --- | --- | --- | --- | --- |
| **A** | [**コンテナ再構築**](#シナリオa-コンテナ再構築頻度-高) | VS Code の "Rebuild Container"、Docker Desktop の再作成、イメージ更新など。**PCもリポジトリも無事** | **高** | `/home/node` 配下だけ |
| **B** | [**PC故障・別PCでゼロから**](#シナリオb-pc故障や別pcからのゼロ再構築手順17) | PCが壊れた/新しいPCで再開する | 低 | **すべて**(OS・Docker・clone から) |

判定規則はこれだけ(2026-08-08 実測。`/workspaces` は Windows の `D:\` の9pバインドマウント、
`/` と `/home/node` はコンテナの overlayfs):

> ⭐ **`/workspaces/claude-test-vsc` の下にあるものは残る。それ以外(`/home/node` 含む)は消える。**

- **シナリオA** → [シナリオA](#シナリオa-コンテナ再構築頻度-高)へ。大半は `.devcontainer/setup.sh` が自動で復旧する
- **シナリオB** → [シナリオB](#シナリオb-pc故障や別pcからのゼロ再構築手順17)(手順1〜7)へ。
  前半(手順1〜5)は人間の手作業、**手順6以降はClaude Codeに「docs/dev-setup.md の手順6以降を実行して」と指示すれば任せられる**

## 環境の全体像

| 層 | 内容 | PC故障の影響 |
| --- | --- | --- |
| コード | GitHub: <https://github.com/dozyouneko/ga-card-tools-jp> (main) | なし(クラウド) |
| 本番 | Cloudflare Pages `ga-card-tools-jp`(push時に自動デプロイ)+ D1 `ga-deck-builder` | なし(クラウド) |
| 認証 | Discord Developer Portal のOAuthアプリ(Redirect URI 登録済み) | なし(クラウド) |
| 開発環境 | Windows + Docker Desktop(WSL2)+ VS Code Dev Containers。コンテナ定義は `.devcontainer/devcontainer.json`(Node 20 + Claude Code CLI 自動インストール) | **失われる → 本書で再構築** |
| git管理外ファイル | `tmp/`(計画メモ類)・`.dev.vars`・`~/.cloudflare-token`・`~/.claude`(Claudeのmemory)・`.claude/settings.local.json` | **失われる → バックアップから復元 or 再発行** |

必要なアカウント(パスワードマネージャ等で復旧できること): GitHub / Cloudflare / Discord / Anthropic(Claude)。

---

# シナリオA: コンテナ再構築(頻度: 高)

リポジトリ(`/workspaces/claude-test-vsc`)はWindowsホストの `D:\` をバインドマウントしているので**そのまま残る**。
消えるのはコンテナのファイルシステム(overlayfs)上、つまり **`/home/node` 配下と OS に入れたパッケージ**だけ。

## A-1. 何が残り、何が消えるか(2026-08-08 実測)

### ✅ 残るもの(バインドマウント上)

| パス | 内容 |
| --- | --- |
| `.git/` | リポジトリ。**未pushのローカルコミットも残る** |
| `node_modules/` | 依存パッケージ(⚠️ ただし Playwright は例外 → [A-5](#a-5-playwright)) |
| `tmp/` | 計画メモ・検証成果物・`env-backup-*.tar.gz` |
| `.dev.vars` | Discord OAuth の ID/Secret |
| `.devcontainer/certs/norton-root.crt` | Norton ルートCA |
| `.claude/settings.local.json` | Claude Code の権限設定 |

### ❌ 消えるもの(overlayfs上)

| 対象 | 復旧 |
| --- | --- |
| `gh` CLI **本体ごと**(+ `/etc/apt/sources.list.d/github-cli.list`) | 🤖 `setup.sh` が自動 |
| `python3-pil` / `fonts-noto-cjk`(宣伝画像の生成用) | 🤖 `setup.sh` が自動 |
| Playwright(**npmパッケージと Chromium 本体の両方**) | 🤖 `setup.sh` が自動 |
| グローバルnpm `@anthropic-ai/claude-code` | 🤖 `postCreateCommand` が自動 |
| Norton ルートCAのシステム信頼ストア登録 | 🤖 `postCreateCommand` が自動(証明書ファイル自体は残る) |
| **`~/.config/gh/`(gh の認証)** | 🖐 **手作業** → [A-3](#a-3-再構築後にやること手作業3件) |
| **`~/.cloudflare-token`** | 🖐 **手作業** → [A-3](#a-3-再構築後にやること手作業3件) |
| **`~/.claude/projects/-workspaces-claude-test-vsc/memory/`** | 🖐 手作業(**任意**) → [A-3](#a-3-再構築後にやること手作業3件) |

## A-2. 自動で復旧されるもの — `.devcontainer/setup.sh`

`devcontainer.json` の `postCreateCommand` の**最後**で `bash .devcontainer/setup.sh` が走る。
再構築後に自分で何かを打つ前に、**もう終わっている前提でよい**(コンテナ作成に約3〜5分が加算される)。

### 責務(やること)

1. **gh CLI** — aptのkeyring/ソース定義を作り直して `gh` を導入
2. **python3-pil / fonts-noto-cjk** — apt で導入
3. **Playwright** — 2段階で復旧する
   - **S3-a**: Chromium の起動に必要な**共有ライブラリ14個**を apt で導入(素のイメージには入っていない)
   - **S3-b**: `playwright@1.61.1` を `npm install --no-save --no-package-lock` で導入し、`npx playwright install chromium`
4. **診断表示** — 復旧状況の表を出し、**残っている手作業の件数**を最終行に出す

### 非責務(やらないこと)とその理由

| やらないこと | 理由 |
| --- | --- |
| `gh auth login` | **対話が必要**。トークンをリポジトリや環境変数に置くのは論外 |
| `~/.cloudflare-token` の復元 | シークレット。自動展開は影響が大きい |
| Claude Code メモリーの復元 | 内容がセッション固有で、**古い状態の復元がむしろ有害**になりうる |
| `package.json` への Playwright 追加 | 本番 Cloudflare Pages のビルドで Chromium一式(**実測294MB**)のDLが走るリスク |

### 性質

- **冪等**。導入済みのステップはスキップする(2回目は1秒程度で終わる)
- ⭐ **自己修復する**。Playwright のスキップ判定には「**不足共有ライブラリが0個**」も含まれるので、
  ライブラリを1つ失った(あるいは Playwright を上げて必要ライブラリが増えた)だけでも
  **S3 はスキップされずに再実行され、apt が不足を埋める**。
  → 「診断は ✅ なのに `chromium.launch()` が落ちる」状態にならない
- **絶対に失敗しない**(常に `exit 0`・`postCreate` 側も `|| true`)。
  1つのステップが失敗しても後続は実行され、診断表まで必ず到達する
- **シークレットの値は出力しない**(有無だけを出す)

### 手動での再実行

```bash
npm run setup:env      # = bash .devcontainer/setup.sh
```

診断表だけ見たい / `npm install` で消えた Playwright を戻したいときはこれを打つ。

テスト用の環境変数(通常は使わない):

```bash
GA_SETUP_SIMULATE_FAILURE=gh,apt npm run setup:env   # 指定ステップを疑似的に失敗させる
GA_SETUP_SKIP=playwright npm run setup:env           # 指定ステップを飛ばす(短時間で回す用)
```

### 診断表示の読み方

```text
━━━━━━ 開発環境 復旧状況 ━━━━━━
[自動] gh CLI             : ✅ 2.97.0
[自動] python3-pil        : ✅ 導入済み
[自動] fonts-noto-cjk     : ✅ 導入済み
[自動] Playwright         : ✅ playwright@1.61.1 / chromium-1228 / 不足ライブラリ 0
[手動] gh 認証            : ❌ 未ログイン    → gh auth login
[手動] Cloudflareトークン : ❌ 無し          → docs/dev-setup.md 手順5
[手動] Claude メモリー    : ❌ 空            → バックアップから復元(任意)
[手動] .dev.vars          : ✅ 有り
[情報] Norton証明書       : ✅ 有り
[情報] git identity       : dozyouneko <1020dozyouneko@gmail.com>

━━━━━━ 手作業が 3 件 残っています ━━━━━━
詳細: docs/dev-setup.md
```

- `[自動]` = スクリプトが面倒を見る / `[手動]` = **人間の作業が要る** / `[情報]` = 確認のみ(判定しない)
- **最終行の件数が 0 になれば復旧完了**。⚠️ **`[情報]` 行は件数に数えない**。
  Norton証明書は**使っていない環境では「無いのが正常」**で、数えると常に1件残る表示になり、
  ⭐ **件数そのものが信用されなくなる**ため
- `.dev.vars` はコンテナ再構築では**残る**ので通常は ✅。`[手動]` にしてあるのは
  **PC故障シナリオ(シナリオB)では欠落が致命的**だから(→ [手順5](#5-シークレットの復元-or-再発行手作業))
- Playwright 行の **`不足ライブラリ N`** が 0 以外なら、Chromium は**取得できていても起動しない**。
  そのときは表に脱出口が出る(→ [A-5](#a-5-playwright)):

  ```text
  [自動] Playwright         : ❌ 共有ライブラリが 3 個不足 → npx playwright install-deps chromium
  ```

## A-3. 再構築後にやること(手作業3件)

### ① 診断表示を確認する

```bash
npm run setup:env
```

(`postCreateCommand` ですでに走っているので、これは**表を出し直すだけ**で数秒で終わる。)

### ② `gh auth login` — GitHub CLI の認証 【必須】

```bash
gh auth login
```

`GitHub.com` → `HTTPS` → `Login with a web browser` を選び、表示されたワンタイムコードをブラウザで入力する。

確認:

```bash
gh auth status
gh issue list --label 実装待ち
```

⚠️ **タスク管理がGitHub Issuesなので、これをやらないとセッションの運用が一切できない。**
詳細は [A-4](#a-4-gh-github-cli)。

### ③ `~/.cloudflare-token` を戻す 【wrangler を使うなら必須】

⚠️ **このファイルは `/home/node` 配下なので、PC故障だけでなくコンテナ再構築でも消える。**

バックアップ(`tmp/env-backup-*.tar.gz`)から戻すか、再発行する(→ [手順5](#5-シークレットの復元-or-再発行手作業))。

```bash
# バックアップから戻す例(⚠️ 中身は表示しない)
tar xzf tmp/env-backup-<最新の日付>.tar.gz -C /home/node .cloudflare-token
chmod 600 /home/node/.cloudflare-token
ls -l /home/node/.cloudflare-token       # 有無だけ確認する
```

### ④ Claude Code のメモリー 【任意・戻さなくてよい】

`~/.claude/projects/-workspaces-claude-test-vsc/memory/` は消えるが、
**恒久的な運用ルールは `CLAUDE.md`(git管理)にあるので、戻さなくても支障はない**。
メモリーに入るのは「待ち行列・進行中の状態・セッション固有の教訓」で、**古い状態の復元はむしろ有害**なことがある。

戻したい場合のみ:

```bash
tar xzf tmp/env-backup-<最新の日付>.tar.gz -C /home/node .claude/projects/-workspaces-claude-test-vsc/memory
```

## A-4. gh (GitHub CLI)

タスク管理をGitHub Issuesで行っているため(`CLAUDE.md`「タスク管理」節)、**`gh` は運用の命綱**。
コンテナ再構築では**本体・認証の両方**が消える。

| | 復旧 | 理由 |
| --- | --- | --- |
| **本体**(`/usr/bin/gh` と aptソース定義) | 🤖 `setup.sh` が自動 | 手順が固定で対話が要らない |
| **認証**(`~/.config/gh/hosts.yml`) | 🖐 `gh auth login` を人間が実行 | **ブラウザでのワンタイムコード入力が必須**で自動化できない。トークンをリポジトリに置くのは論外 |

手動で本体だけ入れ直したい場合(`setup.sh` の S1 と同じ内容):

```bash
sudo mkdir -p -m 755 /etc/apt/keyrings
curl -fsSL https://cli.github.com/packages/githubcli-archive-keyring.gpg \
  | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null
sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" \
  | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null
sudo apt-get update -qq && sudo apt-get install -y gh
```

⚠️ ソース定義は **`tee` で上書き**する(`>>` で追記すると再実行のたびに重複行が増える)。

## A-5. Playwright

サイトの検証に使う(`CLAUDE.md`「環境の注意」)。**npmパッケージも Chromium 本体も消える。**

### ⚠️ 最重要: `npm install` を打つと Playwright は消える

`node_modules/` はバインドマウント上なので再構築では消えない。にもかかわらず Playwright だけ無くなるのは、

- `playwright` は `package.json` に**入っていない**(意図的。→ [A-2 の非責務](#非責務やらないこととその理由))
- `npm install` は `--no-save` で入った **extraneous パッケージを prune する**

から。⭐ **これは再構築時だけの話ではない。平常時に `npm install` を打っても同じく消える。**

戻し方:

```bash
npm run setup:env      # Playwright が無ければ入れ直す(あればスキップ)
```

手動で入れる場合(`setup.sh` の S3 と同じ内容):

```bash
# S3-a: Chromium の起動に必要な共有ライブラリ(素の devcontainer イメージには入っていない)
sudo apt-get install -y libasound2 libatk1.0-0 libatk-bridge2.0-0 libatspi2.0-0 libcups2 \
  libdbus-1-3 libgbm1 libnspr4 libnss3 libxcomposite1 libxdamage1 libxfixes3 libxkbcommon0 libxrandr2

# S3-b: npmパッケージ + Chromium 本体
PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1 npm install --no-save --no-package-lock --no-audit --no-fund playwright@1.61.1
npx playwright install chromium
```

⚠️ **`--no-package-lock` を必ず付ける**(`--no-save` だけでは `package-lock.json` が更新されうる)。

### 使うときの注意

NortonのHTTPS検査があるため、ヘッドレスブラウザは証明書エラーになる。次の2つを必ず付ける:

```js
const browser = await chromium.launch({ args: ["--ignore-certificate-errors"] });
const ctx = await browser.newContext({ ignoreHTTPSErrors: true });
```

### ⚠️ Chromium の起動には共有ライブラリが要る(S3-a が自動で入れる)

**素の devcontainer イメージには、Chromium が依存する共有ライブラリ
(`libnspr4` / `libnss3` / `libgbm1` / `libatk1.0-0` ほか)が入っていない。**
無いと Chromium 本体の取得までは成功するのに、`chromium.launch()` が次で落ちる:

```text
error while loading shared libraries: libnspr4.so: cannot open shared object file: No such file or directory
```

`setup.sh` の **S3-a が上記14個を apt で導入する**ので、通常は意識しなくてよい
(依存込み54パッケージ / 約11MB)。⚠️ **`npx playwright install-deps` は既定では使わない** —
106パッケージ・91MB になり、`xvfb`・mesa一式・多言語フォントまで入るため。

#### 不足の検知は「診断が ✅ なのに起動しない」を防ぐためにある

`setup.sh` は `ldd` で `chrome` と `chrome-headless-shell` の **`not found` を数える**。
この数が **スキップ判定にも診断表示にも入っている**:

| 状態 | S3 の挙動 | 診断表示 |
| --- | --- | --- |
| 不足 0 | ⏭ スキップ | `✅ … / 不足ライブラリ 0` |
| 不足あり | **スキップせず再実行し、apt が埋める** | 埋まれば `✅` |
| 埋めても不足が残る | ステップを失敗として記録 | `❌ 共有ライブラリが N 個不足 → npx playwright install-deps chromium` |

⭐ つまり**将来 Playwright を上げて必要ライブラリが増えても、`npm run setup:env` を打つだけで追随する**。
それでも足りない(＝14個の指定では不足するようになった)場合だけ、表示された
`npx playwright install-deps chromium` を手で打つ。

自分で不足を数えたいとき:

```bash
ldd ~/.cache/ms-playwright/chromium-*/chrome-linux64/chrome | grep -c 'not found' || true
ldd ~/.cache/ms-playwright/chromium_headless_shell-*/chrome-headless-shell-linux64/chrome-headless-shell | grep -c 'not found' || true
```

> ⚠️ **不足が0のとき `grep -c` は `0` を表示したうえで exit 1 を返す**(grepの仕様。1件も一致しないため)。
> 「失敗した」と読み違えないよう `|| true` を付けてある。**表示された数字のほうが答え**。
> (`setup.sh` 本体はこの終了コードに依存していないので影響を受けない)

## A-6. ⚠️ git identity はホスト環境に依存する

`~/.gitconfig` は overlayfs 上にあるが、**VS Code Dev Containers が Windows ホストの gitconfig をコピーする**ため
再構築後も存在する。ただし実効値の出どころが分かれている:

```bash
$ git config --show-origin --get user.name
file:.git/config             dozyouneko                 # ← バインドマウント上。残る
$ git config --show-origin --get user.email
file:/home/node/.gitconfig   1020dozyouneko@gmail.com   # ← ホストからのコピーに依存
```

⚠️ **コミットのメールアドレスだけがホスト環境に依存している**という隠れ依存がある。
`setup.sh` の診断表示が `[情報] git identity` として実効値を出すので、**再構築後は一度目で確認する**。
食い違っていたら [手順4](#4-dev-containerを開く手作業) の `git config` を実行する。

---

# シナリオB: PC故障や別PCからのゼロ再構築(手順1〜7)

PCが故障して**何もない状態**から、現在と同等の開発環境を再構築するための手順。
前半(手順1〜5)は人間の手作業、**手順6以降はClaude Codeに任せられる**。

> 📌 コンテナを作り直すだけなら[シナリオA](#シナリオa-コンテナ再構築頻度-高)で足りる。以下は不要。

## 1. Windowsにインストールするもの(手作業)

1. **ブラウザ** — 各サービスにログインできるようにする
2. **Docker Desktop** — インストーラがWSL2の有効化まで面倒を見る。起動して Settings > General で「Use the WSL 2 based engine」が有効なことを確認
3. **Visual Studio Code** + 拡張機能 **Dev Containers**(ms-vscode-remote.remote-containers)
4. (Git for Windows は必須ではない。cloneはVS Code内から行える)

## 2. リポジトリのclone(手作業)

VS Codeのコマンドパレット →「Git: Clone」→ GitHubにサインイン →
`https://github.com/dozyouneko/ga-card-tools-jp.git` をcloneする。

> 📌 **cloneするフォルダ名は `claude-test-vsc` にする**(例: `C:\dev\claude-test-vsc`)。
> Claude Codeのmemoryはワークスペースのパス名に紐づくため、フォルダ名を揃えるとmemoryの復元がそのまま効く。
> VS Codeのclone時はフォルダ名を選べないので、cloneしてからフォルダ名を変更 → そのフォルダを開き直すのが簡単。

## 3. Norton証明書(Nortonを使う場合のみ・手作業)

NortonのHTTPS検査が通信に割り込むため、ルート証明書をコンテナに教える必要がある。

1. Windowsの証明書マネージャ(`certmgr.msc`)→「信頼されたルート証明機関」から Norton/Symantec のルートCAを探す
2. 「エクスポート」→ **Base-64 encoded X.509 (.CER)** 形式で保存
3. cloneしたフォルダの `.devcontainer/certs/norton-root.crt` に置く(フォルダは作る。git管理外)

Nortonを使っていない(または割り込みがない)場合はスキップしてよい。devcontainerはファイルがなくても正常に動く。

## 4. Dev Containerを開く(手作業)

対象フォルダをVS Codeで開く → 右下の通知 or コマンドパレットから **「Reopen in Container」**。
初回はイメージ取得+`postCreateCommand`(npm install / Claude Code CLIのグローバルインストール / Norton証明書の登録 /
**`.devcontainer/setup.sh` による環境復旧**)が走る。最後に出る診断表で、残っている手作業を確認すること(→ [A-2](#a-2-自動で復旧されるもの--devcontainersetupsh))。

完了したらコンテナ内ターミナルで:

```bash
claude   # → 指示に従いAnthropicアカウントでログイン(ブラウザ認証)
```

git のユーザー情報も設定しておく(コミット時に使われる):

```bash
git config user.name "dozyouneko"
git config user.email "1020dozyouneko@gmail.com"
```

## 5. シークレットの復元 or 再発行(手作業)

バックアップがあれば所定の場所に戻すだけ。なければ再発行する。

> ⚠️ **`/home/node` 配下(`.cloudflare-token` / Claudeのmemory)は、PC故障だけでなく
> [コンテナ再構築](#シナリオa-コンテナ再構築頻度-高)でも消える。**
> シナリオAの場合はこの表のうち **`~/.cloudflare-token`** と **memory** の2つだけを見ればよい
> (`.dev.vars` / `tmp/` / `.claude/settings.local.json` はバインドマウント上なので残る)。
> `~/.config/gh/`(gh の認証)も同様に消えるが、**バックアップ対象ではなく `gh auth login` で入れ直す**
> → [A-4](#a-4-gh-github-cli)。

| ファイル | 内容 | 再発行方法 | コンテナ再構築で消える? |
| --- | --- | --- | --- |
| `/home/node/.cloudflare-token` | Cloudflare APIトークン(1行、`chmod 600`) | Cloudflareダッシュボード > My Profile > API Tokens > Create Token。権限: **Account/D1:Edit、Account/Cloudflare Pages:Edit、Account/Account Settings:Read、Account/Account Analytics:Read、User/User Details:Read** | ⚠️ **消える**(`/home/node` 配下) |
| `.dev.vars`(リポジトリ直下) | `DISCORD_CLIENT_ID=...` と `DISCORD_CLIENT_SECRET=...` の2行 | Discord Developer Portal > 対象アプリ > OAuth2。Client IDは表示されている値、Secretは「Reset Secret」で再発行。**Secretを再発行したら本番Pagesのsecret(下記の注意参照)も更新すること** | ✅ 残る |
| `~/.claude/projects/-workspaces-claude-test-vsc/memory/` | Claude Codeのmemory | バックアップからのみ復元可(なければClaudeが徐々に再学習)。**恒久ルールは `CLAUDE.md`(git管理)にあるので復元は任意** | ⚠️ **消える**(`/home/node` 配下) |
| `tmp/`(リポジトリ直下) | 計画メモ・手順書類 | バックアップからのみ復元可 | ✅ 残る |
| `.claude/settings.local.json` | Claude Codeの権限設定 | バックアップから復元。なければ使いながら再許可 | ✅ 残る |

> wranglerは `wrangler login`(OAuth)がdevcontainer内で使えないため、APIトークン方式で使う:
> `CLOUDFLARE_API_TOKEN=$(cat /home/node/.cloudflare-token) CLOUDFLARE_ACCOUNT_ID=53dcf4e7f02ea5e504977816a68865f5 npx wrangler <cmd>`
>
> 本番Pagesの環境変数は必ず **secret_text(暗号化変数)** で設定する。plain_textはwrangler.tomlに毎デプロイ上書きされて消える。
>
> ⚠️ **`Account Analytics: Read` は運営ダッシュボード(`npm run dashboard`・#56)が使う。**
> これが無いと Web Analytics の GraphQL が `not authorized for that account` を返し、
> ダッシュボードの**閲覧セクションだけ**がエラー表示になる(他のセクションは通常どおり出る)。
> 既存トークンに権限を1行追加するだけなら `~/.cloudflare-token` の値は変わらない。

## 6. ここからClaude Codeに任せる

コンテナ内で `claude` を起動し、次のように指示すればよい:

> docs/dev-setup.md の手順6以降を実行して、ローカル開発環境の動作確認までやって

Claudeがやること:

1. `npm install`(postCreateで済んでいるはずだが確認)
2. `npm run db:migrate:local` — ローカルD1(`.wrangler/state`)に `migrations/` 配下を順に適用
   (空のDB向け。⚠️ 適用済みのDBでは1本目の `table users already exists` で停止するが、これは正常)
3. `npm run pages:dev` をバックグラウンド起動(port 8788)
4. スモークテスト:
   - `curl http://localhost:8788/api/health` → `{"ok":true,...}` で5テーブル(users / auth_identities / sessions / decks / deck_cards)
   - `curl http://localhost:8788/api/me` → 401 `login_required`
   - `curl -I http://localhost:8788/tools/deck-builder/` → 200
5. wrangler疎通確認(トークン復元済みの場合): 上記のAPIトークン方式で `npx wrangler whoami`
6. `git log origin/main -1` と本番 `https://ga-card-tools-jp.pages.dev/api/health` の応答を確認し、本番が正常なことを報告

## 7. 最終確認(手作業・ブラウザ)

- ローカル <http://localhost:8788/tools/deck-builder/> でDiscordログイン→デッキ表示
  (ローカルD1は空なのでデッキは0件。ログインが通ればOK)
- 本番 <https://ga-card-tools-jp.pages.dev/> が普段どおり動くこと(PC再構築で本番は影響を受けないはず)

---

## 平常時のバックアップ(このPCが生きているうちに)

git管理外で失われるものをアーカイブして、クラウドストレージに保存しておく。
コンテナ内で次を実行すると `tmp/` にアーカイブができる(Claudeに「バックアップ作って」と頼んでもよい):

```bash
# いったんtmp/の外に作ってから移動する(tmp/内に直接作ると自分の書き込みでtarが失敗するため)
out=env-backup-$(date +%Y%m%d).tar.gz
tar czf "/tmp/$out" --exclude='env-backup-*.tar.gz' \
  -C /workspaces/claude-test-vsc tmp .dev.vars .claude/settings.local.json .devcontainer/certs \
  -C /home/node .cloudflare-token .claude/projects/-workspaces-claude-test-vsc/memory \
  && mv "/tmp/$out" /workspaces/claude-test-vsc/tmp/
```

できたファイルをVS Codeのエクスプローラから右クリック→Download等でPC外(クラウド)へ。
**シークレットを含むので、共有リンクを作らない場所に保存すること。**

**更新の目安**: tmp/ の計画メモを大きく書き換えたとき、シークレットを再発行したとき。

> ⚠️ **`gh auth login` を再実行したときは更新不要。**
> `~/.config/gh/` は**そもそもバックアップ対象に入れていない**(上の `tar` のパス一覧を参照)。
> GitHubの認証は「バックアップから戻す」のではなく **`gh auth login` で入れ直すのが正**
> (トークンをアーカイブに含めると、クラウド保存先の事故がそのままGitHubアカウントの事故になる)。
> → [A-4](#a-4-gh-github-cli)
>
> 📌 バックアップは**シナリオB(PC故障)向け**。
> [シナリオA(コンテナ再構築)](#シナリオa-コンテナ再構築頻度-高)で必要になるのは
> `~/.cloudflare-token` の1つだけで、残りは `setup.sh` が自動復旧するか、バインドマウント上に残る。
