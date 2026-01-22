import{a as X}from"./chunk-623RQPSS.js";import{a as F}from"./chunk-IAP4IYBJ.js";import{a as q}from"./chunk-QYJ245UX.js";import{a as $}from"./chunk-MFCWBNZZ.js";import{b as K}from"./chunk-5CDKMLAE.js";import{b as Z}from"./chunk-XU7VBKPH.js";import{xa as J}from"./chunk-WDVXKZVL.js";import{k as U}from"./chunk-3Q7ZN2UU.js";import"./chunk-CMJYWBFY.js";import"./chunk-DQWLAPQA.js";import"./chunk-JJL2OPIK.js";import"./chunk-WNZGS5LT.js";import"./chunk-QYUUJAZ5.js";import{a as M}from"./chunk-FIV36FCJ.js";import"./chunk-WP7WOITY.js";import"./chunk-XWY35PVV.js";import"./chunk-7CNQZ75Q.js";import"./chunk-JTOX4ZHH.js";import"./chunk-2HQDV73D.js";import{g as G}from"./chunk-B4CNMBFC.js";import"./chunk-ZEEKHJVS.js";import{a as Q}from"./chunk-F7UJOH5X.js";import"./chunk-UD6KQFHW.js";import"./chunk-LTFPTLFB.js";import{a as B}from"./chunk-WIQXOFEV.js";import"./chunk-RXXBC6VZ.js";import"./chunk-I6XL36PI.js";import"./chunk-TMMS6O6S.js";import"./chunk-R4VJOE5O.js";import"./chunk-DZZUCNXT.js";import"./chunk-N4NCIV7V.js";import"./chunk-N3C6FBKY.js";import"./chunk-CTKHELYY.js";import"./chunk-I6BON7SA.js";import"./chunk-YRW45WYY.js";import"./chunk-SNTFI5XR.js";import{c as O}from"./chunk-BMC2QLGD.js";import{C as V,db as R,m as a}from"./chunk-7677FZEB.js";import{T as A,X as _,Z as N,_ as z,p as E}from"./chunk-XOFIVAID.js";import"./chunk-KETOQW6E.js";import"./chunk-WVRYN4MY.js";import"./chunk-D42QE4ZV.js";import"./chunk-MGLLPATV.js";import"./chunk-Z3O2IHPJ.js";import"./chunk-UZPTJEFV.js";import"./chunk-247XUEKC.js";import"./chunk-SFIUS6XB.js";import"./chunk-SIWEHH3L.js";import"./chunk-UA65TROS.js";import"./chunk-YJCG6GWC.js";import{wc as L}from"./chunk-FO7QPK6E.js";import"./chunk-CZNFNFNK.js";import"./chunk-RWWUDPHX.js";import"./chunk-KUSQMIXV.js";import{Td as v}from"./chunk-JPCZ2XYS.js";import"./chunk-ZRKH4SQM.js";import{Aa as k,Bb as P,Ca as y,Hb as D,Z as h,a as W,b as w}from"./chunk-TVPT7M2T.js";import"./chunk-FNC6PQ53.js";import"./chunk-5QQLABHI.js";import{a as f,g as p,i as C,n as b}from"./chunk-WKJYWAXG.js";C();b();var n=p(W(),1);C();b();var Y=p(W(),1);var o=p(w(),1),et=k({marginLeft:4}),ot=a(M).attrs({align:"center",padding:"10px"})`
  background-color: ${y.colors.legacy.elementBase};
  border-radius: 6px;
  height: 74px;
  margin: 4px 0;
`,it=a.div`
  display: flex;
  align-items: center;
`,nt=a(Q)`
  flex: 1;
  min-width: 0;
  text-align: left;
  align-items: normal;
`,lt=a(R).attrs({size:16,weight:600,lineHeight:19,noWrap:!0,maxWidth:"175px",textAlign:"left"})``,st=a(R).attrs({color:y.colors.legacy.textDiminished,size:14,lineHeight:17,noWrap:!0})`
  text-align: left;
  margin-top: 5px;
`,at=a.div`
  width: 55px;
  min-width: 55px;
  max-width: 55px;
  height: 55px;
  min-height: 55px;
  max-height: 55px;
  aspect-ratio: 1;
  margin-right: 10px;
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
`,j=Y.default.memo(t=>{let{t:l}=h(),{collection:i,unknownItem:c,isHidden:r,isSpam:m,onToggleHidden:g}=t,{name:d,id:u}=i,s=N(i),S=s?.chainData,x=z(i),I=_(s?.media,"image",!1,"small"),T=d||s?.name||c;return(0,o.jsxs)(ot,{children:[(0,o.jsx)(at,{children:m&&r?(0,o.jsx)(X,{width:32}):I?(0,o.jsx)(K,{uri:I}):E(S)?(0,o.jsx)(q,{...S.utxoDetails}):(0,o.jsx)(Z,{type:"image",width:42})}),(0,o.jsx)(M,{children:(0,o.jsxs)(nt,{children:[(0,o.jsxs)(it,{children:[(0,o.jsx)(lt,{children:T}),m?(0,o.jsx)(V,{className:et,fill:y.colors.legacy.spotWarning,height:16,width:16}):null]}),(0,o.jsx)(st,{children:l("collectiblesSearchNrOfItems",{nrOfItems:x})})]})}),(0,o.jsx)(F,{id:u,label:`${d} visible`,checked:!r,onChange:H=>{g(H.target.checked?"show":"hide")}})]})});var e=p(w(),1),rt=74,mt=10,ct=rt+mt,dt=20,pt=a.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
`,gt=a.div`
  position: relative;
  width: 100%;
`,ht=f(()=>{let{handleHideModalVisibility:t}=J(),{data:l,isPending:i}=L(),{viewState:c,viewStateLoading:r}=A({account:l}),m=(0,n.useCallback)(()=>t("collectiblesVisibility"),[t]),g=(0,n.useMemo)(()=>({...c,handleCloseModal:m}),[m,c]),d=(0,n.useMemo)(()=>i||r,[i,r]);return{data:g,loading:d}},"useProps"),ut=n.default.memo(t=>{let{t:l}=h(),i=(0,n.useRef)(null);return(0,n.useEffect)(()=>{setTimeout(()=>i.current?.focus(),200)},[]),(0,e.jsxs)(e.Fragment,{children:[(0,e.jsx)(gt,{children:(0,e.jsx)(G,{ref:i,tabIndex:0,placeholder:l("assetListSearch"),maxLength:v,onChange:t.handleSearch,value:t.searchQuery,name:"Search collectibles"})}),(0,e.jsx)(U,{children:(0,e.jsx)(P,{children:({height:c,width:r})=>(0,e.jsx)(D,{style:{padding:`${dt}px 0`},scrollToIndex:t.searchQuery!==t.debouncedSearchQuery?0:void 0,height:c,width:r,rowCount:t.listItems.length,rowHeight:ct,rowRenderer:m=>(0,e.jsx)(St,{...m,data:t.listItems,unknownItem:l("assetListUnknownToken"),getIsHidden:t.getIsHidden,getIsSpam:t.getIsSpam,getSpamStatus:t.getSpamStatus,onToggleHidden:t.onToggleHidden})})})})]})}),St=f(t=>{let{index:l,data:i,style:c,unknownItem:r,getIsHidden:m,getIsSpam:g,getSpamStatus:d,onToggleHidden:u}=t,s=i[l],S=m(s),x=g(s),I=d(s),T=(0,n.useCallback)(H=>u({item:s,status:H}),[u,s]);return(0,e.jsx)("div",{style:c,children:(0,e.jsx)(j,{collection:s,unknownItem:r,isHidden:S,isSpam:x,spamStatus:I,onToggleHidden:T})})},"ResultRowWrapper"),It=f(()=>{let{data:t,loading:l}=ht(),{t:i}=h();return(0,e.jsxs)(pt,{children:[l?(0,e.jsx)($,{}):(0,e.jsx)(ut,{...t}),(0,e.jsx)(B,{children:(0,e.jsx)(O,{onClick:t.handleCloseModal,children:i("commandClose")})})]})},"CollectiblesVisibilityPage"),Kt=It;export{It as CollectiblesVisibilityPage,Kt as default};
//# sourceMappingURL=CollectiblesVisibilityPage-NXJBQWMN.js.map
