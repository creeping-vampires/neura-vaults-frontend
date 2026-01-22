import{f as C}from"./chunk-WUIWTRCB.js";import{xa as h}from"./chunk-WDVXKZVL.js";import"./chunk-3Q7ZN2UU.js";import"./chunk-CMJYWBFY.js";import"./chunk-DQWLAPQA.js";import"./chunk-JJL2OPIK.js";import"./chunk-WNZGS5LT.js";import"./chunk-QYUUJAZ5.js";import"./chunk-FIV36FCJ.js";import"./chunk-WP7WOITY.js";import"./chunk-XWY35PVV.js";import"./chunk-7CNQZ75Q.js";import"./chunk-JTOX4ZHH.js";import"./chunk-2HQDV73D.js";import"./chunk-B4CNMBFC.js";import"./chunk-ZEEKHJVS.js";import"./chunk-F7UJOH5X.js";import"./chunk-UD6KQFHW.js";import"./chunk-LTFPTLFB.js";import"./chunk-WIQXOFEV.js";import"./chunk-RXXBC6VZ.js";import"./chunk-TMMS6O6S.js";import"./chunk-R4VJOE5O.js";import"./chunk-DZZUCNXT.js";import"./chunk-NJT27E6U.js";import"./chunk-N4NCIV7V.js";import"./chunk-N3C6FBKY.js";import"./chunk-CTKHELYY.js";import"./chunk-I6BON7SA.js";import"./chunk-YRW45WYY.js";import"./chunk-SNTFI5XR.js";import{d as O}from"./chunk-BMC2QLGD.js";import{db as l,fa as x,m as r}from"./chunk-7677FZEB.js";import{P as g,xa as v}from"./chunk-KETOQW6E.js";import"./chunk-WVRYN4MY.js";import"./chunk-D42QE4ZV.js";import{t as w}from"./chunk-MGLLPATV.js";import"./chunk-Z3O2IHPJ.js";import"./chunk-UZPTJEFV.js";import"./chunk-247XUEKC.js";import"./chunk-SFIUS6XB.js";import"./chunk-SIWEHH3L.js";import"./chunk-UA65TROS.js";import"./chunk-YJCG6GWC.js";import"./chunk-FO7QPK6E.js";import"./chunk-CZNFNFNK.js";import"./chunk-RWWUDPHX.js";import"./chunk-KUSQMIXV.js";import"./chunk-JPCZ2XYS.js";import"./chunk-ZRKH4SQM.js";import{A as y,Ca as i,Z as T,a as b,b as S,z as u}from"./chunk-TVPT7M2T.js";import"./chunk-FNC6PQ53.js";import"./chunk-5QQLABHI.js";import{a as t,g as s,i as d,n as f}from"./chunk-WKJYWAXG.js";d();f();var a=s(b(),1);var e=s(S(),1),P=r.div`
  display: flex;
  flex-direction: column;
  justify-content: flex-start;
  align-items: center;
  height: 100%;
  width: 100%;
  overflow-y: scroll;
  padding: 16px;
`,A=r.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-top: -20px;
`,B=r(l).attrs({size:28,weight:500,color:i.colors.legacy.textBase})`
  margin-top: 24px;
`,M=r(l).attrs({size:16,weight:500,color:i.colors.legacy.textDiminished})`
  padding: 0px 5px;
  margin-top: 9px;
  span {
    color: ${i.colors.legacy.textBase};
  }
  label {
    color: ${i.colors.legacy.spotBase};
    cursor: pointer;
  }
`,F=r.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  height: fit-content;
`,L=r.div`
  margin-top: auto;
  width: 100%;
`,_=t(()=>{let{t:n}=T(),{mutateAsync:c}=C(),{handleHideModalVisibility:o,handleShowModalVisibility:m}=h(),k=(0,a.useCallback)(()=>{m("swapConfirmation",void 0,{event:"showSwapModal",payload:{data:{uiContext:g.SwapConfirmation}}}),o("swapTermsOfService")},[m,o]),p=v({goToConfirmation:k});return{onAgreeClick:(0,a.useCallback)(()=>{c(!0),p()},[c,p]),onCancelClick:t(()=>{o("swapTermsOfService")},"onCancelClick"),t:n}},"useSwapTermsOfServiceProps"),R=t(()=>{self.open(u,"_blank")},"handleTermsClick"),V=t(()=>{self.open(y,"_blank")},"handleFeesClick"),E=a.default.memo(({onAgreeClick:n,onCancelClick:c,t:o})=>(0,e.jsxs)(P,{children:[(0,e.jsx)(A,{children:(0,e.jsxs)(F,{children:[(0,e.jsx)(x,{}),(0,e.jsx)(B,{children:o("termsOfServicePrimaryText")}),(0,e.jsx)(M,{children:(0,e.jsxs)(w,{i18nKey:"termsOfServiceDiscliamerFeesEnabledInterpolated",children:["We have revised our Terms of Service. By clicking ",(0,e.jsx)("span",{children:'"I Agree"'})," you agree to our new",(0,e.jsx)("label",{onClick:R,children:"Terms of Service"}),".",(0,e.jsx)("br",{}),(0,e.jsx)("br",{}),"Our new Terms of Service include a new ",(0,e.jsx)("label",{onClick:V,children:"fee structure"})," for certain products."]})})]})}),(0,e.jsx)(L,{children:(0,e.jsx)(O,{primaryText:o("termsOfServiceActionButtonAgree"),secondaryText:o("commandCancel"),onPrimaryClicked:n,onSecondaryClicked:c})})]})),H=t(()=>{let n=_();return(0,e.jsx)(E,{...n})},"SwapTermsOfServicePage"),Z=H;export{H as SwapTermsOfServicePage,Z as default};
//# sourceMappingURL=SwapTermsOfServicePage-KWK5TUQQ.js.map
