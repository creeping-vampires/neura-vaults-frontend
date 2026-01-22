import{a as N,c as F,d as G,g as I}from"./chunk-QEG6E3CF.js";import{a as x}from"./chunk-A6OTFH7R.js";import"./chunk-6T2FKPIT.js";import{a as D}from"./chunk-J5P4FLMT.js";import"./chunk-LVD74SBT.js";import"./chunk-OWIXJHCE.js";import"./chunk-35US6LTY.js";import"./chunk-UPA2X3B2.js";import"./chunk-WDVXKZVL.js";import"./chunk-3Q7ZN2UU.js";import"./chunk-CMJYWBFY.js";import"./chunk-DQWLAPQA.js";import"./chunk-JJL2OPIK.js";import"./chunk-WNZGS5LT.js";import"./chunk-QYUUJAZ5.js";import{a as L}from"./chunk-FIV36FCJ.js";import"./chunk-WP7WOITY.js";import"./chunk-XWY35PVV.js";import"./chunk-7CNQZ75Q.js";import"./chunk-JTOX4ZHH.js";import"./chunk-2HQDV73D.js";import"./chunk-B4CNMBFC.js";import"./chunk-ZEEKHJVS.js";import"./chunk-F7UJOH5X.js";import"./chunk-UD6KQFHW.js";import{a as C}from"./chunk-LTFPTLFB.js";import"./chunk-WIQXOFEV.js";import"./chunk-WUF3WNFK.js";import"./chunk-RXXBC6VZ.js";import"./chunk-TMMS6O6S.js";import"./chunk-R4VJOE5O.js";import"./chunk-DZZUCNXT.js";import"./chunk-LWIDGFH6.js";import"./chunk-NJT27E6U.js";import"./chunk-N4NCIV7V.js";import"./chunk-N3C6FBKY.js";import"./chunk-CTKHELYY.js";import"./chunk-I6BON7SA.js";import"./chunk-YRW45WYY.js";import"./chunk-SNTFI5XR.js";import"./chunk-BMC2QLGD.js";import{m as s,v as _}from"./chunk-7677FZEB.js";import{a as y}from"./chunk-VQBOTZZ6.js";import"./chunk-KETOQW6E.js";import"./chunk-WVRYN4MY.js";import"./chunk-D42QE4ZV.js";import"./chunk-MGLLPATV.js";import"./chunk-Z3O2IHPJ.js";import"./chunk-UZPTJEFV.js";import"./chunk-247XUEKC.js";import"./chunk-SFIUS6XB.js";import"./chunk-SIWEHH3L.js";import"./chunk-UA65TROS.js";import"./chunk-YJCG6GWC.js";import{W as E,ha as P,mc as $,sc as O}from"./chunk-FO7QPK6E.js";import"./chunk-CZNFNFNK.js";import"./chunk-RWWUDPHX.js";import"./chunk-KUSQMIXV.js";import"./chunk-JPCZ2XYS.js";import"./chunk-ZRKH4SQM.js";import{Ca as e,Za as R,a as z,b as u,bb as T}from"./chunk-TVPT7M2T.js";import"./chunk-FNC6PQ53.js";import"./chunk-5QQLABHI.js";import{a as g,g as l,i as n,n as i}from"./chunk-WKJYWAXG.js";n();i();var f=l(z(),1);n();i();n();i();var M=s(C)`
  cursor: pointer;
  width: 24px;
  height: 24px;
  transition: background-color 200ms ease;
  background-color: ${t=>t.$isExpanded?e.colors.legacy.black:e.colors.legacy.elementAccent} !important;
  :hover {
    background-color: ${e.colors.legacy.gray};
    svg {
      fill: white;
    }
  }
  svg {
    fill: ${t=>t.$isExpanded?"white":e.colors.legacy.textDiminished};
    transition: fill 200ms ease;
    position: relative;
    ${t=>t.top?`top: ${t.top}px;`:""}
    ${t=>t.right?`right: ${t.right}px;`:""}
  }
`;var o=l(u(),1),K=s(L).attrs({justify:"space-between"})`
  background-color: ${e.colors.legacy.areaBase};
  padding: 10px 16px;
  border-bottom: 1px solid ${e.colors.legacy.borderDiminished};
  height: 46px;
  opacity: ${t=>t.opacity??"1"};
`,Q=s.div`
  display: flex;
  margin-left: 10px;
  > * {
    margin-right: 10px;
  }
`,W=s.div`
  width: 24px;
  height: 24px;
`,X=g(({onBackClick:t,totalSteps:c,currentStepIndex:d,isHidden:m,showBackButtonOnFirstStep:r,showBackButton:S=!0})=>(0,o.jsxs)(K,{opacity:m?0:1,children:[S&&(r||d!==0)?(0,o.jsx)(M,{right:1,onClick:t,children:(0,o.jsx)(_,{})}):(0,o.jsx)(W,{}),(0,o.jsx)(Q,{children:E(c).map(p=>{let h=p<=d?e.colors.legacy.spotBase:e.colors.legacy.elementAccent;return(0,o.jsx)(C,{diameter:12,color:h},p)})}),(0,o.jsx)(W,{})]}),"StepHeader");n();i();var a=l(u(),1),Z=g(()=>{let{mutateAsync:t}=O(),{hardwareStepStack:c,pushStep:d,popStep:m,currentStep:r,setOnConnectHardwareAccounts:S,setOnConnectHardwareDone:b,setExistingAccounts:p}=N(),{data:h=[],isFetched:H,isError:v}=$(),w=P(c,(k,q)=>k?.length===q.length),J=c.length>(w??[]).length,B=w?.length===0,U={initial:{x:B?0:J?150:-150,opacity:B?1:0},animate:{x:0,opacity:1},exit:{opacity:0},transition:{duration:.2}},V=(0,f.useCallback)(()=>{r()?.props.preventBack||(r()?.props.onBackCallback&&r()?.props.onBackCallback?.(),m())},[r,m]);return D(()=>{S(async k=>{await t(k),await y.set(x,!await y.get(x))}),b(()=>self.close()),d((0,a.jsx)(I,{}))},c.length===0),(0,f.useEffect)(()=>{p({data:h,isFetched:H,isError:v})},[h,H,v,p]),(0,a.jsxs)(F,{children:[(0,a.jsx)(X,{totalSteps:3,onBackClick:V,showBackButton:!r()?.props.preventBack,currentStepIndex:c.length-1}),(0,a.jsx)(R,{mode:"wait",children:(0,a.jsx)(T.div,{style:{display:"flex",flexGrow:1},...U,children:(0,a.jsx)(G,{children:r()})},`${c.length}_${w?.length}`)})]})},"SettingsConnectHardware"),Tt=Z;export{Tt as default};
//# sourceMappingURL=SettingsConnectHardware-HFX6CBWW.js.map
