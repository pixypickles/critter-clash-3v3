## Prototype v0.6

- 長い壁でAIが停止し続ける問題を改善（壁沿いスライド＋簡易迂回）
- 起動画面にカエル3匹とバージョン表示を追加
- 画面左上にもバージョン表示を追加

# けものブレイド・スポーツ Prototype

魔導球技 v3.07 を参考に、飛び道具なしの3対3近接スポーツとして作り直した試作版です。

## 実装済み
- 3対3 / 一撃OUT / 全滅または敵拠点奪取 / 2本先取
- 剣＋盾、槍＋盾、短剣二刀流、双盾
- 3人の自由編成（同一装備可）
- 左スティック移動、右手・左手ボタン
- 攻撃時の近敵オート方向補正
- 盾の押しっぱなし防御、双盾は片方の盾ボタンで両盾防御
- 盾受け時の攻撃側硬直
- 操作キャラOUT時の生存味方への自動操作移行
- 分岐を作る障害物コート
- 新しい仮フィールドマップ
- スキルボタン枠（未実装）

PC確認用: WASD/矢印で移動、J=左手、K=右手。

## v0.2 UI adjustment
- Landscape action buttons are raised so they are not clipped by short smartphone screens / safe areas.
- Team setup and result/text overlays can scroll vertically.
- Team setup controls are compacted on short landscape screens; start/back buttons remain reachable while scrolling.
