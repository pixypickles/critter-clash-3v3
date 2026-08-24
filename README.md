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


## v0.12
- 武器本体と残像の色を統一
- 剣の発生を遅く調整
- 武器同士の衝突で双方が弾かれる処理を追加
- 短剣攻撃中にもパリィ判定
- 槍を両手持ち一本に変更。右手=突き、左手=時間制限付き回転防御
- 槍の攻撃表示を一本化し、攻撃時の二重表示を解消


## v0.12
- 短剣の二連斬りは1発目・2発目それぞれで少し前進します（壁は通過しません）。
- 剣・槍・短剣の全攻撃に、ごく短い攻撃後硬直を追加しました。短剣は軽く、槍はやや長めです。


## v0.12
- 中央主戦場＋上下の回り込み通路になる薄壁レイアウトへ変更（左右/180度対称）
- CPU防御時も横移動・巡回し、棒立ちしにくいAIへ変更
- 壁端を選んで迂回するAIを改善
- 短剣の移動速度を210→230へ上昇
