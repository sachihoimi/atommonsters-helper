// [atomicNo, symbol, nameJa, period, group]
const PT = [
  [1,'H','水素',1,1],[2,'He','ヘリウム',1,18],
  [3,'Li','リチウム',2,1],[4,'Be','ベリリウム',2,2],[5,'B','ホウ素',2,13],[6,'C','炭素',2,14],[7,'N','窒素',2,15],[8,'O','酸素',2,16],[9,'F','フッ素',2,17],[10,'Ne','ネオン',2,18],
  [11,'Na','ナトリウム',3,1],[12,'Mg','マグネシウム',3,2],[13,'Al','アルミニウム',3,13],[14,'Si','ケイ素',3,14],[15,'P','リン',3,15],[16,'S','硫黄',3,16],[17,'Cl','塩素',3,17],[18,'Ar','アルゴン',3,18],
  [19,'K','カリウム',4,1],[20,'Ca','カルシウム',4,2],[21,'Sc','スカンジウム',4,3],[22,'Ti','チタン',4,4],[23,'V','バナジウム',4,5],[24,'Cr','クロム',4,6],[25,'Mn','マンガン',4,7],[26,'Fe','鉄',4,8],[27,'Co','コバルト',4,9],[28,'Ni','ニッケル',4,10],[29,'Cu','銅',4,11],[30,'Zn','亜鉛',4,12],[31,'Ga','ガリウム',4,13],[32,'Ge','ゲルマニウム',4,14],[33,'As','ヒ素',4,15],[34,'Se','セレン',4,16],[35,'Br','臭素',4,17],[36,'Kr','クリプトン',4,18],
  [37,'Rb','ルビジウム',5,1],[38,'Sr','ストロンチウム',5,2],[39,'Y','イットリウム',5,3],[40,'Zr','ジルコニウム',5,4],[41,'Nb','ニオブ',5,5],[42,'Mo','モリブデン',5,6],[43,'Tc','テクネチウム',5,7],[44,'Ru','ルテニウム',5,8],[45,'Rh','ロジウム',5,9],[46,'Pd','パラジウム',5,10],[47,'Ag','銀',5,11],[48,'Cd','カドミウム',5,12],[49,'In','インジウム',5,13],[50,'Sn','スズ',5,14],[51,'Sb','アンチモン',5,15],[52,'Te','テルル',5,16],[53,'I','ヨウ素',5,17],[54,'Xe','キセノン',5,18],
  [55,'Cs','セシウム',6,1],[56,'Ba','バリウム',6,2],[57,'La','ランタン',6,3],[72,'Hf','ハフニウム',6,4],[73,'Ta','タンタル',6,5],[74,'W','タングステン',6,6],[75,'Re','レニウム',6,7],[76,'Os','オスミウム',6,8],[77,'Ir','イリジウム',6,9],[78,'Pt','白金',6,10],[79,'Au','金',6,11],[80,'Hg','水銀',6,12],[81,'Tl','タリウム',6,13],[82,'Pb','鉛',6,14],[83,'Bi','ビスマス',6,15],[84,'Po','ポロニウム',6,16],[85,'At','アスタチン',6,17],[86,'Rn','ラドン',6,18],
  [87,'Fr','フランシウム',7,1],[88,'Ra','ラジウム',7,2],[89,'Ac','アクチニウム',7,3],[104,'Rf','ラザホージウム',7,4],[105,'Db','ドブニウム',7,5],[106,'Sg','シーボーギウム',7,6],[107,'Bh','ボーリウム',7,7],[108,'Hs','ハッシウム',7,8],[109,'Mt','マイトネリウム',7,9],[110,'Ds','ダームスタチウム',7,10],[111,'Rg','レントゲニウム',7,11],[112,'Cn','コペルニシウム',7,12],[113,'Nh','ニホニウム',7,13],[114,'Fl','フレロビウム',7,14],[115,'Mc','モスコビウム',7,15],[116,'Lv','リバモリウム',7,16],[117,'Ts','テネシン',7,17],[118,'Og','オガネソン',7,18],
  // lanthanides row 9 (→ CSS row 10)
  [58,'Ce','セリウム',9,4],[59,'Pr','プラセオジム',9,5],[60,'Nd','ネオジム',9,6],[61,'Pm','プロメチウム',9,7],[62,'Sm','サマリウム',9,8],[63,'Eu','ユウロピウム',9,9],[64,'Gd','ガドリニウム',9,10],[65,'Tb','テルビウム',9,11],[66,'Dy','ジスプロシウム',9,12],[67,'Ho','ホルミウム',9,13],[68,'Er','エルビウム',9,14],[69,'Tm','ツリウム',9,15],[70,'Yb','イッテルビウム',9,16],[71,'Lu','ルテチウム',9,17],
  // actinides row 10 (→ CSS row 11)
  [90,'Th','トリウム',10,4],[91,'Pa','プロトアクチニウム',10,5],[92,'U','ウラン',10,6],[93,'Np','ネプツニウム',10,7],[94,'Pu','プルトニウム',10,8],[95,'Am','アメリシウム',10,9],[96,'Cm','キュリウム',10,10],[97,'Bk','バークリウム',10,11],[98,'Cf','カリホルニウム',10,12],[99,'Es','アインスタイニウム',10,13],[100,'Fm','フェルミウム',10,14],[101,'Md','メンデレビウム',10,15],[102,'No','ノーベリウム',10,16],[103,'Lr','ローレンシウム',10,17],
];

// 原子量（放射性で安定同位体なしは [質量数]）
const WEIGHT = {
  1:'1.008',   2:'4.003',   3:'6.941',   4:'9.012',   5:'10.811',  6:'12.011',
  7:'14.007',  8:'15.999',  9:'18.998',  10:'20.180', 11:'22.990', 12:'24.305',
  13:'26.982', 14:'28.086', 15:'30.974', 16:'32.065', 17:'35.453', 18:'39.948',
  19:'39.098', 20:'40.078', 21:'44.956', 22:'47.867', 23:'50.942', 24:'51.996',
  25:'54.938', 26:'55.845', 27:'58.933', 28:'58.693', 29:'63.546', 30:'65.38',
  31:'69.723', 32:'72.630', 33:'74.922', 34:'78.971', 35:'79.904', 36:'83.798',
  37:'85.468', 38:'87.62',  39:'88.906', 40:'91.224', 41:'92.906', 42:'95.96',
  43:'[97]',   44:'101.07', 45:'102.906',46:'106.42', 47:'107.868',48:'112.411',
  49:'114.818',50:'118.710',51:'121.760',52:'127.60', 53:'126.904',54:'131.293',
  55:'132.905',56:'137.327',57:'138.905',58:'140.116',59:'140.908',60:'144.242',
  61:'[145]',  62:'150.36', 63:'151.964',64:'157.25', 65:'158.925',66:'162.500',
  67:'164.930',68:'167.259',69:'168.934',70:'173.045',71:'174.967',72:'178.49',
  73:'180.948',74:'183.84', 75:'186.207',76:'190.23', 77:'192.217',78:'195.084',
  79:'196.967',80:'200.592',81:'204.383',82:'207.2',  83:'208.980',84:'[209]',
  85:'[210]',  86:'[222]',  87:'[223]',  88:'[226]',  89:'[227]',  90:'232.038',
  91:'231.036',92:'238.029',93:'[237]',  94:'[244]',  95:'[243]',  96:'[247]',
  97:'[247]',  98:'[251]',  99:'[252]',  100:'[257]', 101:'[258]', 102:'[259]',
  103:'[266]', 104:'[267]', 105:'[268]', 106:'[269]', 107:'[270]', 108:'[270]',
  109:'[278]', 110:'[281]', 111:'[282]', 112:'[285]', 113:'[286]', 114:'[289]',
  115:'[290]', 116:'[293]', 117:'[294]', 118:'[294]',
};

const CAT = {};
for (const n of [3,11,19,37,55,87])                                      CAT[n] = 'alkali';
for (const n of [4,12,20,38,56,88])                                      CAT[n] = 'alkaline';
for (const n of [1,6,7,8,9,15,16,17,35,53])                             CAT[n] = 'reactive';
for (const n of [2,10,18,36,54,86,118])                                  CAT[n] = 'noble';
for (const n of [5,14,32,33,34,52,85,117])                              CAT[n] = 'metalloid';
for (const n of [13,31,49,50,81,82,83,84,113,114,115,116])              CAT[n] = 'post';
for (const n of [57,58,59,60,61,62,63,64,65,66,67,68,69,70,71])        CAT[n] = 'lanthanide';
for (const n of [89,90,91,92,93,94,95,96,97,98,99,100,101,102,103])    CAT[n] = 'actinide';
for (const n of [21,22,23,24,25,26,27,28,29,30,39,40,41,42,43,44,45,46,47,48,72,73,74,75,76,77,78,79,80,104,105,106,107,108,109,110,111,112]) CAT[n] = 'transition';

const CAT_LABELS = {
  alkali:     'アルカリ金属',
  alkaline:   'アルカリ土類金属',
  transition: '遷移金属',
  post:       'ポスト遷移金属',
  metalloid:  '半金属',
  reactive:   '反応性非金属',
  noble:      '貴ガス',
  lanthanide: 'ランタノイド',
  actinide:   'アクチノイド',
};

// period → CSS gridRow (+1 で族番号行を確保)
function toRow(period) { return period + 1; }

let built = false;

export function initPeriodicPage(atoms) {
  if (built) return;
  built = true;

  const atomMap = new Map(atoms.map(a => [a.symbol, a]));
  const grid = document.getElementById('periodic-grid');

  // ── 族番号 row 1 ──
  for (let g = 1; g <= 18; g++) {
    const gn = document.createElement('div');
    gn.className = 'pt-group-num';
    gn.style.gridColumn = g;
    gn.style.gridRow    = 1;
    gn.textContent = g;
    grid.appendChild(gn);
  }

  // ── 中央情報ボックス (rows 2-4, cols 2-12) ──
  const legendHtml = Object.entries(CAT_LABELS).map(([cat, label]) =>
    `<span class="legend-item"><span class="legend-dot pt-cat-${cat}"></span>${label}</span>`
  ).join('');

  const infoBox = document.createElement('div');
  infoBox.className = 'pt-info-box';
  infoBox.style.gridColumn = '3 / 13';
  infoBox.style.gridRow    = '2 / 5';
  infoBox.innerHTML = `
    <p class="pt-msg-secret">🔐 シークレットページ！</p>
    <p class="pt-msg-title">元素周期表</p>
    <p class="pt-msg-desc">イラスト入り＝アトモンが存在する元素</p>
    <div class="pt-legend-grid">${legendHtml}</div>
  `;
  grid.appendChild(infoBox);

  // ── ランタノイド・アクチノイド行ラベル ──
  for (const [period, label, cat] of [[9,'La','lanthanide'],[10,'Ac','actinide']]) {
    const lbl = document.createElement('div');
    lbl.className = `pt-cell pt-cat-${cat} pt-rowlabel`;
    lbl.style.gridColumn = '1 / 4';
    lbl.style.gridRow    = toRow(period);
    lbl.innerHTML = `<span class="pt-sym">${label}…</span>`;
    grid.appendChild(lbl);
  }

  // ── 全元素セル ──
  for (const [no, sym, nameJa, period, group] of PT) {
    const atom = atomMap.get(sym);
    const cat  = CAT[no] ?? 'transition';
    const cell = document.createElement('div');
    cell.className = `pt-cell pt-cat-${cat}${atom ? ' pt-has-atomon' : ''}`;
    cell.style.gridColumn = group;
    cell.style.gridRow    = toRow(period);
    cell.dataset.no     = no;
    cell.dataset.sym    = sym;
    cell.dataset.nameJa = nameJa;
    cell.dataset.cat    = cat;
    cell.dataset.weight = WEIGHT[no] ?? '';
    cell.dataset.pack   = atom?.pack ?? '';
    cell.dataset.image  = atom?.image ?? '';

    if (atom?.image) {
      const img = document.createElement('img');
      img.src   = atom.image;
      img.alt   = sym;
      img.className = 'pt-img';
      cell.appendChild(img);
    }

    const symEl = document.createElement('span');
    symEl.className = 'pt-sym';
    symEl.textContent = sym;
    cell.appendChild(symEl);

    const noEl = document.createElement('span');
    noEl.className = 'pt-no';
    noEl.textContent = no;
    cell.appendChild(noEl);

    const nameEl = document.createElement('span');
    nameEl.className = 'pt-name';
    nameEl.textContent = nameJa;
    cell.appendChild(nameEl);

    const wEl = document.createElement('span');
    wEl.className = 'pt-weight';
    wEl.textContent = WEIGHT[no] ?? '';
    cell.appendChild(wEl);

    grid.appendChild(cell);
  }

  // ── 元素クリック → 詳細モーダル ──
  const detailModal   = document.getElementById('detail-modal');
  const detailContent = document.getElementById('detail-content');

  grid.addEventListener('click', e => {
    const cell = e.target.closest('.pt-cell[data-sym]');
    if (!cell) return;

    const { no, sym, nameJa, cat, weight, pack, image } = cell.dataset;
    const catLabel = CAT_LABELS[cat] ?? cat;
    const packLabel = pack === 'basic' ? 'Basic'
                    : pack === 'green'  ? '＋Green'
                    : pack === 'purple' ? '＋Purple'
                    : null;

    const imgHtml = image
      ? `<img src="${image}" alt="${sym}" class="detail-img" />`
      : `<div class="detail-img no-img pt-el-placeholder pt-cat-${cat}">
           <span class="detail-el-sym">${sym}</span>
         </div>`;

    detailContent.innerHTML = `
      <div class="detail-content-inner">
        <div class="detail-img-wrap">${imgHtml}</div>
        <div class="detail-info">
          <h2 class="detail-name">${nameJa}</h2>
          <p class="detail-reading">${sym} &nbsp;／&nbsp; No.${no}</p>
          <div class="detail-divider"></div>
          <div class="detail-el-row">
            <span class="detail-el-label">原子量</span>
            <span class="detail-el-value">${weight || '—'}</span>
          </div>
          <div class="detail-el-row">
            <span class="detail-el-label">分類</span>
            <span class="detail-el-cat">
              <span class="legend-dot pt-cat-${cat}"></span>${catLabel}
            </span>
          </div>
          ${packLabel
            ? `<div class="detail-el-row">
                 <span class="detail-el-label">パック</span>
                 <span class="detail-el-value">${packLabel}</span>
               </div>`
            : `<p class="detail-no-atomon">アトモンなし</p>`
          }
        </div>
      </div>
    `;
    detailModal.hidden = false;
  });

  // 閉じる処理は app.js 側のリスナーで済む（二重登録しない）
}
