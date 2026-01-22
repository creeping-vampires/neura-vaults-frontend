import{e as H,p as $,xa as I}from"./chunk-WDVXKZVL.js";import"./chunk-3Q7ZN2UU.js";import"./chunk-CMJYWBFY.js";import"./chunk-DQWLAPQA.js";import{s as T}from"./chunk-JJL2OPIK.js";import"./chunk-WNZGS5LT.js";import"./chunk-QYUUJAZ5.js";import{a as h}from"./chunk-FIV36FCJ.js";import"./chunk-WP7WOITY.js";import"./chunk-XWY35PVV.js";import"./chunk-7CNQZ75Q.js";import"./chunk-JTOX4ZHH.js";import"./chunk-2HQDV73D.js";import"./chunk-B4CNMBFC.js";import"./chunk-ZEEKHJVS.js";import{a as b}from"./chunk-F7UJOH5X.js";import"./chunk-UD6KQFHW.js";import"./chunk-LTFPTLFB.js";import"./chunk-WIQXOFEV.js";import"./chunk-RXXBC6VZ.js";import"./chunk-TMMS6O6S.js";import"./chunk-R4VJOE5O.js";import"./chunk-DZZUCNXT.js";import"./chunk-N4NCIV7V.js";import"./chunk-N3C6FBKY.js";import"./chunk-CTKHELYY.js";import{b as L}from"./chunk-I6BON7SA.js";import"./chunk-YRW45WYY.js";import"./chunk-SNTFI5XR.js";import"./chunk-BMC2QLGD.js";import{m as u}from"./chunk-7677FZEB.js";import{Ma as k,Q as P,Va as C}from"./chunk-KETOQW6E.js";import"./chunk-WVRYN4MY.js";import"./chunk-D42QE4ZV.js";import"./chunk-MGLLPATV.js";import"./chunk-Z3O2IHPJ.js";import"./chunk-UZPTJEFV.js";import"./chunk-247XUEKC.js";import"./chunk-SFIUS6XB.js";import"./chunk-SIWEHH3L.js";import"./chunk-UA65TROS.js";import"./chunk-YJCG6GWC.js";import"./chunk-FO7QPK6E.js";import"./chunk-CZNFNFNK.js";import"./chunk-RWWUDPHX.js";import"./chunk-KUSQMIXV.js";import"./chunk-JPCZ2XYS.js";import"./chunk-ZRKH4SQM.js";import{Aa as y,Ca as d,Ra as B,Ua as t,Z as S,a as E,b as R}from"./chunk-TVPT7M2T.js";import"./chunk-FNC6PQ53.js";import"./chunk-5QQLABHI.js";import{a,g as w,i as v,n as x}from"./chunk-WKJYWAXG.js";v();x();var m=w(E(),1);var e=w(R(),1),A=72,F=52,_=u.ul`
  margin: 0;
  padding: 0;
  height: ${o=>o.fullHeight?410:360}px;
  overflow: auto;
`,V=u.li`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  cursor: pointer;
  background: ${o=>o.isSelected?d.colors.legacy.spotBase:d.colors.legacy.elementBase};
  border-radius: 6px;
  min-height: ${F}px;
  padding: 16px;
  margin-bottom: 10px;
  &:hover {
    background: ${o=>o.isSelected?d.colors.legacy.spotAccent:d.colors.legacy.elementAccent};
  }
`,N=u(V)`
  height: ${A}px;
  padding: 12px;
`,G=a(()=>{let{t:o}=S(),{handleHideModalVisibility:r}=I(),i=(0,m.useCallback)(()=>{r("swapProviders")},[r]),{selectQuote:n}=C(),s=k({selectQuote:n}),f=(0,m.useCallback)(l=>{s.setSelectedProviderIndex(l),i()},[i,s]),c=s.rows.some(P),g=o(c?"swapProvidersTitle":"swapTopQuotesTitle"),p=o("swapProvidersFee");return{...s,hideSwapProvidersModal:i,onClick:f,isBridge:c,title:g,feesLabel:p}},"useSwapProvidersPropsViewProps"),M=a(({isBridge:o})=>(0,e.jsx)(e.Fragment,{children:[...Array(5)].map((r,i)=>(0,e.jsx)(T,{align:"center",width:"100%",height:`${o?A:F}px`,backgroundColor:d.colors.legacy.elementBase,borderRadius:"8px",margin:"0 0 10px 0",padding:"10px"},`swap-provider-row-loader-${i}`))}),"SkeletonListLoader"),Q=m.default.memo(({rows:o,selectedProviderIndex:r,isLoadingProviders:i,title:n,isBridge:s,feesLabel:f,hideSwapProvidersModal:c,onClick:g})=>(0,e.jsxs)(L,{onReset:c,children:[(0,e.jsx)($,{leftButton:{type:"close",onClick:c},children:n}),i?(0,e.jsx)(M,{isBridge:s}):(0,e.jsx)(_,{fullHeight:s,children:o.map((p,l)=>{let D=l===r;return P(p)?(0,e.jsx)(j,{index:l,row:p,onClick:g,feesLabel:f},`bridge-provider-row-${l}`):(0,e.jsx)(W,{index:l,row:p,onClick:g,isSelected:D},`provider-row-${l}`)})})]})),U=a(()=>{let o=G();return(0,e.jsx)(Q,{...o})},"SwapProvidersPage"),ne=U,W=a(({index:o,row:r,isSelected:i,onClick:n})=>(0,e.jsxs)(V,{isSelected:i,onClick:()=>n(o),children:[(0,e.jsx)(t,{font:"label",children:r.name,align:"left",color:i?"areaBase":"white"}),(0,e.jsx)(t,{font:"label",children:r.amount,align:"right",color:i?"areaBase":"textDiminished",className:y({flexShrink:0})})]}),"ProviderRow"),j=a(({index:o,row:r,onClick:i,feesLabel:n})=>(0,e.jsxs)(N,{onClick:()=>i(o),children:[r.logoURI?(0,e.jsx)(b,{flex:0,margin:"0 4px 0 0",children:(0,e.jsx)(B,{src:r.logoURI,width:48,height:48})}):null,(0,e.jsxs)(b,{flex:1,children:[(0,e.jsxs)(h,{justify:"space-between",children:[(0,e.jsx)(t,{children:r.name,font:"labelSemibold",color:"white",align:"left"}),(0,e.jsx)(t,{children:r.amount,font:"labelSemibold",color:"white",align:"right"})]}),(0,e.jsxs)(h,{justify:"space-between",padding:"8px 0 0 0",children:[(0,e.jsx)(t,{children:r.time.text,font:"label",color:r.time.isFast?"textDiminished":"spotNegative"}),(0,e.jsxs)(t,{children:[(0,e.jsx)(H,{color:"textDiminished",font:"label",value:r.feeUsd}),(0,e.jsx)(t,{children:n,color:"textDiminished",font:"label",marginLeft:4})]})]})]})]}),"BridgeProviderRowComponent");export{U as SwapProvidersPage,ne as default};
//# sourceMappingURL=SwapProvidersPage-Q3NKOPM5.js.map
