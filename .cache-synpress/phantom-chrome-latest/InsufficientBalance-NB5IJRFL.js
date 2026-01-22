import{a as f,c as m}from"./chunk-L7DCCNPW.js";import{a as k}from"./chunk-6T2FKPIT.js";import"./chunk-FLHAGMIA.js";import{H as w,xa as F}from"./chunk-WDVXKZVL.js";import"./chunk-3Q7ZN2UU.js";import"./chunk-CMJYWBFY.js";import"./chunk-DQWLAPQA.js";import"./chunk-JJL2OPIK.js";import"./chunk-WNZGS5LT.js";import"./chunk-QYUUJAZ5.js";import"./chunk-FIV36FCJ.js";import"./chunk-WP7WOITY.js";import"./chunk-XWY35PVV.js";import"./chunk-7CNQZ75Q.js";import"./chunk-JTOX4ZHH.js";import"./chunk-2HQDV73D.js";import"./chunk-B4CNMBFC.js";import"./chunk-ZEEKHJVS.js";import"./chunk-F7UJOH5X.js";import"./chunk-UD6KQFHW.js";import"./chunk-LTFPTLFB.js";import"./chunk-WIQXOFEV.js";import"./chunk-RXXBC6VZ.js";import"./chunk-TMMS6O6S.js";import"./chunk-R4VJOE5O.js";import"./chunk-DZZUCNXT.js";import"./chunk-N4NCIV7V.js";import"./chunk-N3C6FBKY.js";import"./chunk-CTKHELYY.js";import"./chunk-I6BON7SA.js";import"./chunk-YRW45WYY.js";import"./chunk-SNTFI5XR.js";import{c as T,d as b}from"./chunk-BMC2QLGD.js";import{db as s,m as o}from"./chunk-7677FZEB.js";import"./chunk-KETOQW6E.js";import"./chunk-WVRYN4MY.js";import"./chunk-D42QE4ZV.js";import"./chunk-MGLLPATV.js";import"./chunk-Z3O2IHPJ.js";import"./chunk-UZPTJEFV.js";import"./chunk-247XUEKC.js";import"./chunk-SFIUS6XB.js";import"./chunk-SIWEHH3L.js";import"./chunk-UA65TROS.js";import"./chunk-YJCG6GWC.js";import"./chunk-FO7QPK6E.js";import"./chunk-CZNFNFNK.js";import"./chunk-RWWUDPHX.js";import"./chunk-KUSQMIXV.js";import{Vb as l,ac as B,pc as h}from"./chunk-JPCZ2XYS.js";import"./chunk-ZRKH4SQM.js";import{Ca as a,Na as I,Z as C,a as P,b as x}from"./chunk-TVPT7M2T.js";import"./chunk-FNC6PQ53.js";import"./chunk-5QQLABHI.js";import{a as d,g as r,i as y,n as g}from"./chunk-WKJYWAXG.js";y();g();var v=r(P(),1);var e=r(x(),1),N=o.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  overflow-y: scroll;
`,S=o.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: 90px;
`,V=o(s).attrs({size:28,weight:500,color:a.colors.legacy.textBase})`
  margin: 16px;
`,$=o(s).attrs({size:14,weight:400,lineHeight:17,color:a.colors.legacy.textDiminished})`
  max-width: 275px;

  span {
    color: white;
  }
`,q=d(({networkId:t,token:c})=>{let{t:n}=C(),{handleHideModalVisibility:p}=F(),u=(0,v.useCallback)(()=>{p("insufficientBalance")},[p]),R=t&&B(h(l.getChainID(t))),{canBuy:D,openBuy:M}=w({caip19:R||"",context:"modal",analyticsEvent:"fiatOnrampFromInsufficientBalance"}),i=t?l.getTokenSymbol(t):n("tokens");return(0,e.jsxs)(N,{children:[(0,e.jsx)("div",{children:(0,e.jsxs)(S,{children:[(0,e.jsx)(k,{type:"failure",backgroundWidth:75}),(0,e.jsx)(V,{children:n("insufficientBalancePrimaryText",{tokenSymbol:i})}),(0,e.jsx)($,{children:n("insufficientBalanceSecondaryText",{tokenSymbol:i})}),c?(0,e.jsxs)(I,{borderRadius:8,gap:1,marginTop:32,width:"100%",children:[(0,e.jsx)(f,{label:n("insufficientBalanceRemaining"),children:(0,e.jsx)(m,{color:a.colors.legacy.spotNegative,children:`${c.balance} ${i}`})}),(0,e.jsx)(f,{label:n("insufficientBalanceRequired"),children:(0,e.jsx)(m,{children:`${c.required} ${i}`})})]}):null]})}),D?(0,e.jsx)(b,{primaryText:n("buyAssetInterpolated",{tokenSymbol:i}),onPrimaryClicked:M,secondaryText:n("commandCancel"),onSecondaryClicked:u}):(0,e.jsx)(T,{onClick:u,children:n("commandCancel")})]})},"InsufficientBalance"),X=q;export{q as InsufficientBalance,X as default};
//# sourceMappingURL=InsufficientBalance-NB5IJRFL.js.map
