# 開発環境 再構築手順書(ディザスタリカバリ)

作成: 2026-07-11。PCが故障して何もない状態から、現在と同等の開発環境を再構築するための手順。
前半(手順1〜5)は人間の手作業、**手順6以降はClaude Codeに「docs/dev-setup.md の手順6以降を実行して」と指示すれば任せられる**。

> ⚠️ この手順書にはシークレットの値は書かない(リポジトリが公開のため)。
> シークレットは「どこで再発行できるか」だけを記す。バックアップの取り方は末尾を参照。

## 環境の全体像

| 層 | 内容 | PC故障の影響 |
|---|---|---|
| コード | GitHub: <https://github.com/dozyouneko/ga-card-tools-jp> (main) | なし(クラウド) |
| 本番 | Cloudflare Pages `ga-card-tools-jp`(push時に自動デプロイ)+ D1 `ga-deck-builder` | なし(クラウド) |
| 認証 | Discord Developer Portal のOAuthアプリ(Redirect URI 登録済み) | なし(クラウド) |
| 開発環境 | Windows + Docker Desktop(WSL2)+ VS Code Dev Containers。コンテナ定義は `.devcontainer/devcontainer.json`(Node 20 + Claude Code CLI 自動インストール) | **失われる → 本書で再構築** |
| git管理外ファイル | `tmp/`(計画メモ類)・`.dev.vars`・`~/.cloudflare-token`・`~/.claude`(Claudeのmemory)・`.claude/settings.local.json` | **失われる → バックアップから復元 or 再発行** |

必要なアカウント(パスワードマネージャ等で復旧できること): GitHub / Cloudflare / Discord / Anthropic(Claude)。

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
初回はイメージ取得+`postCreateCommand`(npm install / Claude Code CLIのグローバルインストール / Norton証明書の登録)が走る。

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

| ファイル | 内容 | 再発行方法 |
|---|---|---|
| `/home/node/.cloudflare-token` | Cloudflare APIトークン(1行、`chmod 600`) | Cloudflareダッシュボード > My Profile > API Tokens > Create Token。権限: **Account/D1:Edit、Account/Cloudflare Pages:Edit、Account/Account Settings:Read、User/User Details:Read** |
| `.dev.vars`(リポジトリ直下) | `DISCORD_CLIENT_ID=...`<br>`DISCORD_CLIENT_SECRET=...` | Discord Developer Portal > 対象アプリ > OAuth2。Client IDは表示されている値、Secretは「Reset Secret」で再発行。**Secretを再発行したら本番Pagesのsecret(下記の注意参照)も更新すること** |
| `~/.claude/projects/-workspaces-claude-test-vsc/memory/` | Claude Codeのmemory | バックアップからのみ復元可(なければClaudeが徐々に再学習) |
| `tmp/`(リポジトリ直下) | 計画メモ・手順書類 | バックアップからのみ復元可 |
| `.claude/settings.local.json` | Claude Codeの権限設定 | バックアップから復元。なければ使いながら再許可 |

> wranglerは `wrangler login`(OAuth)がdevcontainer内で使えないため、APIトークン方式で使う:
> `CLOUDFLARE_API_TOKEN=$(cat /home/node/.cloudflare-token) CLOUDFLARE_ACCOUNT_ID=53dcf4e7f02ea5e504977816a68865f5 npx wrangler <cmd>`
>
> 本番Pagesの環境変数は必ず **secret_text(暗号化変数)** で設定する。plain_textはwrangler.tomlに毎デプロイ上書きされて消える。

## 6. ここからClaude Codeに任せる

コンテナ内で `claude` を起動し、次のように指示すればよい:

> docs/dev-setup.md の手順6以降を実行して、ローカル開発環境の動作確認までやって

Claudeがやること:

1. `npm install`(postCreateで済んでいるはずだが確認)
2. `npm run db:migrate:local` — ローカルD1(`.wrangler/state`)にマイグレーション0001〜0003を適用
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
tar czf tmp/env-backup-$(date +%Y%m%d).tar.gz --exclude='env-backup-*.tar.gz' \
  -C /workspaces/claude-test-vsc tmp .dev.vars .claude/settings.local.json .devcontainer/certs \
  -C /home/node .cloudflare-token .claude/projects/-workspaces-claude-test-vsc/memory
```

できたファイルをVS Codeのエクスプローラから右クリック→Download等でPC外(クラウド)へ。
**シークレットを含むので、共有リンクを作らない場所に保存すること。**
更新の目安: tmp/ の計画メモを大きく書き換えたとき、シークレットを再発行したとき。
