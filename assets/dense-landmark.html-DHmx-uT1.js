import{_ as l,c as r,d as c,e as p,a as n,w as e,r as u,o as d,b as a}from"./app-BnfJPSVp.js";const m={};function k(g,s){const o=u("CodeTabs");return d(),r("div",null,[s[8]||(s[8]=c('<h1 id="dense-facial-landmark-prediction" tabindex="-1"><a class="header-anchor" href="#dense-facial-landmark-prediction"><span>Dense Facial Landmark Prediction</span></a></h1><p>We offer the latest <strong>HyperLandmarkV2</strong>, a high-precision facial landmark detection model optimized for mobile devices. It is designed for seamless integration with AR cameras, beauty filters, and skin analysis applications. On mid-range iOS and Android devices, it achieves an average inference speed of <strong>1ms per frame</strong>, delivering real-time performance without compromising accuracy.</p><p><img src="https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/lmk.jpg" alt="landmark"></p><h2 id="usage" tabindex="-1"><a class="header-anchor" href="#usage"><span>Usage</span></a></h2>',4)),p(o,{id:"12",data:[{id:"python"},{id:"C"},{id:"C++"},{id:"Android"}],"tab-id":"shell"},{title0:e(({value:t,isActive:i})=>s[0]||(s[0]=[a("python")])),title1:e(({value:t,isActive:i})=>s[1]||(s[1]=[a("C")])),title2:e(({value:t,isActive:i})=>s[2]||(s[2]=[a("C++")])),title3:e(({value:t,isActive:i})=>s[3]||(s[3]=[a("Android")])),tab0:e(({value:t,isActive:i})=>s[4]||(s[4]=[n("div",{class:"language-python line-numbers-mode","data-highlighter":"prismjs","data-ext":"py"},[n("pre",null,[n("code",null,[n("span",{class:"line"},[a("faces "),n("span",{class:"token operator"},"="),a(" session"),n("span",{class:"token punctuation"},"."),a("get_face_dense_landmark"),n("span",{class:"token punctuation"},"("),a("image"),n("span",{class:"token punctuation"},")")]),a(`
`),n("span",{class:"line"},[n("span",{class:"token keyword"},"for"),a(" face "),n("span",{class:"token keyword"},"in"),a(" faces"),n("span",{class:"token punctuation"},":")]),a(`
`),n("span",{class:"line"},[a("    landmarks "),n("span",{class:"token operator"},"="),a(" session"),n("span",{class:"token punctuation"},"."),a("face_landmark"),n("span",{class:"token punctuation"},"("),a("face"),n("span",{class:"token punctuation"},")")]),a(`
`),n("span",{class:"line"})])]),n("div",{class:"line-numbers","aria-hidden":"true",style:{"counter-reset":"line-number 0"}},[n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"})])],-1)])),tab1:e(({value:t,isActive:i})=>s[5]||(s[5]=[n("div",{class:"language-c line-numbers-mode","data-highlighter":"prismjs","data-ext":"c"},[n("pre",null,[n("code",null,[n("span",{class:"line"},[a("HInt32 numOfLmk"),n("span",{class:"token punctuation"},";")]),a(`
`),n("span",{class:"line"},[n("span",{class:"token function"},"HFGetNumOfFaceDenseLandmark"),n("span",{class:"token punctuation"},"("),n("span",{class:"token operator"},"&"),a("numOfLmk"),n("span",{class:"token punctuation"},")"),n("span",{class:"token punctuation"},";")]),a(`
`),n("span",{class:"line"},[a("HPoint2f"),n("span",{class:"token operator"},"*"),a(" denseLandmarkPoints "),n("span",{class:"token operator"},"="),a(),n("span",{class:"token punctuation"},"("),a("HPoint2f"),n("span",{class:"token operator"},"*"),n("span",{class:"token punctuation"},")"),n("span",{class:"token function"},"malloc"),n("span",{class:"token punctuation"},"("),n("span",{class:"token keyword"},"sizeof"),n("span",{class:"token punctuation"},"("),a("HPoint2f"),n("span",{class:"token punctuation"},")"),a(),n("span",{class:"token operator"},"*"),a(" numOfLmk"),n("span",{class:"token punctuation"},")"),n("span",{class:"token punctuation"},";")]),a(`
`),n("span",{class:"line"},[n("span",{class:"token function"},"HFGetFaceDenseLandmarkFromFaceToken"),n("span",{class:"token punctuation"},"("),a("multipleFaceData"),n("span",{class:"token punctuation"},"."),a("tokens"),n("span",{class:"token punctuation"},"["),a("index"),n("span",{class:"token punctuation"},"]"),n("span",{class:"token punctuation"},","),a(" denseLandmarkPoints"),n("span",{class:"token punctuation"},","),a(" numOfLmk"),n("span",{class:"token punctuation"},")"),n("span",{class:"token punctuation"},";")]),a(`
`),n("span",{class:"line"})])]),n("div",{class:"line-numbers","aria-hidden":"true",style:{"counter-reset":"line-number 0"}},[n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"}),n("div",{class:"line-number"})])],-1)])),tab2:e(({value:t,isActive:i})=>s[6]||(s[6]=[n("div",{class:"language-cpp line-numbers-mode","data-highlighter":"prismjs","data-ext":"cpp"},[n("pre",null,[n("code",null,[n("span",{class:"line"},[n("span",{class:"token keyword"},"auto"),a(" dense_landmark "),n("span",{class:"token operator"},"="),a(" session"),n("span",{class:"token operator"},"->"),n("span",{class:"token function"},"GetFaceDenseLandmark"),n("span",{class:"token punctuation"},"("),a("result"),n("span",{class:"token punctuation"},")"),n("span",{class:"token punctuation"},";")]),a(`
`),n("span",{class:"line"})])]),n("div",{class:"line-numbers","aria-hidden":"true",style:{"counter-reset":"line-number 0"}},[n("div",{class:"line-number"})])],-1)])),tab3:e(({value:t,isActive:i})=>s[7]||(s[7]=[n("div",{class:"language-java line-numbers-mode","data-highlighter":"prismjs","data-ext":"java"},[n("pre",null,[n("code",null,[n("span",{class:"line"},[n("span",{class:"token class-name"},"Point2f"),n("span",{class:"token punctuation"},"["),n("span",{class:"token punctuation"},"]"),a(" lmk "),n("span",{class:"token operator"},"="),a(),n("span",{class:"token class-name"},[a("InspireFace"),n("span",{class:"token punctuation"},"."),a("GetFaceDenseLandmarkFromFaceToken")]),n("span",{class:"token punctuation"},"("),a("multipleFaceData"),n("span",{class:"token punctuation"},"."),a("tokens"),n("span",{class:"token punctuation"},"["),n("span",{class:"token number"},"0"),n("span",{class:"token punctuation"},"]"),n("span",{class:"token punctuation"},")"),n("span",{class:"token punctuation"},";")]),a(`
`),n("span",{class:"line"})])]),n("div",{class:"line-numbers","aria-hidden":"true",style:{"counter-reset":"line-number 0"}},[n("div",{class:"line-number"})])],-1)])),_:1}),s[9]||(s[9]=n("h2",{id:"landmark-points-order",tabindex:"-1"},[n("a",{class:"header-anchor",href:"#landmark-points-order"},[n("span",null,"Landmark Points Order")])],-1)),s[10]||(s[10]=n("p",null,"We provide a set of dense facial landmarks based on a 106-point standard. The following diagram shows the mapping between landmark indices and their corresponding facial regions.",-1)),s[11]||(s[11]=n("p",null,[n("img",{src:"https://tunm-resource.oss-cn-hongkong.aliyuncs.com/docs/feature/hpylmkv2-order.jpg",alt:"landmark"})],-1))])}const v=l(m,[["render",k]]),b=JSON.parse('{"path":"/guides/dense-landmark.html","title":"Dense Facial Landmark Prediction","lang":"en-US","frontmatter":{},"headers":[{"level":2,"title":"Usage","slug":"usage","link":"#usage","children":[]},{"level":2,"title":"Landmark Points Order","slug":"landmark-points-order","link":"#landmark-points-order","children":[]}],"git":{"updatedTime":1744296882000,"contributors":[{"name":"Jingyu","username":"Jingyu","email":"tunmxy@163.com","commits":1,"url":"https://github.com/Jingyu"}],"changelog":[{"hash":"4e1ab5daddba6a91f0c9e130a9fd26ab3d56aad4","time":1744296882000,"email":"tunmxy@163.com","author":"Jingyu","message":"Update"}]},"filePathRelative":"guides/dense-landmark.md"}');export{v as comp,b as data};
