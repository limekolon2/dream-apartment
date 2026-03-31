import { useState, useEffect, useRef } from "react";

const TOTAL_ROWS  = 10;
const UNITS       = 4;
const TICK_MS     = 3000;
const START_MONEY = 1000000;
const UNLOCK_COST = 500000;
const LOAN_AMT    = 2000000;
const LOAN_REPAY  = 25000;
const LOAN_TICKS  = 80;
const CRISIS_TH   = 28;
const EVICT_TH    = 45;

// fi: 0=8F 1=7F 2=6F 3=5F 4=4F 5=3F 6=2F 7=1F 8=B1F 9=B2F
const FL_LABEL = ["8F","7F","6F","5F","4F","3F","2F","1F","B1F","B2F"];
const isRes  = fi => [0,1,2,3,6,7].includes(fi);
const isAmUp = fi => fi===4||fi===5;
const isBsmt = fi => fi===8||fi===9;
const isAm   = fi => isAmUp(fi)||isBsmt(fi);

const ROOMS = {
  k1:  {label:"1K",  bg:"#dbeafe",border:"#93c5fd",tc:"#1e40af",cost:300000, baseRent:38000, desc:"シンプル・防音・家賃控えめ"},
  ldk1:{label:"1LDK",bg:"#ede9fe",border:"#c4b5fd",tc:"#5b21b6",cost:600000, baseRent:65000, desc:"広いリビング付き・RC造"},
  ldk2:{label:"2LDK",bg:"#fce7f3",border:"#f9a8d4",tc:"#9d174d",cost:1000000,baseRent:92000, desc:"ファミリー向け・充実設備"},
};

// マンション全体属性
const GLOBAL_AM = [
  {id:"soundproof",label:"全館防音施工",icon:"🔇",cost:400000,bonus:20,desc:"楽器も深夜も気にしない"},
  {id:"pet",       label:"ペット可",    icon:"🐱",cost:120000,bonus:14,desc:"猫も犬も大歓迎"},
];

// 屋上設備（専用表示）
const ROOF_AM = [
  {id:"garden",  label:"屋上庭園",   icon:"🌿",cost:250000,bonus:15,desc:"空の下でゆっくり"},
  {id:"view",    label:"夜景ビュー", icon:"🌙",cost:350000,bonus:16,desc:"屋上から見下ろす都心夜景"},
  {id:"pool",    label:"ナイトプール",icon:"🏊",cost:600000,bonus:22,desc:"夜に光る屋上プール"},
];

// 設備フロア定義（nullは空きマス、同idが2連続=2マス占有の視覚表現）
// 4F: スタジオ×2・ジム×2
// 3F: ラウンジ×2・図書室×2
// B1F: シアター×2・ワインセラー×1・トランク×1
// B2F: 発電室×2・設備室×2
const AM_DEF = {
  studio:   {id:"studio",  label:"音楽スタジオ",icon:"🎵",cost:500000,bonus:25,desc:"本格防音スタジオ"},
  gym:      {id:"gym",     label:"24hジム",     icon:"💪",cost:320000,bonus:18,desc:"いつでも運動できる"},
  lounge:   {id:"lounge",  label:"ラウンジ",    icon:"☕",cost:160000,bonus:10,desc:"入居者専用くつろぎ空間"},
  library:  {id:"library", label:"図書室",      icon:"📚",cost:180000,bonus:12,desc:"静かな読書空間"},
  theater:  {id:"theater", label:"シアター",    icon:"🎬",cost:450000,bonus:18,desc:"映画・ゲーム好きが狂喜"},
  wine:     {id:"wine",    label:"ワインセラー",icon:"🍷",cost:280000,bonus:12,desc:"グルメ入居者の満足度UP"},
  trunk:    {id:"trunk",   label:"トランクルーム",icon:"🗄",cost:150000,bonus:8, desc:"全室家賃5%アップ"},
  generator:{id:"generator",label:"発電室",     icon:"🔋",cost:350000,bonus:0, desc:"停電イベント無効化"},
  workshop: {id:"workshop",label:"設備室",      icon:"⚙️",cost:200000,bonus:0, desc:"修繕コスト50%削減"},
};

// layoutは4要素配列。同じidが連続=2マス表示
const AM_LAYOUT = {
  4:["studio","studio","gym","gym"],
  5:["lounge","lounge","library","library"],
  8:["theater","theater","wine","trunk"],
  9:["generator","generator","workshop","workshop"],
};

const ALL_FLOOR_AM = Object.values(AM_DEF);
const ALL_AM = [...ALL_FLOOR_AM,...GLOBAL_AM,...ROOF_AM];

const NORMAL_TENANTS = [
  {emoji:"🎸",name:"音楽家・田中",      msgs:["防音最高すぎる！","スタジオ毎日使ってます","ここから離れられない"],             letter:"毎日作曲できています。ありがとう。",              anniversary:"入居して1年。ずっといます。"},
  {emoji:"📖",name:"読書家・佐藤",      msgs:["図書室で毎晩読んでます","静かで最高です","ずっと住みます"],                   letter:"図書室に新しい本を入れてほしいです。",            anniversary:"この部屋、本当に気に入っています。"},
  {emoji:"💻",name:"在宅ワーカー・鈴木",msgs:["集中できる最高の環境","もう会社要らない","ラウンジで仕事してます"],             letter:"もう会社には戻れません。ここが私のオフィスです。",  anniversary:"在宅歴1年。引越す気ゼロです。"},
  {emoji:"🏥",name:"夜勤ナース・高橋",  msgs:["昼間ちゃんと眠れます","防音ありがたい","体調もよくなりました"],                 letter:"夜勤明けに熟睡できています。",                  anniversary:"体調が戻りました。この部屋のおかげです。"},
  {emoji:"💑",name:"山田夫妻",          msgs:["2人の理想の家！","屋上でよくお茶します","プールで泳いできました"],               letter:"屋上で結婚記念日を過ごしました。",               anniversary:"子どもができました。報告します。"},
  {emoji:"🎨",name:"アーティスト・渡辺",msgs:["創作がめちゃ捗ります","家賃安すぎ大丈夫ですか？","最高の環境です"],             letter:"家賃が安すぎて不安です。値上げしても住み続けます。",anniversary:"ここで描いた絵が賞をとりました。"},
  {emoji:"🎮",name:"ゲーマー・中村",    msgs:["夜中のゲームも安心","ジム始めました","シアター毎日使ってます"],                 letter:"シアタールームが最高すぎます。天国です。",         anniversary:"シアターでゲームするのが日課になりました。"},
  {emoji:"🌙",name:"夜型・小林",        msgs:["近所を気にしなくていい","何年でも住みます","ナイトプール最高すぎる"],             letter:"夜3時に泳いでも誰も来ません。幸せです。",         anniversary:"夜型歴1年。健康です。不思議。"},
  {emoji:"🧑‍🍳",name:"料理好き・加藤",msgs:["キッチン最高！","ラウンジで振る舞いたい","ワインセラー神すぎる"],               letter:"先日ラウンジでカレーを振る舞いました。",           anniversary:"ワインセラーのおかげで料理の幅が広がりました。"},
];
const PET_TENANTS = [
  {emoji:"🐱",name:"猫好き・伊藤",msgs:["猫も喜んでます","屋上で日向ぼっこ最高","にゃ（猫より）"],  letter:"うちの猫が屋上を気に入りすぎて降りてきません。", anniversary:"猫が屋上の主になりました。"},
  {emoji:"🐶",name:"犬好き・木村",msgs:["散歩帰りも安心の設備","ワン（犬より）","最高すぎて引越せない"],letter:"犬を飼えるマンションがこんなに快適だとは。",   anniversary:"犬が2匹になりました。許してください。"},
  {emoji:"🦜",name:"鳥好き・森田",msgs:["ピピが歌えます","ピーちゃんも喜んでます","最高の物件です"], letter:"防音のおかげでピピの歌声が迷惑になりません。",  anniversary:"ピピが人間の言葉を覚え始めました。"},
];
const LEGENDARY = {
  emoji:"⭐",name:"星凪ルナ",legendary:true,neverLeave:true,
  msgs:["防音は必須なの","ここ、思ったより悪くない","スタジオ毎日使うから","この家賃で大丈夫？","夢の舞台より気持ちいいかも","…なんでもない","夜景、まあまあ好き","ナイトプール、悪くない"],
  letter:"防音と静寂、両方あった。それだけで十分。",anniversary:"気づいたら長居してた。居心地がいいから。",
  crisisMsgs:["…ちょっと考えてる","まあ、防音はいいし","もうちょっとだけいるかも"],
};

const RAIN_MSGS   = ["雨音が最高すぎる…","防音のおかげで雨がBGMになる","雨の日の図書室、最高","今日も幸せです（雨）"];
const FW_MSGS     = ["屋上から花火！最高！","こんな物件あっていいの？","花火見ながら乾杯してます"];
const POOL_MSGS   = ["ナイトプール最高すぎる","夜中に泳いでます","プールで星空が見えた","引越してよかった"];
const CRISIS_MSGS = ["…ちょっと考えてます","そろそろ引越しも…？","設備が気になってきた"];
const LIVE_MSGS   = ["ライブ始まった！！","うそ、本物？！","スタジオから歌声が…！","天才すぎる","泣いてる（喜び）"];
const INTERACT    = [(a,b)=>`${a}と${b}がラウンジで仲良くなった！`,(a,b)=>`${a}が${b}にお裾分けをした`,(a,b)=>`${a}と${b}が屋上でお茶してる`];
const SEASON_MSGS = {spring:["桜が見える！","春の屋上最高"],summer:["夏でも涼しい！","プールとビール最高"],autumn:["紅葉が見えます","秋の夜景がきれい"],winter:["暖かくて幸せ","冬の夜景が美しすぎる"]};
const BAD_EVENTS  = [
  {id:"pipe",  icon:"🔧",label:"給水管トラブル",desc:"修繕費発生",      cost:150000,drop:0},
  {id:"power", icon:"⚡",label:"停電",          desc:"家賃収入一時停止",cost:0,     drop:5},
];
const SEASON_LIST = ["spring","summer","autumn","winter"];
const SL = {spring:"🌸 春",summer:"🌻 夏",autumn:"🍂 秋",winter:"❄️ 冬"};

const fmt      = n=>`¥${n.toLocaleString()}`;
const randItem = a=>a[Math.floor(Math.random()*a.length)];

function getSky(h,live){
  if(live)        return{bg:"#1e0a2e",hdr:"#2d1b69",txt:"#e2e8f0"};
  if(h>=5&&h<8)  return{bg:"#fff1eb",hdr:"#fed7aa",txt:"#7c2d12"};
  if(h>=8&&h<17) return{bg:"#eff6ff",hdr:"white",  txt:"#1e293b"};
  if(h>=17&&h<20)return{bg:"#fff7ed",hdr:"#fed7aa",txt:"#7c2d12"};
  return           {bg:"#0f172a",hdr:"#1e293b",txt:"#e2e8f0"};
}
function timeLabel(h){
  if(h>=5&&h<8)  return"🌅 夜明け";
  if(h>=8&&h<17) return"☀️ 昼";
  if(h>=17&&h<20)return"🌇 夕暮れ";
  return"🌙 夜";
}

export default function ApartmentGame(){
  const [money,    setMoney]   = useState(START_MONEY);
  const [earned,   setEarned]  = useState(0);
  const [unlocked, setUnlocked]= useState(0);
  const [grid,     setGrid]    = useState(()=>
    Array(TOTAL_ROWS).fill(null).map(()=>
      Array(UNITS).fill(null).map(()=>({room:null,tenant:null,movedIn:0,crisis:false,age:0}))
    )
  );
  const [owned,    setOwned]   = useState(new Set());
  const [modal,    setModal]   = useState(null);
  const [selCell,  setSelCell] = useState(null);
  const [bubbles,  setBubbles] = useState([]);
  const [hovered,  setHovered] = useState(null);
  const [raining,  setRaining] = useState(false);
  const [nextRain, setNextRain]= useState(15);
  const [seasIdx,  setSeasIdx] = useState(0);
  const [fireworks,setFW]      = useState(false);
  const [legendary,setLeg]     = useState(false);
  const [notif,    setNotif]   = useState(null);
  const [live,     setLive]    = useState(false);
  const [liveB,    setLiveB]   = useState(0);
  const [badB,     setBadB]    = useState(0);
  const [paused,   setPaused]  = useState(false);
  const [letters,  setLetters] = useState([]);
  const [loan,     setLoan]    = useState(null);
  const [hour,     setHour]    = useState(new Date().getHours());
  const [lastRep,  setLastRep] = useState(0);

  const tick   = useRef(0);
  const ownedR = useRef(owned);
  const gridR  = useRef(grid);
  const legR   = useRef(legendary);
  const liveR  = useRef(live);
  const loanR  = useRef(loan);
  const repR   = useRef(0);
  const rainR  = useRef(15);
  const unlocR = useRef(0);

  useEffect(()=>{ownedR.current=owned;},[owned]);
  useEffect(()=>{gridR.current=grid;},[grid]);
  useEffect(()=>{legR.current=legendary;},[legendary]);
  useEffect(()=>{liveR.current=live;},[live]);
  useEffect(()=>{loanR.current=loan;},[loan]);
  useEffect(()=>{repR.current=lastRep;},[lastRep]);
  useEffect(()=>{unlocR.current=unlocked;},[unlocked]);

  const season   = SEASON_LIST[seasIdx];
  const amBonus  = [...owned].reduce((s,id)=>{const a=ALL_AM.find(x=>x.id===id);return s+(a?a.bonus:0);},0);
  const rainB    = raining&&owned.has("soundproof")?8:0;
  const fwB      = fireworks&&owned.has("garden")?12:0;
  const poolB    = owned.has("pool")&&(hour>=20||hour<5)?10:0;
  const happiness= Math.min(100,55+amBonus+rainB+fwB+liveB+badB+poolB);
  const hColor   = happiness>=85?"#10b981":happiness>=70?"#f59e0b":"#ef4444";
  const hLabel   = happiness>=95?"天国！":happiness>=85?"最高！":happiness>=70?"幸せ":happiness>=50?"普通":"危険";
  const isNight  = hour>=20||hour<5;
  const sky      = getSky(hour,live);
  const repCost  = owned.has("workshop")?40000:80000;
  const vStart   = 2-unlocked;

  const getRent=(roomId,fi)=>{
    const base=ROOMS[roomId].baseRent;
    const vb=ownedR.current.has("view")&&fi<=3?Math.floor(base*.12):0;
    const tb=ownedR.current.has("trunk")?Math.floor(base*.05):0;
    return base+vb+tb;
  };

  const monthlyRent=grid.flat().reduce((s,c,idx)=>{
    if(!c.room)return s;
    return s+getRent(c.room,Math.floor(idx/UNITS));
  },0);
  const occupied  = grid.flat().filter(c=>c.room).length;
  const hasCrisis = grid.flat().some(c=>c.crisis);
  const unread    = letters.filter(l=>!l.read).length;
  const netIncome = monthlyRent-(loan?LOAN_REPAY:0);

  const tenantRank= grid.flat()
    .filter(c=>c.tenant)
    .map(c=>({name:c.tenant.name,emoji:c.tenant.emoji,t:tick.current-c.movedIn}))
    .sort((a,b)=>b.t-a.t).slice(0,3);

  const showNotif=(msg,color="#1e293b")=>{setNotif({msg,color});setTimeout(()=>setNotif(null),3500);};

  useEffect(()=>{
    const f=()=>setHour(new Date().getHours());f();
    const id=setInterval(f,60000);return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>{
      setSeasIdx(i=>{
        const n=(i+1)%4;const s=SEASON_LIST[n];
        showNotif(`${SL[s]} になりました`);
        if(s==="summer"){setFW(true);setTimeout(()=>setFW(false),8000);}
        return n;
      });
    },30000);return()=>clearInterval(id);
  },[]);

  useEffect(()=>{
    const id=setInterval(()=>{
      tick.current+=1;
      const t=tick.current;
      const cg=gridR.current;
      const co=ownedR.current;

      // 雨
      rainR.current-=1;
      if(rainR.current<=0){
        setRaining(true);
        if(co.has("soundproof"))showNotif("☔ 雨が降ってきた — 雨音BGMに包まれています","#1e3a8a");
        setTimeout(()=>setRaining(false),9000);
        const next=Math.floor(Math.random()*30)+8;
        rainR.current=next;setNextRain(next);
      }else{setNextRain(rainR.current);}

      // 家賃
      const rent=cg.flat().reduce((s,c,idx)=>{
        if(!c.room)return s;
        const fi=Math.floor(idx/UNITS);
        const base=ROOMS[c.room].baseRent;
        const vb=co.has("view")&&fi<=3?Math.floor(base*.12):0;
        const tb=co.has("trunk")?Math.floor(base*.05):0;
        return s+base+vb+tb;
      },0);
      if(!paused&&rent>0){setMoney(m=>m+rent);setEarned(e=>e+rent);}

      // ローン
      const cl=loanR.current;
      if(cl&&cl.ticksLeft>0){
        const rep=Math.min(LOAN_REPAY,cl.remaining);
        setMoney(m=>m-rep);
        setLoan(prev=>prev?{remaining:prev.remaining-rep,ticksLeft:prev.ticksLeft-1}:null);
        if(cl.ticksLeft===1)showNotif("💳 ローン完済！おめでとうございます","#10b981");
      }

      // 危機・退去
      const since=t-repR.current;
      setGrid(prev=>prev.map(row=>row.map(cell=>{
        if(!cell.room)return cell;
        if(cell.tenant?.neverLeave)return{...cell,age:(cell.age||0)+1};
        if(cell.crisis&&since>EVICT_TH&&Math.random()<.12){
          setLetters(p=>[...p,{id:Date.now()+Math.random(),from:cell.tenant.name,emoji:cell.tenant.emoji,body:"お世話になりました。また良い物件を探します。",read:false,isEvict:true}]);
          showNotif(`😢 ${cell.tenant.name}さんが退去しました`,"#ef4444");
          return{room:null,tenant:null,movedIn:0,crisis:false,age:0};
        }
        const crisis=since>CRISIS_TH&&Math.random()<.15;
        return{...cell,crisis,age:(cell.age||0)+1};
      })));

      // バブル・周年
      const occ=[];
      cg.forEach((row,fi)=>row.forEach((cell,ui)=>{if(cell.tenant)occ.push({fi,ui,cell});}));
      occ.forEach(({cell})=>{
        const age=t-cell.movedIn;
        if((age===20||age===50)&&cell.tenant?.anniversary){
          setLetters(p=>[...p,{id:Date.now()+Math.random(),from:cell.tenant.name,emoji:cell.tenant.emoji,body:cell.tenant.anniversary,read:false,isAnniversary:true}]);
          showNotif(`🎂 ${cell.tenant.name}さんから記念のお手紙！`,"#d97706");
        }
      });

      if(occ.length>0){
        const pick=randItem(occ);
        const isCr=pick.cell.crisis&&!pick.cell.tenant.neverLeave;
        const isLC=pick.cell.tenant.legendary&&since>CRISIS_TH+20;
        let msgs=[...pick.cell.tenant.msgs];
        if(isCr)msgs=[...CRISIS_MSGS];
        else if(isLC)msgs=[...pick.cell.tenant.crisisMsgs];
        else{
          if(raining&&co.has("soundproof")) msgs=[...msgs,...RAIN_MSGS];
          if(fireworks&&co.has("garden"))   msgs=[...msgs,...FW_MSGS];
          if(co.has("pool")&&(hour>=20||hour<5)) msgs=[...msgs,...POOL_MSGS];
          if(SEASON_MSGS[season]&&Math.random()<.3) msgs=[...msgs,...SEASON_MSGS[season]];
          if(liveR.current) msgs=[...LIVE_MSGS];
        }
        const msg=randItem(msgs);
        const bid=Date.now();
        setBubbles(prev=>[...prev.filter(b=>(Date.now()-b.id)<2200),{id:bid,fi:pick.fi,ui:pick.ui,msg,crisis:isCr}]);
        setTimeout(()=>setBubbles(prev=>prev.filter(b=>b.id!==bid)),2200);
      }

      // 交流
      if(occ.length>=2&&Math.random()<.06){
        const a=randItem(occ),b=randItem(occ);
        if(a.cell.tenant.name!==b.cell.tenant.name){
          const n1=a.cell.tenant.name.split("・")[1]||a.cell.tenant.name;
          const n2=b.cell.tenant.name.split("・")[1]||b.cell.tenant.name;
          showNotif(randItem(INTERACT)(n1,n2),"#7c3aed");
        }
      }

      // 手紙
      if(occ.length>0&&Math.random()<.07){
        const s2=randItem(occ).cell.tenant;
        if(s2.letter)setLetters(p=>[...p,{id:Date.now()+Math.random(),from:s2.name,emoji:s2.emoji,body:s2.letter,read:false}]);
      }

      // 不運
      if(Math.random()<.025){
        const ev=randItem(BAD_EVENTS);
        if(ev.id==="power"&&co.has("generator"))return;
        showNotif(`${ev.icon} ${ev.label}！${ev.desc}`,"#dc2626");
        if(ev.cost>0)setMoney(m=>m-ev.cost);
        if(ev.drop>0){setBadB(-ev.drop);setTimeout(()=>setBadB(0),15000);}
        if(ev.id==="power"){setPaused(true);setTimeout(()=>setPaused(false),9000);}
      }

      // 伝説入居
      if(!legR.current&&t>=10&&co.has("studio")&&co.has("soundproof")){
        const vfi=2-unlocR.current;
        const empty=[];
        cg.forEach((row,fi)=>row.forEach((cell,ui)=>{if(!cell.room&&isRes(fi)&&fi>=vfi)empty.push({fi,ui});}));
        if(empty.length>0){
          const spot=randItem(empty);
          setGrid(prev=>prev.map((row,fi)=>row.map((cell,ui)=>
            fi===spot.fi&&ui===spot.ui?{room:"ldk1",tenant:LEGENDARY,movedIn:t,crisis:false,age:0}:cell
          )));
          setLeg(true);
          setMoney(m=>m-ROOMS.ldk1.cost);
          showNotif("⭐ 星凪ルナが突然入居してきた！！","#d97706");
        }
      }

      // ライブ
      if(legR.current&&co.has("studio")&&!liveR.current&&Math.random()<.04){
        setLive(true);setLiveB(30);
        showNotif("🎤 星凪ルナがスタジオでライブを始めた！！","#7c3aed");
        setTimeout(()=>{setLive(false);setLiveB(0);showNotif("🎤 ライブ終了。入居者全員が感動している","#7c3aed");},12000);
      }
    },TICK_MS);
    return()=>clearInterval(id);
  },[seasIdx,raining,fireworks,paused,hour]);

  const openRoom=(fi,ui)=>{setSelCell({fi,ui});setModal("room");};
  const buildRoom=(roomId)=>{
    if(!selCell||money<ROOMS[roomId].cost)return;
    const pool=ownedR.current.has("pet")?[...NORMAL_TENANTS,...PET_TENANTS]:NORMAL_TENANTS;
    const{fi,ui}=selCell;
    setGrid(prev=>prev.map((row,r)=>row.map((cell,c)=>
      r===fi&&c===ui?{room:roomId,tenant:randItem(pool),movedIn:tick.current,crisis:false,age:0}:cell
    )));
    setMoney(m=>m-ROOMS[roomId].cost);
    setModal(null);setSelCell(null);
  };
  const buyAm=(id)=>{
    const a=ALL_AM.find(x=>x.id===id);
    if(!a||owned.has(id))return;
    if(money<a.cost){showNotif("お金が足りません","#ef4444");return;}
    setOwned(prev=>new Set([...prev,id]));
    setMoney(m=>m-a.cost);
    setLastRep(tick.current);
    showNotif(`${a.icon} ${a.label} を設置しました`,"#16a34a");
  };
  const doRepair=()=>{
    if(money<repCost){showNotif("お金が足りません","#ef4444");return;}
    setMoney(m=>m-repCost);setLastRep(tick.current);
    setGrid(prev=>prev.map(row=>row.map(cell=>({...cell,crisis:false}))));
    showNotif("🔧 修繕完了！入居者が安心しています","#10b981");
  };
  const takeLoan=()=>{
    if(loan){showNotif("すでにローンがあります","#ef4444");return;}
    setLoan({remaining:LOAN_AMT,ticksLeft:LOAN_TICKS});
    setMoney(m=>m+LOAN_AMT);
    showNotif(`💳 ${fmt(LOAN_AMT)}のローンを組みました`,"#6366f1");
  };
  const doUnlock=()=>{
    if(unlocked>=2||money<UNLOCK_COST){showNotif("お金が足りません","#ef4444");return;}
    setMoney(m=>m-UNLOCK_COST);
    setUnlocked(u=>u+1);
    showNotif(`🏗 ${unlocked===0?"7F":"8F"}増築完了！`,"#10b981");
  };

  const weatherLabel=nextRain<=3?"☔ まもなく雨":nextRain<=8?"🌦 もうすぐ雨かも":"☀️ しばらく晴れ";
  const visRows=Array.from({length:TOTAL_ROWS-vStart},(_,i)=>vStart+i);

  // ── 屋上設備セル（1マス） ─────────────────────────────
  const renderRoofCell=(am)=>{
    if(!am){
      return <div style={{flex:1,height:52,background:"#f1f5f9",border:"2px dashed #e2e8f0",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}><span style={{fontSize:10,color:"#e2e8f0"}}>—</span></div>;
    }
    const isO=owned.has(am.id);
    const can=!isO&&money>=am.cost;
    const isPool=am.id==="pool";
    const poolActive=isPool&&isO&&isNight;
    return(
      <div onClick={()=>!isO&&can&&buyAm(am.id)} style={{
        flex:1,height:52,
        background:poolActive?"linear-gradient(135deg,#0ea5e9,#6366f1)":isO?"#f0fdf4":"white",
        border:`2px solid ${poolActive?"#38bdf8":isO?"#86efac":can?"#93c5fd":"#e2e8f0"}`,
        borderRadius:10,cursor:!isO&&can?"pointer":"default",
        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
        userSelect:"none",opacity:!isO&&!can?0.5:1,transition:"all .2s",
        boxShadow:poolActive?"0 0 12px rgba(56,189,248,.5)":isO?"0 0 6px rgba(134,239,172,.3)":"none",
      }}>
        <div style={{fontSize:18}}>{am.icon}</div>
        <div style={{fontSize:9,fontWeight:700,color:poolActive?"white":isO?"#16a34a":"#64748b",marginTop:1,textAlign:"center"}}>{am.label}</div>
        {!isO&&<div style={{fontSize:9,color:can?"#6366f1":"#94a3b8"}}>{fmt(am.cost)}</div>}
        {isO&&!poolActive&&<div style={{fontSize:9,color:"#16a34a"}}>✓</div>}
        {poolActive&&<div style={{fontSize:9,color:"white",fontWeight:700}}>✨ 営業中</div>}
      </div>
    );
  };

  // ── 設備フロアセル（2マス対応） ───────────────────────
  const renderAmFloor=(fi)=>{
    const layout=AM_LAYOUT[fi];
    const dark=isBsmt(fi);
    // 2マス占有の設備は左右でスタイルを変える
    const cells=[];
    let ui=0;
    while(ui<4){
      const id=layout[ui];
      const isDouble=ui<3&&layout[ui+1]===id;
      const am=id?AM_DEF[id]:null;
      const isO=am?owned.has(am.id):false;
      const can=am?(!isO&&money>=am.cost):false;

      if(isDouble&&am){
        // 2マス幅セル
        const bgColor=isO?(dark?"#1e1b2e":"#f0fdf4"):can?"white":"#f8fafc";
        const borderColor=isO?(dark?"#7c3aed":"#86efac"):can?(dark?"#a78bfa":"#c4b5fd"):"#e2e8f0";
        cells.push(
          <div key={ui} onClick={()=>!isO&&can&&buyAm(am.id)} style={{
            flex:2,height:68,background:bgColor,
            border:`2px solid ${borderColor}`,borderRadius:10,
            cursor:!isO&&can?"pointer":"default",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            userSelect:"none",opacity:!isO&&!can?0.45:1,transition:"all .15s",
            boxShadow:isO&&dark?"0 0 8px rgba(124,58,237,.3)":isO?"0 0 6px rgba(134,239,172,.4)":"none",
          }}>
            <div style={{fontSize:22}}>{am.icon}</div>
            <div style={{fontSize:10,fontWeight:700,color:isO?(dark?"#a78bfa":"#16a34a"):dark?"#7c3aed":"#64748b",marginTop:2}}>{am.label}</div>
            {!isO&&<div style={{fontSize:9,color:can?(dark?"#7c3aed":"#6366f1"):"#94a3b8"}}>{fmt(am.cost)}</div>}
            {isO&&<div style={{fontSize:10,color:dark?"#a78bfa":"#16a34a"}}>✓</div>}
          </div>
        );
        ui+=2;
      } else {
        // 1マスセル
        const bgColor=am?(isO?(dark?"#1e1b2e":"#f0fdf4"):can?"white":"#f8fafc"):"#f8fafc";
        const borderColor=am?(isO?(dark?"#7c3aed":"#86efac"):can?(dark?"#a78bfa":"#c4b5fd"):"#e2e8f0"):"#e2e8f0";
        cells.push(
          <div key={ui} onClick={()=>am&&!isO&&can&&buyAm(am.id)} style={{
            flex:1,height:68,background:bgColor,
            border:`2px solid ${borderColor}`,borderRadius:10,
            cursor:am&&!isO&&can?"pointer":"default",
            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
            userSelect:"none",opacity:am&&!isO&&!can?0.45:1,transition:"all .15s",
          }}>
            {am?(
              <>
                <div style={{fontSize:20}}>{am.icon}</div>
                <div style={{fontSize:9,fontWeight:700,color:isO?(dark?"#a78bfa":"#16a34a"):dark?"#7c3aed":"#64748b",marginTop:2,textAlign:"center"}}>{am.label}</div>
                {!isO&&<div style={{fontSize:9,color:can?(dark?"#7c3aed":"#6366f1"):"#94a3b8"}}>{fmt(am.cost)}</div>}
                {isO&&<div style={{fontSize:9,color:dark?"#a78bfa":"#16a34a"}}>✓</div>}
              </>
            ):<span style={{fontSize:10,color:"#e2e8f0"}}>—</span>}
          </div>
        );
        ui+=1;
      }
    }
    return cells;
  };

  // ── 居住セル ──────────────────────────────────────────
  const renderResCell=(cell,fi,ui)=>{
    const r=cell.room?ROOMS[cell.room]:null;
    const bubble=bubbles.find(b=>b.fi===fi&&b.ui===ui);
    const isHov=hovered?.fi===fi&&hovered?.ui===ui;
    const isLeg=cell.tenant?.legendary;
    const hasVG=isNight&&owned.has("view")&&fi<=3&&cell.room;
    const isCr=cell.crisis;
    return(
      <div key={ui}
        onClick={()=>!cell.room&&openRoom(fi,ui)}
        onMouseEnter={()=>!cell.room&&setHovered({fi,ui})}
        onMouseLeave={()=>setHovered(null)}
        style={{
          flex:1,height:68,
          background:live&&cell.room?"linear-gradient(135deg,#2d1b69,#4c1d95)":isLeg?"linear-gradient(135deg,#fef9c3,#fde68a)":isCr?"#fff1f2":isNight&&cell.room?"#1e293b":r?r.bg:isHov?"#f1f5f9":"white",
          border:`2px solid ${isCr?"#fca5a5":isLeg?"#fbbf24":hasVG?"#818cf8":r?r.border:isHov?"#94a3b8":"#e2e8f0"}`,
          borderRadius:10,cursor:cell.room?"default":"pointer",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
          position:"relative",transition:"all .2s",overflow:"visible",userSelect:"none",
          boxShadow:live&&cell.room?"0 0 16px rgba(139,92,246,.7)":isLeg?"0 0 10px rgba(251,191,36,.5)":hasVG?"0 0 12px rgba(129,140,248,.6)":isCr?"0 0 8px rgba(239,68,68,.3)":"none",
        }}
      >
        {cell.room?(
          <>
            <div style={{fontSize:22,lineHeight:1}}>{cell.tenant?.emoji}</div>
            <div style={{fontSize:10,fontWeight:700,color:live?"#c084fc":isLeg?"#d97706":isCr?"#ef4444":isNight?"#e2e8f0":r?.tc,marginTop:2}}>
              {isLeg?"⭐ ルナ":r?.label}
              {hasVG&&<span style={{fontSize:9,color:"#818cf8"}}> 🌙</span>}
            </div>
            <div style={{fontSize:9,color:"#94a3b8"}}>{fmt(getRent(cell.room,fi))}/月</div>
            {isCr&&<div style={{fontSize:8,color:"#ef4444",fontWeight:700}}>⚠ 退去検討中</div>}
            {bubble&&(
              <div style={{position:"absolute",bottom:"calc(100% + 5px)",left:"50%",transform:"translateX(-50%)",background:bubble.crisis?"#fff1f2":isLeg?"#fef9c3":live?"#2d1b69":"white",border:`1.5px solid ${bubble.crisis?"#fca5a5":isLeg?"#fbbf24":live?"#7c3aed":"#e2e8f0"}`,borderRadius:10,padding:"5px 10px",fontSize:11,whiteSpace:"nowrap",boxShadow:"0 3px 12px rgba(0,0,0,.12)",zIndex:20,color:bubble.crisis?"#ef4444":live?"#e9d5ff":"#1e293b",animation:"popIn .2s ease"}}>
                {bubble.msg}
              </div>
            )}
          </>
        ):(
          <div style={{fontSize:22,color:isHov?"#94a3b8":"#e2e8f0",fontWeight:300}}>＋</div>
        )}
      </div>
    );
  };

  // 屋上の見た目
  const roofBg=owned.has("pool")&&isNight
    ?"linear-gradient(135deg,#0f172a,#1e1b4b)"
    :owned.has("garden")?(fireworks?"#fef9c3":isNight?"#166534":"#bbf7d0")
    :(isNight?"#1e293b":"#e2e8f0");
  const roofLabel=owned.has("pool")&&isNight?"🏊 ナイトプール営業中":owned.has("garden")?(fireworks?"🎆 花火ナイト！":isNight?"🌿 屋上(夜)":"🌿 屋上"):isNight?"🌙 屋上":"🏠 屋上";
  const roofTxt=owned.has("pool")&&isNight?"#38bdf8":isNight?"#e2e8f0":"#475569";

  return(
    <div style={{fontFamily:"'Segoe UI',sans-serif",background:live?"#1e0a2e":sky.bg,minHeight:"100vh",padding:14,boxSizing:"border-box",transition:"background 3s"}}>

      {notif&&(
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:notif.color,color:"white",padding:"10px 22px",borderRadius:30,fontSize:13,fontWeight:700,zIndex:200,boxShadow:"0 4px 20px rgba(0,0,0,.4)",animation:"popIn .3s ease",whiteSpace:"nowrap"}}>
          {notif.msg}
        </div>
      )}

      {live&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:48}}>
          <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 60%,rgba(124,58,237,.25) 0%,transparent 70%)"}}/>
          {Array(8).fill(null).map((_,i)=>(
            <div key={i} style={{position:"absolute",top:`${20+(i*9)%50}%`,left:`${5+(i*12)%90}%`,fontSize:24,animation:`float ${1.5+(i%3)*.4}s ease-in-out ${i*.2}s infinite alternate`}}>
              {["🎤","✨","🎶","⭐","🎵","💫"][i%6]}
            </div>
          ))}
        </div>
      )}

      {raining&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:50,overflow:"hidden"}}>
          {Array(28).fill(null).map((_,i)=>(
            <div key={i} style={{position:"absolute",top:-20,left:`${(i*3.7)%100}%`,width:1.5,height:18,background:"rgba(147,197,253,.45)",animation:`rain ${.5+(i%5)*.12}s linear ${(i%8)*.25}s infinite`}}/>
          ))}
        </div>
      )}

      {fireworks&&owned.has("garden")&&(
        <div style={{position:"fixed",inset:0,pointerEvents:"none",zIndex:50}}>
          {Array(7).fill(null).map((_,i)=>(
            <div key={i} style={{position:"absolute",top:`${8+(i*12)%45}%`,left:`${10+(i*14)%80}%`,fontSize:38,animation:`burst .9s ease ${i*.28}s both`}}>
              {["🎆","🎇","✨","🎆"][i%4]}
            </div>
          ))}
        </div>
      )}

      {/* ヘッダー */}
      <div style={{background:sky.hdr,borderRadius:14,padding:"12px 16px",marginBottom:12,boxShadow:"0 2px 10px rgba(0,0,0,.1)",display:"flex",gap:16,alignItems:"center",flexWrap:"wrap",transition:"background 3s"}}>
        <div>
          <div style={{fontSize:18,fontWeight:800,color:sky.txt}}>🏢 夢のマンション</div>
          <div style={{fontSize:11,color:"#94a3b8",display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
            <span>{timeLabel(hour)}</span><span>{SL[season]}</span>
            <span style={{color:nextRain<=3?"#60a5fa":"#94a3b8"}}>{weatherLabel}</span>
            {live&&<span style={{color:"#c084fc",fontWeight:700}}>🎤 ライブ中！</span>}
            {paused&&<span style={{color:"#ef4444",fontWeight:700}}>⚡ 停電中</span>}
            {owned.has("pool")&&isNight&&<span style={{color:"#38bdf8",fontWeight:700}}>🏊 ナイトプール営業中</span>}
          </div>
        </div>
        <div style={{flex:1,display:"flex",gap:14,justifyContent:"flex-end",flexWrap:"wrap",alignItems:"center"}}>
          {[["所持金",fmt(money),money<0?"#ef4444":sky.txt],["月収入",fmt(monthlyRent),"#10b981"],["純収入",fmt(netIncome),netIncome>=0?"#10b981":"#ef4444"],[`幸せ度 ${hLabel}`,`${happiness}%`,hColor]].map(([l,v,c])=>(
            <div key={l} style={{textAlign:"center"}}>
              <div style={{fontSize:10,color:"#94a3b8"}}>{l}</div>
              <div style={{fontSize:14,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
          <button onClick={()=>setModal("letters")} style={{position:"relative",background:unread>0?"#fef9c3":(isNight?"#334155":"#f1f5f9"),border:unread>0?"2px solid #fbbf24":"2px solid transparent",borderRadius:10,padding:"6px 10px",cursor:"pointer",fontSize:18}}>
            💌{unread>0&&<span style={{position:"absolute",top:-6,right:-6,background:"#ef4444",color:"white",borderRadius:"50%",width:18,height:18,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:700}}>{unread}</span>}
          </button>
        </div>
      </div>

      {loan&&(
        <div style={{background:"#fef3c7",borderRadius:10,padding:"8px 14px",marginBottom:10,border:"1px solid #fbbf24",display:"flex",justifyContent:"space-between",alignItems:"center",fontSize:12}}>
          <span>💳 ローン返済中 — 残り{loan.ticksLeft}回 ({fmt(loan.remaining)})</span>
          <span style={{color:"#d97706",fontWeight:700}}>毎回 -{fmt(LOAN_REPAY)}</span>
        </div>
      )}

      <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
        <div style={{flex:1,minWidth:0}}>
          <div style={{background:isNight?"#334155":"#cbd5e1",borderRadius:16,padding:10,transition:"background 3s"}}>

            {/* 屋上ラベル */}
            <div style={{background:roofBg,borderRadius:"10px 10px 4px 4px",height:28,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:roofTxt,fontWeight:600,marginBottom:6,transition:"background .5s"}}>
              {roofLabel}
            </div>

            {/* 屋上設備セル */}
            <div style={{display:"flex",gap:5,marginBottom:6,alignItems:"center"}}>
              <div style={{width:28,textAlign:"center",fontSize:10,fontWeight:700,flexShrink:0,color:"#10b981"}}>屋上</div>
              {ROOF_AM.map(am=>renderRoofCell(am))}
              <div style={{flex:1,height:52,background:"#f8fafc",border:"2px dashed #e2e8f0",borderRadius:10,display:"flex",alignItems:"center",justifyContent:"center"}}>
                <span style={{fontSize:10,color:"#e2e8f0"}}>—</span>
              </div>
            </div>

            {/* 増築ボタン */}
            {unlocked<2&&(
              <div onClick={doUnlock} style={{background:money>=UNLOCK_COST?"#f0fdf4":"#f8fafc",border:`2px dashed ${money>=UNLOCK_COST?"#86efac":"#e2e8f0"}`,borderRadius:10,height:42,display:"flex",alignItems:"center",justifyContent:"center",marginBottom:5,cursor:money>=UNLOCK_COST?"pointer":"default",opacity:money>=UNLOCK_COST?1:0.5}}>
                <span style={{fontSize:13}}>🏗</span>
                <span style={{fontSize:10,color:"#16a34a",fontWeight:700,marginLeft:6}}>{unlocked===0?"7F":"8F"}増築 {fmt(UNLOCK_COST)}</span>
              </div>
            )}

            {/* フロア描画 */}
            {visRows.map((fi)=>(
              <div key={fi} style={{display:"flex",gap:5,marginBottom:4,alignItems:"center"}}>
                <div style={{width:28,textAlign:"center",fontSize:10,fontWeight:700,flexShrink:0,color:isBsmt(fi)?"#7c3aed":isAmUp(fi)?"#8b5cf6":"#94a3b8"}}>
                  {FL_LABEL[fi]}
                </div>
                {isAm(fi)
                  ? renderAmFloor(fi)
                  : grid[fi].map((cell,ui)=>renderResCell(cell,fi,ui))
                }
              </div>
            ))}

            {/* マンション属性アイコン */}
            <div style={{background:isNight?"#1e293b":"#e2e8f0",borderRadius:"4px 4px 10px 10px",height:26,display:"flex",alignItems:"center",justifyContent:"center",gap:10,fontSize:13,marginTop:2,transition:"background 3s"}}>
              {GLOBAL_AM.map(a=>(
                <span key={a.id} title={a.label} style={{opacity:owned.has(a.id)?1:0.3}}>{a.icon}</span>
              ))}
            </div>
          </div>

          {/* 幸せ度バー */}
          <div style={{background:isNight?"#1e293b":"white",borderRadius:12,padding:"10px 14px",marginTop:10,boxShadow:"0 2px 8px rgba(0,0,0,.08)",transition:"background 3s"}}>
            <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
              <span style={{fontSize:12,fontWeight:700,color:isNight?"#e2e8f0":"#475569"}}>入居者の幸せ度</span>
              <span style={{fontSize:12,fontWeight:700,color:hColor}}>{happiness}% — {hLabel}</span>
            </div>
            <div style={{background:"#f1f5f9",borderRadius:20,height:10,overflow:"hidden"}}>
              <div style={{height:"100%",width:`${Math.max(0,happiness)}%`,background:live?"linear-gradient(90deg,#7c3aed,#c084fc)":`linear-gradient(90deg,#818cf8,${hColor})`,borderRadius:20,transition:"width .8s ease"}}/>
            </div>
            <div style={{display:"flex",gap:10,marginTop:5,fontSize:10,color:"#94a3b8",flexWrap:"wrap"}}>
              {raining&&owned.has("soundproof")&&<span style={{color:"#60a5fa"}}>☔ +8%</span>}
              {fireworks&&owned.has("garden")&&<span style={{color:"#f59e0b"}}>🎆 +12%</span>}
              {owned.has("pool")&&isNight&&<span style={{color:"#38bdf8"}}>🏊 +10%</span>}
              {live&&<span style={{color:"#c084fc"}}>🎤 +30%</span>}
              {badB<0&&<span style={{color:"#ef4444"}}>⚡ {badB}%</span>}
            </div>
          </div>
        </div>

        {/* サイドパネル */}
        <div style={{width:190,flexShrink:0}}>
          <div style={{background:isNight?"#1e293b":"white",borderRadius:12,padding:12,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,.08)",transition:"background 3s"}}>
            <div style={{fontSize:13,fontWeight:700,color:sky.txt,marginBottom:8}}>📊 物件情報</div>
            {[["入居中",`${occupied}室`],["月収入",fmt(monthlyRent)],["純収入",fmt(netIncome)],["累計収入",fmt(earned)],["設備数",`${owned.size}/${ALL_AM.length}`]].map(([k,v])=>(
              <div key={k} style={{display:"flex",justifyContent:"space-between",fontSize:11,color:"#64748b",marginBottom:4}}>
                <span>{k}</span><span style={{fontWeight:700,color:sky.txt}}>{v}</span>
              </div>
            ))}
          </div>

          {/* マンション属性 */}
          <div style={{background:isNight?"#1e293b":"white",borderRadius:12,padding:12,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
            <div style={{fontSize:12,fontWeight:700,color:sky.txt,marginBottom:8}}>🏢 マンション属性</div>
            {GLOBAL_AM.map(a=>{
              const isO=owned.has(a.id);
              const can=!isO&&money>=a.cost;
              return(
                <div key={a.id} style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8,padding:"8px 10px",background:isO?"#f0fdf4":"#f8fafc",borderRadius:8,border:`1.5px solid ${isO?"#86efac":"#e2e8f0"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                    <span style={{fontSize:16}}>{a.icon}</span>
                    <div>
                      <div style={{fontSize:11,fontWeight:700,color:isO?"#16a34a":sky.txt}}>{a.label}</div>
                      <div style={{fontSize:9,color:"#94a3b8"}}>{a.desc}</div>
                    </div>
                  </div>
                  {isO
                    ?<span style={{fontSize:11,color:"#16a34a",fontWeight:700}}>✓</span>
                    :<button onClick={()=>buyAm(a.id)} disabled={!can} style={{padding:"4px 8px",background:can?"#6366f1":"#e2e8f0",color:can?"white":"#94a3b8",border:"none",borderRadius:6,fontSize:10,cursor:can?"pointer":"not-allowed",fontWeight:700,whiteSpace:"nowrap"}}>{fmt(a.cost)}</button>
                  }
                </div>
              );
            })}
          </div>

          {tenantRank.length>0&&(
            <div style={{background:isNight?"#1e293b":"white",borderRadius:12,padding:12,marginBottom:10,boxShadow:"0 2px 8px rgba(0,0,0,.08)"}}>
              <div style={{fontSize:12,fontWeight:700,color:sky.txt,marginBottom:6}}>🏆 長期入居</div>
              {tenantRank.map((t,i)=>(
                <div key={t.name} style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                  <span style={{fontSize:11,color:["#f59e0b","#94a3b8","#cd7c2f"][i]}}>{["🥇","🥈","🥉"][i]}</span>
                  <span style={{fontSize:12}}>{t.emoji}</span>
                  <span style={{fontSize:10,color:"#64748b",flex:1,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.name.split("・")[1]||t.name}</span>
                  <span style={{fontSize:10,color:"#94a3b8"}}>{t.t}T</span>
                </div>
              ))}
            </div>
          )}

          {hasCrisis&&(
            <div style={{background:"#fff1f2",borderRadius:12,padding:12,marginBottom:10,border:"2px solid #fca5a5"}}>
              <div style={{fontSize:12,fontWeight:700,color:"#ef4444",marginBottom:4}}>⚠ 退去危機</div>
              <div style={{fontSize:10,color:"#b91c1c",marginBottom:8,lineHeight:1.6}}>
                設備が老朽化しています。{owned.has("workshop")&&<span style={{color:"#7c3aed"}}> 設備室で半額！</span>}
              </div>
              <button onClick={doRepair} style={{width:"100%",padding:"8px",background:"#ef4444",color:"white",border:"none",borderRadius:8,fontSize:12,fontWeight:700,cursor:"pointer"}}>
                🔧 修繕 ({fmt(repCost)})
              </button>
            </div>
          )}

          {legendary&&(
            <div style={{background:"#fef9c3",borderRadius:12,padding:12,marginBottom:10,border:"2px solid #fbbf24"}}>
              <div style={{fontSize:12,fontWeight:800,color:"#d97706"}}>⭐ 伝説の入居者</div>
              <div style={{fontSize:10,color:"#92400e",marginTop:4,lineHeight:1.7}}>星凪ルナ。謎多き歌手。永住確定。</div>
              {live&&<div style={{fontSize:11,color:"#7c3aed",fontWeight:700,marginTop:4}}>🎤 現在ライブ中！！</div>}
            </div>
          )}

          {!loan&&(
            <button onClick={takeLoan} style={{width:"100%",padding:10,background:"linear-gradient(135deg,#f59e0b,#d97706)",color:"white",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:"pointer",boxShadow:"0 4px 12px rgba(245,158,11,.3)",marginBottom:8}}>
              💳 銀行ローン {fmt(LOAN_AMT)}
            </button>
          )}
          {unlocked<2&&(
            <button onClick={doUnlock} disabled={money<UNLOCK_COST} style={{width:"100%",padding:10,background:money>=UNLOCK_COST?"linear-gradient(135deg,#10b981,#059669)":"#e2e8f0",color:money>=UNLOCK_COST?"white":"#94a3b8",border:"none",borderRadius:10,fontSize:12,fontWeight:700,cursor:money>=UNLOCK_COST?"pointer":"not-allowed",marginBottom:8}}>
              🏗 {unlocked===0?"7F":"8F"}増築 {fmt(UNLOCK_COST)}
            </button>
          )}

          {!legendary&&(
            <div style={{background:"#fef3c7",borderRadius:10,padding:10,border:"1px solid #fde68a",marginBottom:8}}>
              <div style={{fontSize:11,fontWeight:700,color:"#d97706",marginBottom:3}}>⭐ 噂</div>
              <div style={{fontSize:10,color:"#92400e",lineHeight:1.7}}>防音スタジオと全館防音施工を揃えると…謎の入居者が現れるらしい。</div>
            </div>
          )}

          <div style={{background:"#fffbeb",borderRadius:10,padding:10,border:"1px solid #fde68a"}}>
            <div style={{fontSize:11,fontWeight:700,color:"#d97706",marginBottom:3}}>💡 ヒント</div>
            <div style={{fontSize:10,color:"#92400e",lineHeight:1.7}}>
              屋上設備は屋上行のセルをクリック。ナイトプールは夜間に光る。4F・3F・地下はセルクリックで購入。設備室で修繕半額。
            </div>
          </div>
        </div>
      </div>

      {/* 部屋モーダル */}
      {modal==="room"&&selCell&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:16,padding:22,width:290,boxShadow:"0 10px 40px rgba(0,0,0,.25)"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#1e293b",marginBottom:2}}>部屋タイプを選ぶ</div>
            <div style={{fontSize:11,color:"#94a3b8",marginBottom:14}}>{FL_LABEL[selCell.fi]} · {selCell.ui+1}号室</div>
            {Object.entries(ROOMS).map(([id,r])=>{
              const can=money>=r.cost;
              const rent=getRent(id,selCell.fi);
              const isH=selCell.fi<=3;
              return(
                <button key={id} onClick={()=>buildRoom(id)} disabled={!can} style={{width:"100%",padding:"11px 13px",marginBottom:8,background:can?r.bg:"#f8fafc",border:`2px solid ${can?r.border:"#e2e8f0"}`,borderRadius:10,cursor:can?"pointer":"not-allowed",textAlign:"left",opacity:can?1:0.45}}>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <span style={{fontWeight:800,color:r.tc,fontSize:14}}>{r.label}</span>
                    <span style={{fontSize:11,color:"#64748b"}}>建設 {fmt(r.cost)}</span>
                  </div>
                  <div style={{fontSize:10,color:"#94a3b8",marginTop:2}}>{r.desc}</div>
                  <div style={{fontSize:12,color:"#10b981",fontWeight:700,marginTop:3}}>
                    家賃 {fmt(rent)} / 月
                    {owned.has("view")&&isH&&<span style={{fontSize:10,color:"#818cf8"}}> 夜景込み</span>}
                    {owned.has("trunk")&&<span style={{fontSize:10,color:"#10b981"}}> TR込み</span>}
                  </div>
                </button>
              );
            })}
            <button onClick={()=>setModal(null)} style={{width:"100%",padding:9,background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",color:"#64748b",fontSize:13}}>キャンセル</button>
          </div>
        </div>
      )}

      {/* 手紙モーダル */}
      {modal==="letters"&&(
        <div onClick={()=>setModal(null)} style={{position:"fixed",inset:0,background:"rgba(0,0,0,.5)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:100}}>
          <div onClick={e=>e.stopPropagation()} style={{background:"white",borderRadius:16,padding:22,width:320,maxHeight:"75vh",overflowY:"auto",boxShadow:"0 10px 40px rgba(0,0,0,.25)"}}>
            <div style={{fontSize:15,fontWeight:800,color:"#1e293b",marginBottom:14}}>💌 入居者からのお手紙</div>
            {letters.length===0&&<div style={{textAlign:"center",color:"#94a3b8",fontSize:13,padding:"20px 0"}}>まだ手紙は届いていません</div>}
            {[...letters].reverse().map(l=>(
              <div key={l.id} onClick={()=>setLetters(prev=>prev.map(x=>x.id===l.id?{...x,read:true}:x))} style={{border:`2px solid ${l.read?"#e2e8f0":l.isEvict?"#fca5a5":l.isAnniversary?"#c084fc":"#fbbf24"}`,borderRadius:12,padding:12,marginBottom:10,cursor:"pointer",background:l.read?"white":l.isEvict?"#fff1f2":l.isAnniversary?"#faf5ff":"#fef9c3"}}>
                <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:6}}>
                  <span style={{fontSize:20}}>{l.emoji}</span>
                  <span style={{fontSize:12,fontWeight:700,color:"#1e293b"}}>{l.from}</span>
                  {l.isAnniversary&&<span style={{fontSize:10,color:"#7c3aed",fontWeight:700}}>🎂 記念日</span>}
                  {l.isEvict&&<span style={{fontSize:10,color:"#ef4444",fontWeight:700}}>😢 退去</span>}
                  {!l.read&&<span style={{marginLeft:"auto",fontSize:10,color:"#d97706",fontWeight:700}}>NEW</span>}
                </div>
                <div style={{fontSize:12,color:"#475569",lineHeight:1.7,fontStyle:"italic"}}>「{l.body}」</div>
              </div>
            ))}
            <button onClick={()=>setModal(null)} style={{width:"100%",padding:9,background:"#f1f5f9",border:"none",borderRadius:8,cursor:"pointer",color:"#64748b",fontSize:13,marginTop:4}}>閉じる</button>
          </div>
        </div>
      )}

      <style>{`
        @keyframes popIn{from{opacity:0;transform:translateX(-50%) translateY(6px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}
        @keyframes rain{from{top:-20px;opacity:.7;}to{top:110vh;opacity:.3;}}
        @keyframes burst{0%{opacity:0;transform:scale(.3);}60%{opacity:1;transform:scale(1.4);}100%{opacity:0;transform:scale(1);}}
        @keyframes float{from{transform:translateY(0) rotate(-5deg);}to{transform:translateY(-15px) rotate(5deg);}}
      `}</style>
    </div>
  );
}
